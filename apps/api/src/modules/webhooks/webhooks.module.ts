import { Module } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller";
import { OrdersModule } from "../orders/orders.module";
import { PaymentsModule } from "../payments/payments.module";
import { BoostModule } from "../boost/boost.module";

@Module({
  imports: [OrdersModule, PaymentsModule, BoostModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
