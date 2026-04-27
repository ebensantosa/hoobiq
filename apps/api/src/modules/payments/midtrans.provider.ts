import { Injectable, Logger } from "@nestjs/common";
import crypto from "node:crypto";
import type { ChargeInput, ChargeResult, PaymentProvider } from "./payment-provider.interface";
import { env } from "../../config/env";

/**
 * Midtrans sandbox implementation. All HTTP calls are left as TODO — wiring
 * the real client (`midtrans-client` or direct fetch) is straightforward.
 * The important piece (signature verification) is implemented correctly.
 */
@Injectable()
export class MidtransProvider implements PaymentProvider {
  private readonly log = new Logger(MidtransProvider.name);

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    // TODO: POST https://app.sandbox.midtrans.com/snap/v1/transactions
    // Authorization: Basic <base64(SERVER_KEY:)>
    // body: { transaction_details, customer_details, item_details, enabled_payments }
    // response: { token, redirect_url }
    this.log.warn("MidtransProvider.createCharge: stub — wire real HTTP call in production");
    return {
      providerTxId: `sandbox-${input.humanId}`,
      redirectUrl: `https://app.sandbox.midtrans.com/snap/v4/redirection/demo-${input.humanId}`,
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
    // TODO: POST https://api.sandbox.midtrans.com/v2/{order_id}/refund
    this.log.warn(`MidtransProvider.refund: stub (${providerTxId} / ${amountCents})`);
  }
}
