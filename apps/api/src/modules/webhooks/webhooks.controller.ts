import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
} from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { PAYMENT_PROVIDER, type PaymentProvider } from "../payments/payment-provider.interface";
import { OrdersService } from "../orders/orders.service";

/**
 * Webhook handlers — CSRF-exempt (set in CsrfMiddlewareModule) but every
 * endpoint MUST verify the third-party signature before trusting anything.
 * Response is logged regardless so ops can replay failures.
 */
@Controller("webhooks")
export class WebhooksController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    @Inject(PAYMENT_PROVIDER) private readonly payment: PaymentProvider
  ) {}

  @Public()
  @Post("midtrans")
  @HttpCode(200) // Midtrans retries on non-2xx — always return 200 once we've logged
  async midtrans(@Body() payload: Record<string, unknown>, @Headers("x-signature") signature: string) {
    const started = Date.now();
    const ok = this.payment.verifyWebhookSignature(payload, signature ?? "");
    await this.prisma.webhookLog.create({
      data: {
        source: "midtrans",
        event: String(payload.transaction_status ?? "unknown"),
        statusRaw: String(payload.status_code ?? "?"),
        latencyMs: Date.now() - started,
        payloadJson: JSON.stringify(payload ?? {}),
        signatureOk: ok,
      },
    });
    if (!ok) throw new BadRequestException({ code: "bad_signature", message: "Invalid signature" });

    const orderHumanId = String(payload.order_id ?? "");
    const status = String(payload.transaction_status ?? "");
    if (status === "settlement" || status === "capture") {
      const order = await this.prisma.order.findUnique({ where: { humanId: orderHumanId } });
      if (order && order.status === "pending_payment") {
        await this.orders.markPaid(order.id, String(payload.transaction_id ?? ""), payload);
      }
    }
    return { received: true };
  }

  @Public()
  @Post("komerce")
  @HttpCode(200)
  async komerce(@Body() payload: unknown) {
    // TODO: verify Komerce signature (HMAC-SHA256 of raw body with KOMERCE_WEBHOOK_SECRET)
    await this.prisma.webhookLog.create({
      data: {
        source: "komerce",
        event: "shipment.update",
        statusRaw: "ok",
        latencyMs: 0,
        payloadJson: JSON.stringify(payload ?? {}),
        signatureOk: false,
      },
    });
    return { received: true };
  }
}
