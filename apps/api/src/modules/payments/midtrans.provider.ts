import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import crypto from "node:crypto";
import type { ChargeInput, ChargeResult, PaymentProvider } from "./payment-provider.interface";
import { env } from "../../config/env";

/**
 * Midtrans Snap real integration.
 *
 * Endpoints:
 *   - Snap charge: POST {SNAP_BASE}/snap/v1/transactions
 *   - Status check: GET {API_BASE}/v2/{order_id}/status
 *   - Refund:      POST {API_BASE}/v2/{order_id}/refund
 *
 * Auth: HTTP Basic with `${MIDTRANS_SERVER_KEY}:` (note trailing colon).
 *
 * Sandbox vs production is selected via `MIDTRANS_ENV` env var
 * ("sandbox" | "production"). Default is sandbox so a misconfigured
 * staging won't accidentally hit live Midtrans.
 */
@Injectable()
export class MidtransProvider implements PaymentProvider {
  private readonly log = new Logger(MidtransProvider.name);

  private get isProd(): boolean {
    return env.MIDTRANS_ENV === "production";
  }
  private get snapBase(): string {
    return this.isProd
      ? "https://app.midtrans.com/snap/v1"
      : "https://app.sandbox.midtrans.com/snap/v1";
  }
  private get apiBase(): string {
    return this.isProd
      ? "https://api.midtrans.com/v2"
      : "https://api.sandbox.midtrans.com/v2";
  }
  private get authHeader(): string {
    if (!env.MIDTRANS_SERVER_KEY) {
      throw new ServiceUnavailableException({
        code: "payment_not_configured",
        message: "Midtrans belum dikonfigurasi.",
      });
    }
    // Basic auth: base64("<SERVER_KEY>:") — Midtrans expects empty
    // password after the colon, the colon itself is required.
    return "Basic " + Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString("base64");
  }

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    const grossAmount = Number(input.amountCents / 100n);
    if (grossAmount <= 0) {
      throw new BadRequestException({ code: "bad_amount", message: "Total transaksi tidak valid." });
    }

    // Snap line items must sum to gross_amount or the API rejects with
    // "transaction_details.gross_amount doesn't tally with item_details".
    // We ship one consolidated line — Midtrans is happy as long as the
    // numbers reconcile, and we don't have per-fee breakdowns yet.
    const itemDetails = input.items.length > 0
      ? input.items.map((i) => ({
          id: i.id ?? input.humanId,
          name: i.name.slice(0, 50),
          quantity: i.qty ?? 1,
          price: Number(i.priceCents / 100n),
        }))
      : [{ id: input.humanId, name: "Hoobiq order", quantity: 1, price: grossAmount }];

    const itemsTotal = itemDetails.reduce((s, it) => s + it.price * it.quantity, 0);
    // Pad / shave the difference (shipping, fees) into a single sentinel
    // line so Midtrans's reconciliation passes.
    if (itemsTotal !== grossAmount) {
      itemDetails.push({
        id: `${input.humanId}-fees`,
        name: "Ongkir & biaya layanan",
        quantity: 1,
        price: grossAmount - itemsTotal,
      });
    }

    const body = {
      transaction_details: {
        order_id: input.humanId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
      },
      item_details: itemDetails,
      // Snap will show all enabled methods configured in the merchant
      // dashboard. We don't restrict here so seller / admin can tune
      // method availability without code changes.
      callbacks: input.returnUrl ? { finish: input.returnUrl } : undefined,
    };

    let res: Response;
    let text: string;
    try {
      res = await fetch(`${this.snapBase}/transactions`, {
        method: "POST",
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(body),
      });
      text = await res.text();
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      this.log.error(`Midtrans Snap fetch failed: ${reason}`);
      throw new BadRequestException({
        code: "payment_network_error",
        message: `Tidak bisa hubungi Midtrans (${reason}).`,
      });
    }

    if (!res.ok) {
      this.log.warn(`Midtrans Snap ${res.status}: ${text.slice(0, 320)}`);
      let msg = `Midtrans HTTP ${res.status}`;
      try {
        const j = JSON.parse(text) as { error_messages?: string[]; status_message?: string };
        if (j.error_messages?.length) msg += ` — ${j.error_messages.join("; ")}`;
        else if (j.status_message)    msg += ` — ${j.status_message}`;
      } catch { /* not json */ }
      throw new BadRequestException({
        code: "payment_upstream_error",
        message: `Pembayaran bermasalah: ${msg}`,
      });
    }

    const json = JSON.parse(text) as { token: string; redirect_url: string };
    if (!json.token || !json.redirect_url) {
      throw new BadRequestException({
        code: "payment_bad_response",
        message: "Midtrans tidak mengembalikan token Snap.",
      });
    }
    return {
      // We use Midtrans's own order_id (= our humanId) as providerTxId
      // so subsequent /v2/{order_id}/status and /refund calls resolve
      // without an extra lookup.
      providerTxId: input.humanId,
      redirectUrl: json.redirect_url,
      status: "pending",
    };
  }

  /**
   * Midtrans signature = sha512(order_id + status_code + gross_amount + server_key).
   * Constant-time compare prevents timing attacks.
   */
  verifyWebhookSignature(payload: unknown, signature: string): boolean {
    if (!env.MIDTRANS_SERVER_KEY) return false;
    const p = payload as Record<string, string> | null;
    if (!p?.order_id || !p?.status_code || !p?.gross_amount) return false;
    const expected = crypto
      .createHash("sha512")
      .update(`${p.order_id}${p.status_code}${p.gross_amount}${env.MIDTRANS_SERVER_KEY}`)
      .digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
    } catch {
      return false;
    }
  }

  async refund(providerTxId: string, amountCents: bigint): Promise<void> {
    const amount = Number(amountCents / 100n);
    if (amount <= 0) return;

    const body = {
      // Idempotency key for the refund. Midtrans dedupes by this.
      refund_key: `rf-${providerTxId}-${Date.now()}`,
      amount,
      reason: "Hoobiq order cancellation/return",
    };

    let res: Response;
    let text: string;
    try {
      res = await fetch(`${this.apiBase}/${encodeURIComponent(providerTxId)}/refund`, {
        method: "POST",
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(body),
      });
      text = await res.text();
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      this.log.error(`Midtrans refund fetch failed (${providerTxId}): ${reason}`);
      throw new Error(`Midtrans refund network: ${reason}`);
    }

    if (!res.ok) {
      this.log.warn(`Midtrans refund ${providerTxId} HTTP ${res.status}: ${text.slice(0, 200)}`);
      // 412 with "transaction status" message means the order isn't in
      // a refundable state (e.g. already refunded, or never settled).
      // We let the caller log + notify rather than retrying blindly.
      throw new Error(`Midtrans refund failed: HTTP ${res.status} — ${text.slice(0, 160)}`);
    }
    this.log.log(`Midtrans refund ok: ${providerTxId} (Rp ${amount.toLocaleString("id-ID")})`);
  }
}
