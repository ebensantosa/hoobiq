import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { env } from "../../config/env";

// Both base URLs come from env (with sensible defaults); flip from sandbox
// to prod by overriding KOMERCE_PAYMENT_BASE_URL / KOMERCE_QRISLY_BASE_URL.

export type ChargeMethod = "va" | "ewallet" | "qris";

export type ChargeItem = {
  name: string;
  quantity: number;
  priceIdr: number; // rupiah, integer
};

export type ChargeRequest = {
  orderId: string;
  humanId: string;
  /** Total amount in rupiah (integer). Komerce min is 10,000. */
  amountIdr: number;
  method: ChargeMethod;
  /** For VA: bank code ("bca", "bni", ...). For ewallet: provider ("ovo", "dana", ...). Ignored for qris. */
  channel?: string;
  customer: { email: string; name: string; phone: string };
  /** Webhook callback URL — Komerce POSTs status updates here. */
  notifyUrl: string;
  /** Required when notifyUrl is set — Komerce includes this back in webhooks so we can authenticate them. */
  callbackKey: string;
  /** Browser return URL — Komerce hosted Payment Page bounces the buyer
   * here once status flips to "paid". Without this the buyer is stuck on
   * pay-sandbox.komerce.my.id with no way back to /pesanan. */
  returnUrl?: string;
  items: ChargeItem[];
};

export type ChargeResponse = {
  /** Komerce-side charge id used for reconciliation. */
  externalId: string;
  /** Where to redirect the buyer (Payment Page) or display QR. */
  redirectUrl?: string;
  qrString?: string;
  qrImageUrl?: string;
  expiresAt: string;
};

/**
 * Komerce Payment + QRISLY wrapper. Speaks the public Komerce v1 contract:
 *   POST {base}/user/payment/create
 *   header: x-api-key
 *   body:   { order_id, payment_type, channel_code, amount, customer,
 *             items, expiry_duration, callback_url, callback_api_key }
 *
 * For QRIS we use the same endpoint with payment_type="qris" — Komerce
 * treats QRIS as one of several payment types under the same account.
 * If your dashboard exposes a separate QRISLY base URL, override
 * KOMERCE_QRISLY_BASE_URL.
 *
 * Reference: https://rajaongkir.com/docs/payment-api
 */
@Injectable()
export class KomercePaymentService {
  private readonly log = new Logger(KomercePaymentService.name);

  isConfigured(method: ChargeMethod): boolean {
    if (method === "qris") return !!env.KOMERCE_QRISLY_API_KEY;
    return !!env.KOMERCE_PAYMENT_API_KEY;
  }

