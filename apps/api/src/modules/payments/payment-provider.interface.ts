/**
 * Payment provider abstraction — callers depend only on this interface.
 * Midtrans implementation lives in midtrans.provider.ts; swapping providers
 * (e.g. to Xendit) doesn't touch any business logic.
 */
export interface PaymentProvider {
  createCharge(input: ChargeInput): Promise<ChargeResult>;
  verifyWebhookSignature(payload: unknown, signature: string): boolean;
  refund(providerTxId: string, amountCents: bigint): Promise<void>;
}

export interface ChargeInput {
  orderId: string;
  humanId: string;
  amountCents: bigint;
  method: string;
  customer: { email: string; name: string; phone: string };
  items: Array<{ id: string; name: string; priceCents: bigint; qty: number }>;
  /** Optional browser bounce URL after Snap finish — passed via callbacks.finish. */
  returnUrl?: string;
}

export interface ChargeResult {
  providerTxId: string;
  redirectUrl?: string; // Midtrans Snap redirect
  vaNumber?: string;    // for VA methods
  status: "pending" | "paid" | "failed";
}

export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");
