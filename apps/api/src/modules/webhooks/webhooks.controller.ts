import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  Put,
} from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { env } from "../../config/env";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { PAYMENT_PROVIDER, type PaymentProvider } from "../payments/payment-provider.interface";
import { OrdersService } from "../orders/orders.service";
import { BoostService, BOOST_PREFIX } from "../boost/boost.service";

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
    private readonly boost: BoostService,
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
      // Boost purchases ride on the same Midtrans webhook stream — we
      // tag them with a "BST-" prefix at charge time so the router can
      // dispatch to the right service. Regular orders fall through to
      // OrdersService.markPaid as before.
      if (orderHumanId.startsWith(BOOST_PREFIX)) {
        await this.boost.markPaid(orderHumanId);
      } else {
        const order = await this.prisma.order.findUnique({ where: { humanId: orderHumanId } });
        if (order && order.status === "pending_payment") {
          await this.orders.markPaid(order.id, String(payload.transaction_id ?? ""), payload);
        }
      }
    }
    return { received: true };
  }

  // Komerce uses POST for the Payment API webhook and PUT for the
  // Store Order (shipment) webhook — same target URL, same auth scheme.
  // Both verbs delegate to the same handler so we can register a single
  // URL in the dashboard.
  @Public() @Post("komerce") @HttpCode(200)
  komercePost(
    @Body() payload: Record<string, unknown>,
    @Headers("x-callback-api-key") headerKey?: string,
    @Headers("callback_api_key") legacyKey?: string,
  ) { return this.handleKomerce(payload, headerKey, legacyKey); }

  @Public() @Put("komerce") @HttpCode(200)
  komercePut(
    @Body() payload: Record<string, unknown>,
    @Headers("x-callback-api-key") headerKey?: string,
    @Headers("callback_api_key") legacyKey?: string,
  ) { return this.handleKomerce(payload, headerKey, legacyKey); }

  private async handleKomerce(
    payload: Record<string, unknown>,
    headerKey?: string,
    legacyKey?: string,
  ) {
    const started = Date.now();

    // Komerce echoes the `callback_API_KEY` we sent during createCharge.
    // Different product types put it in different header casings, and some
    // ship it inside the body, so check all three.
    const expected = env.KOMERCE_WEBHOOK_SECRET ?? "";
    const received =
      headerKey ?? legacyKey ?? String(payload?.callback_api_key ?? payload?.callback_API_KEY ?? "");
    const ok = !!expected && received === expected;

    // Komerce field naming differs across products:
    //   Payment API (VA/ewallet/QRIS) sends `order_id` + `status: "paid"`.
    //   Store Order shipment uses PUT with `order_no` + `cnote` (AWB) +
    //   `status: "delivered" | "in_transit" | ...`.
    // Read both shapes; the action branch below decides what to do based
    // on which fields are populated.
    const orderHumanId = String(
      payload.order_id ?? payload.merchant_order_id ?? payload.invoice_id ?? payload.order_no ?? "",
    );
    const status = String(
      payload.status ?? payload.payment_status ?? payload.transaction_status ?? "",
    ).toLowerCase();
    const paymentId = String(payload.payment_id ?? payload.id ?? payload.transaction_id ?? "");
    // Shipment webhooks come in via PUT and carry an AWB; we just log them
    // for now (full shipment tracking lives elsewhere) — the raw payload
    // is preserved in webhookLog.payloadJson for audit/replay.
    const isShipment = !!payload.cnote || !!payload.awb_no || !!payload.awb;

    await this.prisma.webhookLog.create({
      data: {
        source: "komerce",
        event: isShipment ? `shipment.${status || "update"}` : (status || "unknown"),
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

    const isPaid = !isShipment && (status === "paid" || status === "settlement" || status === "success");
    if (isPaid && orderHumanId) {
      const order = await this.prisma.order.findUnique({ where: { humanId: orderHumanId } });
      if (order && order.status === "pending_payment") {
        await this.orders.markPaid(order.id, paymentId, payload);
      }
    }
    return { received: true };
  }
}
