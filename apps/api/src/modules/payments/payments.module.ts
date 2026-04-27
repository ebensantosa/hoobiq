import { Module } from "@nestjs/common";
import { MidtransProvider } from "./midtrans.provider";
import { PAYMENT_PROVIDER } from "./payment-provider.interface";

@Module({
  providers: [
    MidtransProvider,
    { provide: PAYMENT_PROVIDER, useExisting: MidtransProvider },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
