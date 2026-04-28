import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

const CENTS_PER_RUPIAH = 100n;
const DEFAULT_DECK_SIZE = 20;

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

export type SwipeResult =
  | { matched: false }
  | {
      matched: true;
      proposalId: string;
      give: ListingMini;     // user picked this from their own tradeable items
      get: ListingMini;
      counterparty: { username: string; name: string | null };
    };

@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tinder-style deck: every published listing flagged tradeable, owned by
   * someone other than the viewer, that the viewer hasn't already swiped.
   *
   * Match logic isn't computed here; it fires on right-swipe in `swipe()`.
   */
  async deck(userId: string, limit = DEFAULT_DECK_SIZE): Promise<TradeCard[]> {
    const swiped = await this.prisma.tradeSwipe.findMany({
      where: { userId },
      select: { targetListingId: true },
    });
    const skip = new Set(swiped.map((s) => s.targetListingId));

    const rows = await this.prisma.listing.findMany({
      where: {
        tradeable: true,
        deletedAt: null,
        isPublished: true,
        moderation: "active",
        sellerId: { not: userId },
        id: { notIn: Array.from(skip) },
      },
      orderBy: [{ boostedUntil: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        seller: {
          select: {
            id: true, username: true, name: true, avatarUrl: true, city: true,
            trustScore: true, level: true,
          },
        },
      },
    });

    if (rows.length === 0) return [];

    // Trade-history lookup for "X trade selesai" badge on each card.
    const sellerIds = Array.from(new Set(rows.map((r) => r.sellerId)));
    const historyCounts = await this.prisma.tradeProposal.groupBy({
      by: ["fromUserId"],
      where: { fromUserId: { in: sellerIds }, status: "accepted" },
      _count: { _all: true },
    });
    const historyMap = new Map(historyCounts.map((h) => [h.fromUserId, h._count._all]));

    return rows.map((l) => ({
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
  }

  /**
   * Record a swipe. Right-swipes trigger a mutual-interest check:
   * if the target owner has previously right-swiped any of OUR tradeable
   * listings, we have a match. We auto-create a TradeProposal so the
   * conversation moves out of the deck and into the proposal inbox.
   *
   * The tradeable listing of OURS that gets paired is the one the target
   * owner expressed interest in earliest (deterministic + reproducible).
   */
  async swipe(userId: string, targetListingId: string, direction: "right" | "left"): Promise<SwipeResult> {
    const target = await this.prisma.listing.findUnique({
      where: { id: targetListingId },
      select: { id: true, sellerId: true, tradeable: true, deletedAt: true, isPublished: true, moderation: true },
    });
    if (!target || target.deletedAt) {
      throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });
    }
    if (target.sellerId === userId) {
      throw new ForbiddenException({ code: "self_swipe", message: "Tidak bisa swipe listing sendiri." });
    }
    if (!target.tradeable || !target.isPublished || target.moderation !== "active") {
      throw new ForbiddenException({ code: "not_tradeable", message: "Listing ini tidak available untuk trade." });
    }

    await this.prisma.tradeSwipe.upsert({
      where: { userId_targetListingId: { userId, targetListingId } },
      create: { userId, targetListingId, targetOwnerId: target.sellerId, direction },
      update: { direction },
    });

    if (direction !== "right") return { matched: false };

    // Mutual check — has the target owner right-swiped any of MY tradeable
    // listings that's still live?
    const reverse = await this.prisma.tradeSwipe.findFirst({
      where: {
        userId: target.sellerId,
        targetOwnerId: userId,
        direction: "right",
      },
      orderBy: { createdAt: "asc" },
    });
    if (!reverse) return { matched: false };

    // Verify both listings are still tradeable + active before pairing — one
    // could have been pulled or sold while we were swiping.
    const [give, get] = await Promise.all([
      this.prisma.listing.findFirst({
        where: {
          id: reverse.targetListingId, sellerId: userId,
          tradeable: true, isPublished: true, moderation: "active", deletedAt: null,
        },
      }),
      this.prisma.listing.findUnique({ where: { id: targetListingId } }),
    ]);
    if (!give || !get) return { matched: false };

    // Don't double-create a proposal if one is already pending for this pair.
    const existing = await this.prisma.tradeProposal.findFirst({
      where: {
        status: "pending",
        OR: [
          { fromListingId: give.id, toListingId: get.id },
          { fromListingId: get.id, toListingId: give.id },
        ],
      },
    });

    let proposal = existing;
    if (!proposal) {
      proposal = await this.prisma.tradeProposal.create({
        data: {
          fromUserId: userId,
          toUserId: target.sellerId,
          fromListingId: give.id,
          toListingId: get.id,
          message: null,
        },
      });
      // Notify both sides of the auto-match.
      await Promise.all([
        this.prisma.notification.create({
          data: {
            userId: target.sellerId,
            kind: "trade_match",
            title: "Match trade!",
            body: `Kalian saling tertarik. Buka proposal untuk kirim & terima.`,
            dataJson: JSON.stringify({ proposalId: proposal.id }),
          },
        }).catch(() => undefined),
        this.prisma.notification.create({
          data: {
            userId,
            kind: "trade_match",
            title: "Match trade!",
            body: `Kalian saling tertarik. Buka proposal untuk kirim & terima.`,
            dataJson: JSON.stringify({ proposalId: proposal.id }),
          },
        }).catch(() => undefined),
      ]);
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: target.sellerId },
      select: { username: true, name: true },
    });

    return {
      matched: true,
      proposalId: proposal.id,
      give: toListingMini(give),
      get: toListingMini(get),
      counterparty: { username: owner?.username ?? "", name: owner?.name ?? null },
    };
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
