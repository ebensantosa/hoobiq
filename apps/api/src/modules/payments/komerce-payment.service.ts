import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { env } from "../../config/env";

const PAYMENT_BASE = "https://payment.komerce.id/api/v1";
const QRISLY_BASE  = "https://qrisly.komerce.id/api/v1";

export type ChargeMethod = "va" | "ewallet" | "qris";

export type ChargeRequest = {
  orderId: string;
  humanId: string;
  amountCents: bigint;
  method: ChargeMethod;
  // For VA / ewallet: which provider (e.g. "bca", "ovo"). Optional for qris.
  channel?: string;
  customer: { email: string; name: string; phone: string };
  /** Webhook callback URL — Komerce will POST status updates here. */
  notifyUrl: string;
};

export type ChargeResponse = {
  /** Komerce-side charge id (used for reconciliation). */
  externalId: string;
  /** Where to redirect the buyer / display QR. */
  redirectUrl?: string;
  qrString?: string;     // raw QRIS payload for QRISLY charges
  qrImageUrl?: string;   // pre-rendered QR image
  expiresAt: string;
};

/**
 * Komerce Payment + QRISLY wrapper. Two separate Komerce products with
 * distinct API keys + base URLs but a similar shape:
 *   - Payment API: VA + e-wallet flows. Returns a redirectUrl.
 *   - QRISLY API: QRIS-only static + dynamic QR. Returns qrString / qrImageUrl.
 *
 * Auth: header `key: <API_KEY>` for both, mirroring the shipping module.
 *
 * If the relevant key is missing, callers get a 503 — checkout can then
 * fall back to Midtrans (existing path) without crashing.
 *
 * NOTE: Endpoint payload shapes below are the documented Komerce contract
 * as of build time; if Komerce rolls a v2, swap the path/body and leave
 * the public method signatures intact.
 */
@Injectable()
export class KomercePaymentService {
  private readonly log = new Logger(KomercePaymentService.name);

  isConfigured(method: ChargeMethod): boolean {
    if (method === "qris") return !!env.KOMERCE_QRISLY_API_KEY;
    return !!env.KOMERCE_PAYMENT_API_KEY;
  }

  async createCharge(req: ChargeRequest): Promise<ChargeResponse> {
    const isQris = req.method === "qris";
    const key = isQris ? env.KOMERCE_QRISLY_API_KEY : env.KOMERCE_PAYMENT_API_KEY;
    if (!key) {
      throw new ServiceUnavailableException({
        code: "payment_not_configured",
        message: isQris
          ? "QRIS belum dikonfigurasi. Hubungi admin."
          : "Pembayaran belum dikonfigurasi. Hubungi admin.",
      });
    }
    const base = isQris ? QRISLY_BASE : PAYMENT_BASE;
    const path = isQris ? "/charges" : "/charges";

    const body = JSON.stringify({
      external_id: req.humanId,
      amount: Number(req.amountCents / 100n),
      method: req.method,
      ...(req.channel ? { channel: req.channel } : {}),
      customer: { email: req.customer.email, name: req.customer.name, phone: req.customer.phone },
      callback_url: req.notifyUrl,
    });

    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { key, "Content-Type": "application/json" },
      body,
    });
    const text = await res.text();
    if (!res.ok) {
      this.log.warn(`Komerce ${isQris ? "qrisly" : "payment"} ${res.status}: ${text.slice(0, 240)}`);
      let msg = `Komerce HTTP ${res.status}`;
      try {
        const j = JSON.parse(text);
        if (j?.meta?.message) msg += ` — ${j.meta.message}`;
        else if (j?.message)  msg += ` — ${j.message}`;
      } catch { /* not json */ }
      throw new BadRequestException({
        code: "payment_upstream_error",
        message: `Pembayaran bermasalah: ${msg}`,
      });
    }

    let json: { data?: { id?: string; redirect_url?: string; qr_string?: string; qr_image_url?: string; expires_at?: string } };
    try {
      json = JSON.parse(text);
    } catch {
      throw new BadRequestException({
        code: "payment_bad_response",
        message: "Pembayaran balas response tidak valid.",
      });
    }
    const d = json.data ?? {};
    return {
      externalId: d.id ?? req.humanId,
      redirectUrl: d.redirect_url,
      qrString: d.qr_string,
      qrImageUrl: d.qr_image_url,
      expiresAt: d.expires_at ?? new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    };
  }

  /**
   * Verify a webhook payload's HMAC signature against KOMERCE_WEBHOOK_SECRET.
   * Komerce signs with HMAC-SHA256 over the raw body and sends it as
   * `x-komerce-signature`. Compare in constant time.
   */
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    const secret = env.KOMERCE_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    // Lazy require so we don't pull node:crypto at module load if unused.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("node:crypto") as typeof import("node:crypto");
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}
