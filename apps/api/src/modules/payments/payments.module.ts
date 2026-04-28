import { Module } from "@nestjs/common";
import { MidtransProvider } from "./midtrans.provider";
import { KomercePaymentService } from "./komerce-payment.service";
import { PaymentsController } from "./payments.controller";
import { PAYMENT_PROVIDER } from "./payment-provider.interface";

@Module({
  providers: [
    MidtransProvider,
    KomercePaymentService,
    // Default provider stays Midtrans for the existing /orders/checkout
    // VA flow. KomercePaymentService is exposed separately so a future
    // payment selection UI can opt in per-method.
    { provide: PAYMENT_PROVIDER, useExisting: MidtransProvider },
  ],
  controllers: [PaymentsController],
  exports: [PAYMENT_PROVIDER, KomercePaymentService],
})
export class PaymentsModule {}
