import { BadRequestException, Body, Controller, ForbiddenException, forwardRef, Get, Inject, Logger, NotFoundException, Post } from "@nestjs/common";
import { z } from "zod";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { env } from "../../config/env";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { KomercePaymentService, type ChargeMethod } from "./komerce-payment.service";
import { OrdersService } from "../orders/orders.service";

const ChargeInput = z.object({
  orderHumanId: z.string().min(1).max(40),
  method: z.enum(["va", "ewallet", "qris"]),
  channel: z.string().min(1).max(40).optional(), // bank/ewallet code — required for va/ewallet
});
type ChargeInput = z.infer<typeof ChargeInput>;

const CENTS_PER_RUPIAH = 100n;

@Controller("payments/komerce")
export class PaymentsController {
  private readonly log = new Logger(PaymentsController.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly komerce: KomercePaymentService,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => OrdersService))
    private readonly orders: OrdersService,
  ) {}

  /**
   * Live list of enabled methods from Komerce (cached 5 min). Used by the
   * checkout page to render a real method picker with the merchant's
   * actual enabled banks/wallets — no hardcoded "BCA / BNI" guesswork.
   */
  @Public()
  @Get("methods")
  async methods() {
    return this.redis.cached("payments:komerce:methods:v1", 300, async () => {
      const items = await this.komerce.listMethods();
      return { items };
    });
  }

  @Post("charge")
  async charge(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(ChargeInput)) input: ChargeInput,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { humanId: input.orderHumanId },
      select: {
        id: true, buyerId: true, totalCents: true, status: true, qty: true,
        buyer: { select: { email: true, name: true, username: true, phone: true } },
        listing: { select: { title: true, priceCents: true } },
      },
    });
    if (!order) throw new NotFoundException({ code: "not_found", message: "Order tidak ditemukan." });
    if (order.buyerId !== user.id) throw new ForbiddenException({ code: "forbidden", message: "Bukan order kamu." });
    if (order.status !== "pending_payment") {
      throw new BadRequestException({ code: "bad_state", message: "Order sudah terbayar atau dibatalkan." });
    }
    // VA / ewallet need a channel (bank/wallet code). Komerce expects a real
    // bank code like "bca", "bni", "ovo" — not a generic "page" sentinel.
    // The frontend now sends bca as the default for the Payment Page flow.
    if ((input.method === "va" || input.method === "ewallet") && !input.channel) {
      throw new BadRequestException({ code: "missing_channel", message: "Pilih bank/e-wallet." });
    }
    // Komerce requires a non-empty customer.phone. Block early with a clear
    // pointer to the profile page instead of letting the upstream throw a
    // 422 the buyer can't act on.
    if (!order.buyer.phone || order.buyer.phone.trim().length < 8) {
      throw new BadRequestException({
        code: "missing_phone",
        message: "Tambah nomor HP di /pengaturan dulu — Komerce butuh nomor untuk receipt.",
      });
    }

    const notifyUrl = `${(env.PUBLIC_API_BASE ?? "http://localhost:4000").replace(/\/$/, "")}/api/v1/webhooks/komerce`;
    // callback_api_key is required when callback_url is set. Reuse the
    // configured webhook secret so the receiver can authenticate inbound
    // pings against env.KOMERCE_WEBHOOK_SECRET.
    const callbackKey = env.KOMERCE_WEBHOOK_SECRET ?? "";
    // After a successful payment Komerce's hosted page bounces the buyer
    // here. We send them straight to the order detail (status will already
    // be "paid" because the webhook fires before the redirect lands).
    const webBase = (env.PUBLIC_WEB_BASE ?? "http://localhost:3000").replace(/\/$/, "");
    const returnUrl = `${webBase}/pesanan/${encodeURIComponent(input.orderHumanId)}`;

    const charge = await this.komerce.createCharge({
      orderId: order.id,
      humanId: input.orderHumanId,
      amountIdr: Number(order.totalCents / CENTS_PER_RUPIAH),
      method: input.method as ChargeMethod,
      channel: input.channel,
      customer: {
        email: order.buyer.email,
        name:  order.buyer.name ?? order.buyer.username,
        phone: order.buyer.phone ?? "",
      },
      items: [{
        name: order.listing.title,
        quantity: order.qty,
        priceIdr: Number(order.listing.priceCents / CENTS_PER_RUPIAH),
      }],
      notifyUrl,
      callbackKey,
      returnUrl,
    });

    // Persist Komerce's payment_id (externalId) so the reconcile endpoint
    // below can query GET /user/payment/status/{payment_id} as a fallback
    // when the webhook doesn't fire (sandbox often skips callbacks).
    // Upsert keyed by orderId because Payment.orderId is unique.
    await this.prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        provider: "komerce",
        providerTxId: charge.externalId,
        method: input.method,
        amountCents: order.totalCents,
        statusRaw: "pending",
      },
      update: {
        provider: "komerce",
        providerTxId: charge.externalId,
        method: input.method,
        statusRaw: "pending",
      },
    });

    return {
      method: input.method,
      redirectUrl: charge.redirectUrl ?? null,
      qrString: charge.qrString ?? null,
      qrImageUrl: charge.qrImageUrl ?? null,
      expiresAt: charge.expiresAt,
    };
  }

  /**
   * Active reconciliation against Komerce. The wait page polls this every
   * few seconds while the buyer is paying — Komerce explicitly recommends
   * polling GET /user/payment/status/{payment_id} as a fallback for
   * webhook delivery (rate limit: 1 req/3s per payment_id, which our 4s
   * client poll respects). Only the order's buyer can hit this.
   */
  @Post("reconcile")
  async reconcile(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(z.object({ orderHumanId: z.string().min(1).max(40) }))) input: { orderHumanId: string },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { humanId: input.orderHumanId },
      select: { id: true, buyerId: true, status: true, humanId: true },
    });
    if (!order) throw new NotFoundException({ code: "not_found", message: "Order tidak ditemukan." });
    if (order.buyerId !== user.id) throw new ForbiddenException({ code: "forbidden", message: "Bukan order kamu." });

    // Already paid (or otherwise terminal) — nothing to do.
    if (order.status !== "pending_payment") {
      return { status: order.status, reconciled: false };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { orderId: order.id },
      select: { providerTxId: true, provider: true },
    });
    if (!payment?.providerTxId || payment.provider !== "komerce") {
      this.log.log(
        `reconcile ${order.humanId} skipped — no komerce payment row (provider=${payment?.provider ?? "null"}, providerTxId=${payment?.providerTxId ?? "null"})`,
      );
      return { status: order.status, reconciled: false, reason: "no_charge" };
    }

    let komerceStatus = "";
    try {
      const res = await this.komerce.getStatus(payment.providerTxId);
      komerceStatus = res.status.toLowerCase();
      this.log.log(`reconcile ${order.humanId} → komerce=${komerceStatus} (paymentId=${payment.providerTxId})`);
      if (komerceStatus === "paid" || komerceStatus === "settlement" || komerceStatus === "success") {
        await this.orders.markPaid(order.id, payment.providerTxId, res.raw);
        return { status: "paid", reconciled: true };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`reconcile ${order.humanId} upstream error (paymentId=${payment.providerTxId}): ${msg}`);
    }
    return { status: order.status, reconciled: false, komerce: komerceStatus || null };
  }
}
