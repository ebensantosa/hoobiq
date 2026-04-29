import { forwardRef, Module } from "@nestjs/common";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { MidtransProvider } from "./midtrans.provider";
import { KomercePaymentService } from "./komerce-payment.service";
import { PaymentsController } from "./payments.controller";
import { PAYMENT_PROVIDER } from "./payment-provider.interface";
import { OrdersModule } from "../orders/orders.module";

@Module({
  // forwardRef breaks the circular import — OrdersModule depends on
  // PaymentsModule (it creates charges) and PaymentsModule now depends on
  // OrdersService.markPaid() for the reconcile endpoint.
  imports: [RedisModule, forwardRef(() => OrdersModule)],
  providers: [
    MidtransProvider,
    KomercePaymentService,
    { provide: PAYMENT_PROVIDER, useExisting: MidtransProvider },
  ],
  controllers: [PaymentsController],
  exports: [PAYMENT_PROVIDER, KomercePaymentService],
})
export class PaymentsModule {}
