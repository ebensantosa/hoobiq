import { Module } from "@nestjs/common";
import { MidtransProvider } from "./midtrans.provider";
import { PAYMENT_PROVIDER } from "./payment-provider.interface";

/**
 * Payment provider wiring. Single live provider (Midtrans Snap);
 * the legacy Komerce VA picker + reconcile loop were dropped after
 * the buyer flow standardised on Midtrans Snap's hosted page.
 */
@Module({
  providers: [
    MidtransProvider,
    { provide: PAYMENT_PROVIDER, useExisting: MidtransProvider },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
