import { Module } from "@nestjs/common";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { MidtransProvider } from "./midtrans.provider";
import { KomercePaymentService } from "./komerce-payment.service";
import { PaymentsController } from "./payments.controller";
import { PAYMENT_PROVIDER } from "./payment-provider.interface";

@Module({
  imports: [RedisModule],
  providers: [
    MidtransProvider,
    KomercePaymentService,
    { provide: PAYMENT_PROVIDER, useExisting: MidtransProvider },
  ],
  controllers: [PaymentsController],
  exports: [PAYMENT_PROVIDER, KomercePaymentService],
})
export class PaymentsModule {}
