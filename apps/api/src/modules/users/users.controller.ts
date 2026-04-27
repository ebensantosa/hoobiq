import { Body, Controller, Get, NotFoundException, Param, Patch, Query } from "@nestjs/common";
import { UpdateProfileInput, type SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

@Controller("users")
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(":username")
  async getByUsername(@Param("username") username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true, username: true, name: true, avatarUrl: true, bio: true,
        city: true, role: true, level: true, exp: true, trustScore: true,
        createdAt: true,
      },
    });
    if (!user || user.username !== username) throw new NotFoundException({ code: "not_found", message: "Pengguna tidak ditemukan." });

    // Passport stats — collection value, trades, post count, top categories
    const [valueAgg, listingsCount, postsCount, tradesCount, byCategory] = await Promise.all([
      this.prisma.listing.aggregate({
        where: { sellerId: user.id, deletedAt: null, isPublished: true, moderation: "active", stock: { gt: 0 } },
        _sum: { priceCents: true },
      }),
      this.prisma.listing.count({
        where: { sellerId: user.id, deletedAt: null, isPublished: true, moderation: "active", stock: { gt: 0 } },
      }),
      this.prisma.post.count({ where: { authorId: user.id } }).catch(() => 0),
      this.prisma.tradeProposal.count({
        where: { OR: [{ fromUserId: user.id }, { toUserId: user.id }], status: "accepted" },
      }).catch(() => 0),
      this.prisma.listing.groupBy({
        by: ["categoryId"],
        where: { sellerId: user.id, deletedAt: null, isPublished: true, moderation: "active" },
        _count: { _all: true },
      }),
    ]);

    // Resolve category slugs for the top 3 categories
    const topCatIds = byCategory
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 3)
      .map((c) => c.categoryId);
    const cats = topCatIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: topCatIds } },
          select: { id: true, slug: true, name: true },
        })
      : [];
    const catBySlug = new Map(cats.map((c) => [c.id, c]));

    const passport = {
      collectionValueIdr: valueAgg._sum.priceCents
        ? Number(valueAgg._sum.priceCents / 100n)
        : 0,
      collectionCount: listingsCount,
      postsCount,
      tradesCompleted: tradesCount,
      tradeRating: Number(user.trustScore), // proxy until a dedicated Rating model lands
      badges: deriveBadges({
        listingsCount,
        postsCount,
        tradesCount,
        ageDays: Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000),
        byCategory: byCategory.map((c) => ({
          slug: catBySlug.get(c.categoryId)?.slug ?? "",
          count: c._count._all,
        })),
      }),
    };

    return {
      user: { ...user, trustScore: Number(user.trustScore), createdAt: user.createdAt.toISOString() },
      passport,
    };
  }

  /** Collection grid — published listings, optionally filtered by root category. */
  @Public()
  @Get(":username/collection")
  async collection(
    @Param("username") username: string,
    @Query("category") category?: string
  ) {
    const u = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!u) throw new NotFoundException({ code: "not_found", message: "Pengguna tidak ditemukan." });

    let categoryIds: string[] | undefined;
    if (category) {
      const root = await this.prisma.category.findUnique({ where: { slug: category }, select: { id: true } });
      if (!root) return { items: [] };
      const all = await this.prisma.category.findMany({ select: { id: true, parentId: true } });
      const childrenOf = new Map<string, string[]>();
      for (const c of all) {
        if (c.parentId) {
          const arr = childrenOf.get(c.parentId) ?? [];
          arr.push(c.id);
          childrenOf.set(c.parentId, arr);
        }
      }
      const out: string[] = [];
      const queue = [root.id];
      while (queue.length) {
        const id = queue.shift()!;
        out.push(id);
        const kids = childrenOf.get(id);
        if (kids) queue.push(...kids);
      }
      categoryIds = out;
    }

    const rows = await this.prisma.listing.findMany({
      where: {
        sellerId: u.id,
        deletedAt: null,
        isPublished: true,
        moderation: "active",
        ...(categoryIds && { categoryId: { in: categoryIds } }),
      },
      orderBy: [{ boostedUntil: "desc" }, { createdAt: "desc" }],
      take: 60,
      include: { category: { select: { slug: true, name: true } } },
    });

    return {
      items: rows.map((l) => {
        let cover: string | null = null;
        try {
          const v = JSON.parse(l.imagesJson);
          if (Array.isArray(v) && typeof v[0] === "string") cover = v[0];
        } catch { /* ignore */ }
        return {
          id: l.id,
          slug: l.slug,
          title: l.title,
          priceIdr: Number(l.priceCents / 100n),
          cover,
          condition: l.condition,
          category: l.category ? { slug: l.category.slug, name: l.category.name } : null,
        };
      }),
    };
  }

  /** Recent posts authored by this user. */
  @Public()
  @Get(":username/activity")
  async activity(@Param("username") username: string) {
    const u = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!u) throw new NotFoundException({ code: "not_found", message: "Pengguna tidak ditemukan." });

    const posts = await this.prisma.post.findMany({
      where: { authorId: u.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, body: true, imagesJson: true,
        likesCount: true, commentsCount: true, viewsCount: true, createdAt: true,
      },
    }).catch(() => [] as Array<{ id: string; body: string; imagesJson: string; likesCount: number; commentsCount: number; viewsCount: number; createdAt: Date }>);

    return {
      items: posts.map((p) => {
        let cover: string | null = null;
        try {
          const v = JSON.parse(p.imagesJson);
          if (Array.isArray(v) && typeof v[0] === "string") cover = v[0];
        } catch { /* ignore */ }
        return {
          id: p.id,
          body: p.body,
          cover,
          likes: p.likesCount,
          comments: p.commentsCount,
          views: p.viewsCount,
          createdAt: p.createdAt.toISOString(),
        };
      }),
    };
  }

  /** Public trade history — only accepted trades, anonymized counterparty. */
  @Public()
  @Get(":username/trades")
  async tradeHistory(@Param("username") username: string) {
    const u = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!u) throw new NotFoundException({ code: "not_found", message: "Pengguna tidak ditemukan." });

    const rows = await this.prisma.tradeProposal.findMany({
      where: { OR: [{ fromUserId: u.id }, { toUserId: u.id }], status: "accepted" },
      orderBy: { respondedAt: "desc" },
      take: 30,
    }).catch(() => []);

    // Hydrate listing titles + counterparty username in batches
    const listingIds = Array.from(new Set(rows.flatMap((r) => [r.fromListingId, r.toListingId])));
    const otherIds = Array.from(new Set(rows.map((r) => (r.fromUserId === u.id ? r.toUserId : r.fromUserId))));
    const [listings, others] = await Promise.all([
      listingIds.length
        ? this.prisma.listing.findMany({ where: { id: { in: listingIds } }, select: { id: true, title: true } })
        : [],
      otherIds.length
        ? this.prisma.user.findMany({ where: { id: { in: otherIds } }, select: { id: true, username: true } })
        : [],
    ]);
    const titleById = new Map(listings.map((l) => [l.id, l.title]));
    const userById  = new Map(others.map((u2) => [u2.id, u2.username]));

    return {
      items: rows.map((r) => {
        const youGave = r.fromUserId === u.id ? titleById.get(r.fromListingId) : titleById.get(r.toListingId);
        const youGot  = r.fromUserId === u.id ? titleById.get(r.toListingId)   : titleById.get(r.fromListingId);
        const counterId = r.fromUserId === u.id ? r.toUserId : r.fromUserId;
        return {
          id: r.id,
          gave: youGave ?? "—",
          got:  youGot ?? "—",
          counterparty: userById.get(counterId) ?? "—",
          completedAt: r.respondedAt?.toISOString() ?? r.createdAt.toISOString(),
        };
      }),
    };
  }

  @Patch("me")
  async updateMe(
    @CurrentUser() current: SessionUser,
    @Body(new ZodPipe(UpdateProfileInput)) body: UpdateProfileInput
  ) {
    // `interested` is the onboarding interest picker (sub-category slugs).
    // Stored serialized in the `interestedJson` text column.
    const { interested, interestedCategoryIds: _ignored, ...rest } = body;
    const data: Record<string, unknown> = { ...rest };
    if (interested !== undefined) {
      data.interestedJson = JSON.stringify(interested);
    }

    const user = await this.prisma.user.update({
      where: { id: current.id },
      data,
      select: { id: true, username: true, name: true, bio: true, city: true, avatarUrl: true, interestedJson: true },
    });
    let interestedOut: string[] = [];
    try { const v = JSON.parse(user.interestedJson); if (Array.isArray(v)) interestedOut = v; } catch { /* ignore */ }
    return { user: { ...user, interested: interestedOut } };
  }
}

