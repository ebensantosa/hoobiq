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
import { env } from "../../config/env";
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
  async komerce(
    @Body() payload: Record<string, unknown>,
    @Headers("x-callback-api-key") headerKey?: string,
    @Headers("callback_api_key") legacyKey?: string,
  ) {
    const started = Date.now();

    // Komerce echoes the `callback_API_KEY` we sent during createCharge.
    // Different product types put it in different header casings, and some
    // ship it inside the body, so check all three.
    const expected = env.KOMERCE_WEBHOOK_SECRET ?? "";
    const received =
      headerKey ?? legacyKey ?? String(payload?.callback_api_key ?? payload?.callback_API_KEY ?? "");
    const ok = !!expected && received === expected;

    // Komerce field naming differs across products: paid VA pings carry
    // `status: "paid"`, QRIS uses `payment_status`. The order id we sent
    // (`order_id` = our humanId) comes back as `order_id` for VA/ewallet
    // and `merchant_order_id` for some tenants — read defensively.
    const orderHumanId = String(
      payload.order_id ?? payload.merchant_order_id ?? payload.invoice_id ?? "",
    );
    const status = String(
      payload.status ?? payload.payment_status ?? payload.transaction_status ?? "",
    ).toLowerCase();
    const paymentId = String(payload.payment_id ?? payload.id ?? payload.transaction_id ?? "");

    await this.prisma.webhookLog.create({
      data: {
        source: "komerce",
        event: status || "unknown",
        statusRaw: String(payload.status ?? payload.payment_status ?? "?"),
        latencyMs: Date.now() - started,
        payloadJson: JSON.stringify(payload ?? {}),
        signatureOk: ok,
      },
    });

    if (!ok) {
      // Don't reveal which check failed — return 400 so Komerce retries.
      throw new BadRequestException({ code: "bad_signature", message: "Invalid callback key" });
    }

    const isPaid = status === "paid" || status === "settlement" || status === "success";
    if (isPaid && orderHumanId) {
      const order = await this.prisma.order.findUnique({ where: { humanId: orderHumanId } });
      if (order && order.status === "pending_payment") {
        await this.orders.markPaid(order.id, paymentId, payload);
      }
    }
    return { received: true };
  }
}
