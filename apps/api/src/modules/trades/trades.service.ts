import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

const CENTS_PER_RUPIAH = 100n;
const DEFAULT_DECK_SIZE = 12;

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

export type TradeMatch = {
  /** Stable composite key for swipe state. */
  matchKey: string;
  give: ListingMini;
  get:  ListingMini;
  counterparty: CounterpartyMini;
  /** 0..1, simple bidirectional fit score */
  score: number;
};

@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build a deck of trade matches for `userId`.
   *
   * Two-sided match logic:
   *   1. Find listings in MY wishlist (owned by other users) — these are the
   *      "you get" side.
   *   2. For each candidate seller, look at THEIR wishlist for any of MY
   *      published listings — that becomes the "you give" side.
   *   3. Cartesian product per pair, filter out previously passed pairs and
   *      pairs that already have an open proposal in either direction.
   *
   * The query stays modest because each user's wishlist is bounded; we cap
   * candidates per "you get" listing at 5 and total deck at 12.
   */
  async deck(userId: string, limit = DEFAULT_DECK_SIZE): Promise<TradeMatch[]> {
    // Step 1 — what I want, that exists as a real for-sale listing
    const myWish = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            seller: {
              select: {
                id: true, username: true, name: true, avatarUrl: true, city: true,
                trustScore: true, level: true,
              },
            },
            category: { select: { id: true, slug: true, name: true } },
          },
        },
      },
      take: 50,
    });

    const wantedListings = myWish
      .map((w) => w.listing)
      .filter((l) => l && !l.deletedAt && l.isPublished && l.moderation === "active" && l.sellerId !== userId);

    if (wantedListings.length === 0) return [];

    // Step 2 — my listings that are tradeable
    const myListings = await this.prisma.listing.findMany({
      where: {
        sellerId: userId,
        deletedAt: null,
        isPublished: true,
        moderation: "active",
        stock: { gt: 0 },
      },
      take: 30,
    });
    if (myListings.length === 0) return [];
    const myListingIds = myListings.map((l) => l.id);

    // Step 3 — for each candidate seller, what of mine they wishlist
    const candidateIds = Array.from(new Set(wantedListings.map((l) => l.sellerId)));
    const theirWish = await this.prisma.wishlistItem.findMany({
      where: {
        userId: { in: candidateIds },
        listingId: { in: myListingIds },
      },
      select: { userId: true, listingId: true },
    });
    if (theirWish.length === 0) return [];

    // Map: candidateId → list of my listingIds they want
    const wantsFromMe = new Map<string, string[]>();
    for (const w of theirWish) {
      const arr = wantsFromMe.get(w.userId) ?? [];
      arr.push(w.listingId);
      wantsFromMe.set(w.userId, arr);
    }
    const myListingById = new Map(myListings.map((l) => [l.id, l] as const));

    // Filter out previously passed pairs and proposals already in flight
    const [passes, openProposals] = await Promise.all([
      this.prisma.tradePass.findMany({
        where: { userId },
        select: { fromListingId: true, toListingId: true },
      }),
      this.prisma.tradeProposal.findMany({
        where: {
          status: "pending",
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        },
        select: { fromListingId: true, toListingId: true },
      }),
    ]);
    const skip = new Set<string>();
    for (const p of passes) skip.add(`${p.fromListingId}:${p.toListingId}`);
    for (const p of openProposals) {
      skip.add(`${p.fromListingId}:${p.toListingId}`);
      skip.add(`${p.toListingId}:${p.fromListingId}`);
    }

    // Trade-history lookup for counterparty rating display
    const historyCounts = await this.prisma.tradeProposal.groupBy({
      by: ["fromUserId"],
      where: { fromUserId: { in: candidateIds }, status: "accepted" },
      _count: { _all: true },
    });
    const historyMap = new Map(historyCounts.map((h) => [h.fromUserId, h._count._all]));

    // Step 4 — assemble matches
    const matches: TradeMatch[] = [];
    for (const wanted of wantedListings) {
      const theyWant = wantsFromMe.get(wanted.sellerId);
      if (!theyWant || theyWant.length === 0) continue;

      // Pick up to 2 of my listings per "you get" to avoid one prolific
      // partner monopolizing the deck
      for (const myId of theyWant.slice(0, 2)) {
        const mine = myListingById.get(myId);
        if (!mine) continue;
        const key = `${mine.id}:${wanted.id}`;
        if (skip.has(key)) continue;

        matches.push({
          matchKey: key,
          give: toListingMini(mine),
          get:  toListingMini(wanted),
          counterparty: {
            username:   wanted.seller.username,
            name:       wanted.seller.name,
            avatarUrl:  wanted.seller.avatarUrl,
            city:       wanted.seller.city,
            trustScore: Number(wanted.seller.trustScore),
            level:      wanted.seller.level,
            trades: {
              completed: historyMap.get(wanted.sellerId) ?? 0,
              rating: null, // wire when ratings model lands
            },
          },
          score: scoreFit(mine.priceCents, wanted.priceCents, Number(wanted.seller.trustScore)),
        });
        skip.add(key);
        if (matches.length >= limit) break;
      }
      if (matches.length >= limit) break;
    }

    // Best fit first
    matches.sort((a, b) => b.score - a.score);
    return matches;
  }

  async pass(userId: string, fromListingId: string, toListingId: string) {
    const target = await this.prisma.listing.findUnique({
      where: { id: toListingId },
      select: { sellerId: true },
    });
    if (!target) {
      throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });
    }
    await this.prisma.tradePass.upsert({
      where: { userId_fromListingId_toListingId: { userId, fromListingId, toListingId } },
      create: { userId, candidateUserId: target.sellerId, fromListingId, toListingId },
      update: {},
    });
    return { ok: true as const };
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

    // Notify the recipient. Don't await failure — DB row is the source of truth.
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

    // Notify the other party
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

/**
 * Fit score in [0, 1]:
 *   - price parity 70% (closer values = higher)
 *   - trust 30%
 */
function scoreFit(givePriceCents: bigint, getPriceCents: bigint, trust: number): number {
  const give = Number(givePriceCents);
  const get  = Number(getPriceCents);
  if (give <= 0 || get <= 0) return trust / 100;
  const ratio = Math.min(give, get) / Math.max(give, get);
  const trustNorm = Math.max(0, Math.min(1, trust / 100));
  return ratio * 0.7 + trustNorm * 0.3;
}