  /**
   * Fetch the merchant's enabled payment methods from Komerce. Cached at
   * the controller layer so we don't hit Komerce on every checkout render.
   */
  async listMethods(): Promise<Array<{
    paymentType: string; bankCode: string; displayName: string; logoUrl: string;
    minAmount: number; maxAmount: number;
  }>> {
    const key = env.KOMERCE_PAYMENT_API_KEY;
    if (!key) {
      throw new ServiceUnavailableException({
        code: "payment_not_configured",
        message: "Pembayaran belum dikonfigurasi.",
      });
    }
    const base = env.KOMERCE_PAYMENT_BASE_URL.replace(/\/$/, "");
    let res: Response;
    let text: string;
    try {
      res = await fetch(`${base}/user/methods`, { headers: { "x-api-key": key } });
      text = await res.text();
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      throw new BadRequestException({
        code: "payment_network_error",
        message: `Tidak bisa hubungi Komerce (${reason}).`,
      });
    }
    if (!res.ok) {
      throw new BadRequestException({
        code: "payment_upstream_error",
        message: `Komerce HTTP ${res.status}: ${text.slice(0, 200)}`,
      });
    }
    const json = JSON.parse(text) as {
      data?: Array<{
        payment_type: string; display_name: string; bank_code: string;
        logo_url: string; min_amount: number; max_amount: number;
      }>;
    };
    return (json.data ?? []).map((m) => ({
      paymentType: m.payment_type,
      bankCode:    m.bank_code,
      displayName: m.display_name,
      logoUrl:     m.logo_url,
      minAmount:   m.min_amount,
      maxAmount:   m.max_amount,
    }));
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
    const base = (isQris ? env.KOMERCE_QRISLY_BASE_URL : env.KOMERCE_PAYMENT_BASE_URL).replace(/\/$/, "");
    const path = "/user/payment/create";

    // Komerce uses TWO different vocabularies:
    //   GET /user/methods returns category buckets: "va" / "ewallet" / "qris".
    //   POST /user/payment/create wants the parent payment_type, which for
    //   VA is "bank_transfer". This mismatch is documented at rajaongkir.com.
    const payment_type =
      req.method === "va"      ? "bank_transfer" :
      req.method === "ewallet" ? "ewallet" :
                                 "qris";

    // bank_code in /methods is UPPERCASE (BCA, BNI, MANDIRI). Komerce is
    // case-sensitive on channel_code → upper-case defensively.
    const channelCode = req.channel?.toUpperCase();

    const body = JSON.stringify({
      order_id: req.humanId,
      payment_type,
      ...(channelCode ? { channel_code: channelCode } : {}),
      amount: Math.max(10_000, Math.round(req.amountIdr)),  // Komerce min 10k
      customer: { name: req.customer.name, email: req.customer.email, phone: req.customer.phone },
      items: req.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.priceIdr })),
      expiry_duration: 24 * 3600,                            // 24h to pay (matches our auto-cancel window)
      callback_url: req.notifyUrl,
      // Per official Komerce sandbox curl example the field is lowercase
      // `callback_api_key`. An older docs page used `callback_API_KEY`,
      // so we send both to be safe — Komerce ignores unknown fields.
      callback_api_key: req.callbackKey,
      callback_API_KEY: req.callbackKey,
      // Browser-side bounce after a successful payment. The current
      // Komerce Payment API spec doesn't formally document a return_url
      // field, but we send it anyway — Komerce ignores unknown fields, so
      // there's zero downside and if/when they enable it the auto-redirect
      // to /pesanan/:id starts working without a code change. Until then
      // the wait page's PaymentStatusPoller drives the redirect via
      // /payments/komerce/reconcile.
      ...(req.returnUrl ? { return_url: req.returnUrl } : {}),
    });

    let res: Response;
    let text: string;
    try {
      res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "x-api-key": key, "Content-Type": "application/json" },
        body,
      });
      text = await res.text();
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      this.log.error(`Komerce ${isQris ? "qrisly" : "payment"} fetch failed → ${base}${path}: ${reason}`);
      throw new BadRequestException({
        code: "payment_network_error",
        message: `Tidak bisa hubungi Komerce (${reason}). Cek koneksi/endpoint.`,
      });
    }
    if (!res.ok) {
      this.log.warn(`Komerce ${isQris ? "qrisly" : "payment"} ${res.status}: ${text.slice(0, 320)}`);
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

    // Komerce response shape (per docs):
    //   { meta: {...}, data: { payment_id, payment_url, qr_string, qr_image_url, expired_at, ... } }
    // Field names vary across product types — we read every variant we've
    // seen and log the raw response on the first call so misnamed fields
    // are obvious in pm2 logs (we kept losing payment_id silently before).
    let json: {
      data?: Record<string, unknown>;
    };
    try {
      json = JSON.parse(text);
    } catch {
      throw new BadRequestException({
        code: "payment_bad_response",
        message: "Pembayaran balas response tidak valid.",
      });
    }
    const d = (json.data ?? {}) as Record<string, unknown>;
    const externalId = String(
      d.payment_id ?? d.id ?? d.transaction_id ?? d.invoice_id ?? d.order_id ?? req.humanId,
    );
    const redirectUrl = String(d.payment_url ?? d.redirect_url ?? d.url ?? "") || undefined;
    const qrString = d.qr_string ? String(d.qr_string) : undefined;
    const qrImageUrl = d.qr_image_url ? String(d.qr_image_url) : undefined;
    const expiresAt = String(
      d.expired_at ?? d.expires_at ?? new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    );

    // Helps us see why reconcile fails in production: if externalId fell
    // back to humanId, the dashboard payment_id will mismatch and status
    // lookups will 404. Log keys + first 240 chars so we can spot the
    // real field name without leaking the whole payload.
    this.log.log(
      `Komerce createCharge OK; data keys=[${Object.keys(d).join(",")}] externalId=${externalId}`,
    );

    return { externalId, redirectUrl, qrString, qrImageUrl, expiresAt };
  }

  /**
   * Poll Komerce for charge status. Used as a fallback if the webhook
   * doesn't arrive (network blip, dev environment without public callback).
   * Returns the raw status string (e.g. "paid", "expired", "pending").
   */
  async getStatus(paymentId: string): Promise<{ status: string; raw: unknown }> {
    const key = env.KOMERCE_PAYMENT_API_KEY;
    if (!key) throw new ServiceUnavailableException({ code: "payment_not_configured", message: "Pembayaran belum dikonfigurasi." });
    const base = env.KOMERCE_PAYMENT_BASE_URL.replace(/\/$/, "");
    const url = `${base}/user/payment/status/${encodeURIComponent(paymentId)}`;
    const res = await fetch(url, { headers: { "x-api-key": key } });
    const text = await res.text();
    if (!res.ok) {
      // 404 here usually means we stored a wrong payment_id (e.g. humanId
      // fallback instead of Komerce's KPAY-...). Log it so the cause is
      // obvious — the reconcile flow swallows BadRequest silently.
      this.log.warn(
        `Komerce getStatus(${paymentId}) HTTP ${res.status}: ${text.slice(0, 200)}`,
      );
      throw new BadRequestException({
        code: "payment_upstream_error",
        message: `Komerce HTTP ${res.status}: ${text.slice(0, 200)}`,
      });
    }
    const json = JSON.parse(text) as { data?: Record<string, unknown> };
    const d = json.data ?? {};
    const status = String(
      d.status ?? d.payment_status ?? d.transaction_status ?? "unknown",
    ).toLowerCase();
    this.log.log(
      `Komerce getStatus(${paymentId}) → ${status}; keys=[${Object.keys(d).join(",")}]`,
    );
    return { status, raw: d };
  }

  /** Cancel a pending charge. Useful when the buyer abandons checkout. */
  async cancel(paymentId: string, reason: string): Promise<void> {
    const key = env.KOMERCE_PAYMENT_API_KEY;
    if (!key) throw new ServiceUnavailableException({ code: "payment_not_configured", message: "Pembayaran belum dikonfigurasi." });
    const base = env.KOMERCE_PAYMENT_BASE_URL.replace(/\/$/, "");
    const res = await fetch(`${base}/user/payment/cancel`, {
      method: "POST",
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ payment_id: paymentId, reason }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException({
        code: "payment_upstream_error",
        message: `Komerce cancel HTTP ${res.status}: ${text.slice(0, 200)}`,
      });
    }
  }

  /**
   * Verify a webhook payload using the callback_api_key we sent during
   * createCharge. Komerce echoes that key back so we can authenticate.
   * If you've also configured KOMERCE_WEBHOOK_SECRET (HMAC), use the
   * signature path instead of the key match.
   */
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    const secret = env.KOMERCE_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("node:crypto") as typeof import("node:crypto");
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}
