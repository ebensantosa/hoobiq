import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { PAYMENT_PROVIDER, type PaymentProvider } from "../payments/payment-provider.interface";
import { env } from "../../config/env";

const CENTS_PER_RUPIAH = 100n;

/**
 * Pricing tiers for listing boost. Single source of truth — surfaced
 * to the frontend via GET /listings/:id/boost.
 *
 * The chosen numbers fit a "buy a small ad" mental model: short
 * cycles cost just enough to be considered, longer cycles get a clear
 * per-day discount so committed sellers feel rewarded.
 */
export const BOOST_TIERS = [
  { id: "boost-7",  durationDays: 7,  priceIdr:  50_000, label: "1 minggu" },
  { id: "boost-14", durationDays: 14, priceIdr:  90_000, label: "2 minggu" },
  { id: "boost-30", durationDays: 30, priceIdr: 150_000, label: "1 bulan" },
] as const;

/** Prefix that lets the webhook router tell boost orders apart from normal orders. */
export const BOOST_PREFIX = "BST-";

@Injectable()
export class BoostService {
  private readonly log = new Logger(BoostService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly payment: PaymentProvider,
  ) {}

  tiers() {
    return BOOST_TIERS.map((t) => ({ ...t, priceCents: t.priceIdr * 100 }));
  }

  async statusFor(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, boostedUntil: true, sellerId: true },
    });
    if (!listing) throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });
    const now = new Date();
    const active = !!listing.boostedUntil && listing.boostedUntil > now;
    return {
      active,
      boostedUntil: listing.boostedUntil?.toISOString() ?? null,
      remainingDays: active && listing.boostedUntil
        ? Math.ceil((listing.boostedUntil.getTime() - now.getTime()) / (24 * 3600 * 1000))
        : 0,
    };
  }

  /**
   * Owner buys a boost. Creates a BoostPurchase row, fires a Midtrans
   * Snap charge keyed off "BST-<purchase-id>", and returns the redirect
   * URL. Webhook handler routes payments-by-prefix and calls markPaid().
   */
  async buy(userId: string, listingId: string, tierId: string, customer: { email: string; name: string; phone: string }) {
    const tier = BOOST_TIERS.find((t) => t.id === tierId);
    if (!tier) throw new BadRequestException({ code: "bad_tier", message: "Paket boost tidak valid." });

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, isPublished: true, moderation: true, deletedAt: true, title: true },
    });
    if (!listing || listing.deletedAt) throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });
    if (listing.sellerId !== userId) {
      throw new ForbiddenException({ code: "forbidden", message: "Hanya pemilik listing yang bisa membeli boost." });
    }
    if (!listing.isPublished || listing.moderation !== "active") {
      throw new BadRequestException({ code: "unavailable", message: "Listing harus aktif & published untuk di-boost." });
    }

    const priceCents = BigInt(tier.priceIdr) * CENTS_PER_RUPIAH;
    // Snap order_id has a 50-char limit + alnum/dash/underscore set.
    // BST-<cuid> stays well under that and is unique because cuid is.
    const purchase = await this.prisma.boostPurchase.create({
      data: {
        listingId: listing.id,
        userId,
        durationDays: tier.durationDays,
        priceCents,
        providerTxId: "", // filled in below once we know the snap order_id
        status: "pending",
      },
    });
    const providerTxId = `${BOOST_PREFIX}${purchase.id}`;
    await this.prisma.boostPurchase.update({
      where: { id: purchase.id },
      data: { providerTxId },
    });

    const webBase = (env.PUBLIC_WEB_BASE ?? "http://localhost:3000").replace(/\/$/, "");
    const charge = await this.payment.createCharge({
      orderId: purchase.id,
      humanId: providerTxId,
      amountCents: priceCents,
      method: "snap",
      customer,
      items: [{ id: tier.id, name: `Boost ${tier.label}: ${listing.title.slice(0, 28)}`, priceCents, qty: 1 }],
      returnUrl: `${webBase}/listing/${encodeURIComponent(listingId)}?boost=ok`,
    });
    return {
      purchaseId: purchase.id,
      providerTxId,
      redirectUrl: charge.redirectUrl ?? null,
      durationDays: tier.durationDays,
      priceIdr: tier.priceIdr,
    };
  }

  /**
   * Webhook handler hook — extends Listing.boostedUntil by the purchased
   * duration, idempotent on already-paid rows. Called from
   * WebhooksController when payload.order_id starts with BOOST_PREFIX.
   */
  async markPaid(providerTxId: string) {
    const purchase = await this.prisma.boostPurchase.findUnique({
      where: { providerTxId },
      include: { listing: { select: { id: true, boostedUntil: true } } },
    });
    if (!purchase) {
      this.log.warn(`markPaid: BoostPurchase not found for ${providerTxId}`);
      return;
    }
    if (purchase.status === "paid") return; // idempotent

    const now = new Date();
    // Stack: if listing already has an active boost, extend from that
    // future date so seller doesn't lose remaining time.
    const startsFrom = purchase.listing.boostedUntil && purchase.listing.boostedUntil > now
      ? purchase.listing.boostedUntil
      : now;
    const endsAt = new Date(startsFrom.getTime() + purchase.durationDays * 24 * 3600 * 1000);

    await this.prisma.$transaction([
      this.prisma.boostPurchase.update({
        where: { id: purchase.id },
        data: { status: "paid", paidAt: now, startsAt: startsFrom, endsAt },
      }),
      this.prisma.listing.update({
        where: { id: purchase.listingId },
        data: { boostedUntil: endsAt },
      }),
      this.prisma.notification.create({
        data: {
          userId: purchase.userId,
          kind: "boost_active",
          title: "Boost listing aktif",
          body: `Listing kamu di-boost selama ${purchase.durationDays} hari, sampai ${endsAt.toLocaleDateString("id-ID")}.`,
          dataJson: JSON.stringify({ listingId: purchase.listingId }),
        },
      }),
    ]);
  }
}