/* ---------------------------------------------------------------- badges */

type BadgeInput = {
  listingsCount: number;
  postsCount: number;
  tradesCount: number;
  ageDays: number;
  byCategory: Array<{ slug: string; count: number }>;
};

export type Badge = {
  key: string;
  label: string;
  /** Emoji glyph fits the trainer-card aesthetic without an asset pipeline */
  glyph: string;
  /** Tone hint for the frontend palette */
  tone: "tcg" | "popmart" | "manga" | "figure" | "merch" | "trader" | "creator" | "veteran";
};

/**
 * Pick up to 3 specialty badges from real data. Category-based badges win
 * ties so the passport reflects what the user actually collects most.
 */
function deriveBadges(x: BadgeInput): Badge[] {
  const badges: Array<Badge & { weight: number }> = [];

  const totalCat = x.byCategory.reduce((s, c) => s + c.count, 0);
  for (const c of x.byCategory) {
    const share = totalCat > 0 ? c.count / totalCat : 0;
    if (share < 0.25 || c.count < 3) continue;
    if (c.slug === "cards" || c.slug.startsWith("pokemon")) {
      badges.push({ key: "tcg",      label: "TCG Master",      glyph: "🃏", tone: "tcg",     weight: 100 + share * 100 });
    } else if (c.slug === "blindbox" || c.slug.includes("blind") || c.slug.includes("popmart")) {
      badges.push({ key: "popmart",  label: "Pop Mart Hunter", glyph: "📦", tone: "popmart", weight: 100 + share * 100 });
    } else if (c.slug === "figure" || c.slug.includes("figure")) {
      badges.push({ key: "figure",   label: "Figure Curator",  glyph: "🗿", tone: "figure",  weight: 100 + share * 100 });
    } else if (c.slug === "komik"  || c.slug.includes("manga")) {
      badges.push({ key: "manga",    label: "Manga Otaku",     glyph: "📚", tone: "manga",   weight: 100 + share * 100 });
    } else if (c.slug === "merch") {
      badges.push({ key: "merch",    label: "Merch Maven",     glyph: "👕", tone: "merch",   weight: 100 + share * 100 });
    }
  }

  if (x.tradesCount >= 10) {
    badges.push({ key: "trader", label: "Veteran Trader",  glyph: "🤝", tone: "trader",  weight: 80 + Math.min(20, x.tradesCount) });
  } else if (x.tradesCount >= 3) {
    badges.push({ key: "trader", label: "Trader Aktif",    glyph: "🤝", tone: "trader",  weight: 60 });
  }

  if (x.postsCount >= 20) {
    badges.push({ key: "creator", label: "Konten Kreator", glyph: "📝", tone: "creator", weight: 70 });
  }

  if (x.ageDays >= 365) {
    badges.push({ key: "veteran", label: "OG Collector",    glyph: "🏛️", tone: "veteran", weight: 50 + Math.min(50, x.ageDays / 30) });
  }

  // Top 3 by weight, dedupe by key
  const seen = new Set<string>();
  return badges
    .sort((a, b) => b.weight - a.weight)
    .filter((b) => { if (seen.has(b.key)) return false; seen.add(b.key); return true; })
    .slice(0, 3)
    .map(({ weight, ...rest }) => rest);
}
