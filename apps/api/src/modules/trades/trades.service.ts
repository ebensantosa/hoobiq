import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

const CENTS_PER_RUPIAH = 100n;
/** Per-spec daily swipe budget for the discovery deck (Meet Match). */
const DAILY_SWIPE_CAP = 50;

export type ListingMini = {
  id: string;
  slug: string;
  title: string;
  priceIdr: number;
  cover: string | null;
  condition: string;
};

export type CounterpartyMini = {
  username: string;
  name: string | null;
  avatarUrl: string | null;
  city: string | null;
  trustScore: number;
  level: number;
  trades: { completed: number; rating: number | null };
};

export type TradeCard = {
  /** Stable key the client uses to track swipe state. */
  matchKey: string;
  /** The item being swiped on (someone else's listing flagged tradeable). */
  listing: ListingMini;
  owner: CounterpartyMini;
};

/**
 * Meet Match swipe result. Right swipes upsert into the user's wishlist;
 * left swipes just dismiss the card. The mutual-match → TradeProposal
 * flow has been retired in favor of this simpler wishlist-first model
 * (sehari batasnya 25, biar bisa lihat semua produk).
 */
export type SwipeResult = {
  /** True when the swipe was right and the listing got into the wishlist. */
  added: boolean;
  /** How many of the daily 25-swipe budget remain after this swipe. */
  remaining: number;
  /** Total budget — surfaced so the client can render `used / cap`. */
  cap: number;
};

/** Deck payload — the cards plus the user's daily-swipe meter. */
export type DeckResult = {
  items: TradeCard[];
  used: number;
  remaining: number;
  cap: number;
};

