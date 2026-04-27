import { Module } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller";
import { OrdersModule } from "../orders/orders.module";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [OrdersModule, PaymentsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