@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Meet Match deck: live marketplace listings (any seller other than the
   * viewer), excluding cards the viewer has already swiped — across all
   * days, so the deck rolls forward instead of looping. Capped at the
   * remaining daily budget so we never hand the client more cards than
   * they can act on.
   */
  async deck(userId: string): Promise<DeckResult> {
    const used = await this.dailyUsed(userId);
    const remaining = Math.max(0, DAILY_SWIPE_CAP - used);
    if (remaining === 0) {
      return { items: [], used, remaining, cap: DAILY_SWIPE_CAP };
    }

    const swiped = await this.prisma.tradeSwipe.findMany({
      where: { userId },
      select: { targetListingId: true },
    });
    const skip = new Set(swiped.map((s) => s.targetListingId));

    const rows = await this.prisma.listing.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        moderation: "active",
        sellerId: { not: userId },
        id: { notIn: Array.from(skip) },
      },
      orderBy: [{ boostedUntil: "desc" }, { createdAt: "desc" }],
      take: remaining,
      include: {
        seller: {
          select: {
            id: true, username: true, name: true, avatarUrl: true, city: true,
            trustScore: true, level: true,
          },
        },
      },
    });

    if (rows.length === 0) return { items: [], used, remaining, cap: DAILY_SWIPE_CAP };

    // Trade-history lookup for "X trade selesai" badge on each card —
    // kept because it's still a useful trust signal even if the trade
    // matching itself is gone.
    const sellerIds = Array.from(new Set(rows.map((r) => r.sellerId)));
    const historyCounts = await this.prisma.tradeProposal.groupBy({
      by: ["fromUserId"],
      where: { fromUserId: { in: sellerIds }, status: "accepted" },
      _count: { _all: true },
    });
    const historyMap = new Map(historyCounts.map((h) => [h.fromUserId, h._count._all]));

    const items = rows.map((l) => ({
      matchKey: l.id,
      listing: toListingMini(l),
      owner: {
        username:   l.seller.username,
        name:       l.seller.name,
        avatarUrl:  l.seller.avatarUrl,
        city:       l.seller.city,
        trustScore: Number(l.seller.trustScore),
        level:      l.seller.level,
        trades: { completed: historyMap.get(l.sellerId) ?? 0, rating: null },
      },
    }));

    return { items, used, remaining, cap: DAILY_SWIPE_CAP };
  }

  /**
   * Record a swipe. Right swipe → upsert into the user's wishlist (idempotent).
   * Left swipe → dismiss only. Both sides count against the 25/day budget;
   * once the cap is hit the request is rejected so the client can show the
   * "limit reached" state and stop sending swipes.
   */
  async swipe(userId: string, targetListingId: string, direction: "right" | "left"): Promise<SwipeResult> {
    const target = await this.prisma.listing.findUnique({
      where: { id: targetListingId },
      select: { id: true, sellerId: true, deletedAt: true, isPublished: true, moderation: true },
    });
    if (!target || target.deletedAt) {
      throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });
    }
    if (target.sellerId === userId) {
      throw new ForbiddenException({ code: "self_swipe", message: "Tidak bisa swipe listing sendiri." });
    }
    if (!target.isPublished || target.moderation !== "active") {
      throw new ForbiddenException({ code: "not_available", message: "Listing ini sudah tidak tersedia." });
    }

    // Cap check is best-effort — we reject loudly so the UI can lock out
    // further swipes today instead of silently no-op'ing.
    const used = await this.dailyUsed(userId);
    if (used >= DAILY_SWIPE_CAP) {
      throw new ForbiddenException({
        code: "daily_cap",
        message: `Kamu sudah swipe ${DAILY_SWIPE_CAP} kali hari ini. Coba lagi besok.`,
      });
    }

    // Track the swipe so the same card doesn't reappear in tomorrow's deck.
    // Reusing tradeSwipe (instead of adding a new table) — the column names
    // are generic enough for "any swipe direction on any listing" semantics.
    await this.prisma.tradeSwipe.upsert({
      where: { userId_targetListingId: { userId, targetListingId } },
      create: { userId, targetListingId, targetOwnerId: target.sellerId, direction },
      update: { direction },
    });

    let added = false;
    if (direction === "right") {
      // Idempotent — re-swiping right won't create duplicate wishlist rows.
      await this.prisma.wishlistItem.upsert({
        where: { userId_listingId: { userId, listingId: targetListingId } },
        update: {},
        create: { userId, listingId: targetListingId },
      });
      added = true;
    }

    const remaining = Math.max(0, DAILY_SWIPE_CAP - (used + 1));
    return { added, remaining, cap: DAILY_SWIPE_CAP };
  }

  /** Count swipes the user has made since local-day midnight (server TZ). */
  private async dailyUsed(userId: string): Promise<number> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return this.prisma.tradeSwipe.count({
      where: { userId, createdAt: { gte: start } },
    });
  }

  async propose(userId: string, input: { fromListingId: string; toListingId: string; message?: string }) {
    const [mine, theirs] = await Promise.all([
      this.prisma.listing.findUnique({ where: { id: input.fromListingId } }),
      this.prisma.listing.findUnique({ where: { id: input.toListingId } }),
    ]);
    if (!mine || !theirs) {
      throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });
    }
    if (mine.sellerId !== userId) {
      throw new ForbiddenException({ code: "forbidden", message: "Listing yang kamu tukar bukan milikmu." });
    }
    if (theirs.sellerId === userId) {
      throw new ForbiddenException({ code: "forbidden", message: "Tidak bisa propose ke diri sendiri." });
    }

    const proposal = await this.prisma.tradeProposal.create({
      data: {
        fromUserId:    userId,
        toUserId:      theirs.sellerId,
        fromListingId: input.fromListingId,
        toListingId:   input.toListingId,
        message:       input.message?.slice(0, 500) ?? null,
      },
    });

    this.prisma.notification.create({
      data: {
        userId: theirs.sellerId,
        kind: "trade_proposal",
        title: "Ada yang mau trade dengan kamu",
        body: `Tukar "${theirs.title}" ⇄ "${mine.title}". Buka untuk respon.`,
        dataJson: JSON.stringify({ proposalId: proposal.id }),
      },
    }).catch(() => undefined);

    return { id: proposal.id };
  }

  async respond(userId: string, id: string, action: "accept" | "decline" | "cancel") {
    const p = await this.prisma.tradeProposal.findUnique({ where: { id } });
    if (!p) throw new NotFoundException({ code: "not_found", message: "Proposal tidak ditemukan." });
    if (p.status !== "pending") {
      throw new ForbiddenException({ code: "already_resolved", message: "Proposal sudah direspon." });
    }
    if (action === "cancel" && p.fromUserId !== userId) {
      throw new ForbiddenException({ code: "forbidden", message: "Hanya pengirim yang bisa membatalkan." });
    }
    if (action !== "cancel" && p.toUserId !== userId) {
      throw new ForbiddenException({ code: "forbidden", message: "Hanya penerima yang bisa accept/decline." });
    }

    const status = action === "accept" ? "accepted" : action === "decline" ? "declined" : "cancelled";
    await this.prisma.tradeProposal.update({
      where: { id },
      data: { status, respondedAt: new Date() },
    });

    const otherUserId = userId === p.fromUserId ? p.toUserId : p.fromUserId;
    const verb = status === "accepted" ? "menerima" : status === "declined" ? "menolak" : "membatalkan";
    this.prisma.notification.create({
      data: {
        userId: otherUserId,
        kind: "trade_response",
        title: `Trade ${status}`,
        body: `Lawan ${verb} proposal trade-mu.`,
        dataJson: JSON.stringify({ proposalId: id, status }),
      },
    }).catch(() => undefined);

    return { id, status };
  }

  async listMine(userId: string) {
    const rows = await this.prisma.tradeProposal.findMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { items: rows.map((r) => ({
      id: r.id,
      direction: r.fromUserId === userId ? "outgoing" : "incoming",
      status: r.status,
      message: r.message,
      fromListingId: r.fromListingId,
      toListingId: r.toListingId,
      createdAt: r.createdAt.toISOString(),
      respondedAt: r.respondedAt?.toISOString() ?? null,
    })) };
  }
}

function toListingMini(l: {
  id: string; slug: string; title: string; priceCents: bigint;
  imagesJson: string; condition: string;
}): ListingMini {
  let cover: string | null = null;
  try {
    const v = JSON.parse(l.imagesJson);
    if (Array.isArray(v) && typeof v[0] === "string") cover = v[0];
  } catch { /* ignore */ }
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    priceIdr: Number(l.priceCents / CENTS_PER_RUPIAH),
    cover,
    condition: l.condition,
  };
}
