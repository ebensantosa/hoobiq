import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { ListingSearchInput, CreateListingInput, UpdateListingInput } from "@hoobiq/types";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";

const CENTS_PER_RUPIAH = 100n;
const MAX_LIMIT = 60;

/** Parse JSON-encoded image list; tolerate old/bad data. */
function parseImages(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async search(input: ListingSearchInput) {
    const limit = Math.min(input.limit, MAX_LIMIT);
    const key = `listings:search:${JSON.stringify({ ...input, limit })}`;
    return this.redis.cached(key, 30, async () => {
      // Resolve categorySlug → set of category IDs that includes the given
      // category and all of its descendants. Hitting "Trading Cards" should
      // also surface listings under Pokémon, Crown Zenith, etc.
      let categoryIds: string[] | undefined;
      if (input.categorySlug) {
        categoryIds = await this.descendantCategoryIds(input.categorySlug);
        if (categoryIds.length === 0) {
          return { items: [], nextCursor: null };
        }
      }

      const where = {
        deletedAt: null,
        isPublished: true,
        moderation: "active",
        ...(input.q && { title: { contains: input.q, mode: "insensitive" as const } }),
        ...(categoryIds && { categoryId: { in: categoryIds } }),
        ...(input.condition && { condition: input.condition }),
        ...(input.minPrice !== undefined && { priceCents: { gte: BigInt(input.minPrice) * CENTS_PER_RUPIAH } }),
        ...(input.maxPrice !== undefined && { priceCents: { lte: BigInt(input.maxPrice) * CENTS_PER_RUPIAH } }),
      } as const;

      const orderBy =
        input.sort === "price_asc"  ? [{ priceCents: "asc"  as const }] :
        input.sort === "price_desc" ? [{ priceCents: "desc" as const }] :
                                      [{ boostedUntil: "desc" as const }, { createdAt: "desc" as const }];

      const rows = await this.prisma.listing.findMany({
        where,
        orderBy,
        take: limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        include: {
          seller: {
            select: {
              id: true, username: true, city: true, trustScore: true,
              ktpVerified: true, role: true,
            },
          },
        },
      });
      const hasNext = rows.length > limit;
      const sliced = hasNext ? rows.slice(0, limit) : rows;

      // Hydrate completed-trade counts in one batched query so badges have
      // real data without an N+1 lookup.
      const sellerIds = Array.from(new Set(sliced.map((r) => r.seller.id)));
      const tradeCounts = sellerIds.length
        ? await this.prisma.tradeProposal
            .groupBy({
              by: ["fromUserId"],
              where: { fromUserId: { in: sellerIds }, status: "accepted" },
              _count: { _all: true },
            })
            .catch(() => [] as Array<{ fromUserId: string; _count: { _all: number } }>)
        : [];
      const tradesBySeller = new Map(tradeCounts.map((t) => [t.fromUserId, t._count._all]));

      const items = sliced.map((l) => ({
        ...toSummary(l),
        seller: {
          ...toSummary(l).seller,
          kycVerified: l.seller.ktpVerified || l.seller.role === "verified" || l.seller.role === "admin",
          tradesCompleted: tradesBySeller.get(l.seller.id) ?? 0,
          avgShipHours: null as number | null, // wire when ship-time tracking lands
        },
      }));
      return { items, nextCursor: hasNext ? rows[limit - 1]!.id : null };
    });
  }

  /**
   * Build price histogram buckets + top-city facets matching the current
   * search context. Histogram is uniform-width over the observed range so
   * empty buckets read as gaps in the chart, not zeros squished by log scale.
   */
  async facets(input: { q?: string; categorySlug?: string; buckets: number }) {
    const cacheKey = `listings:facets:${JSON.stringify(input)}`;
    return this.redis.cached(cacheKey, 60, async () => {
      let categoryIds: string[] | undefined;
      if (input.categorySlug) {
        categoryIds = await this.descendantCategoryIds(input.categorySlug);
        if (categoryIds.length === 0) {
          return { histogram: { buckets: [], minIdr: 0, maxIdr: 0, total: 0 }, cities: [] };
        }
      }
      const where = {
        deletedAt: null,
        isPublished: true,
        moderation: "active",
        ...(input.q && { title: { contains: input.q, mode: "insensitive" as const } }),
        ...(categoryIds && { categoryId: { in: categoryIds } }),
      } as const;

      const [agg, count] = await Promise.all([
        this.prisma.listing.aggregate({
          where,
          _min: { priceCents: true },
          _max: { priceCents: true },
        }),
        this.prisma.listing.count({ where }),
      ]);

      const minCents = agg._min.priceCents ?? 0n;
      const maxCents = agg._max.priceCents ?? 0n;
      const minIdr = Number(minCents / CENTS_PER_RUPIAH);
      const maxIdr = Number(maxCents / CENTS_PER_RUPIAH);

      let bucketsOut: Array<{ low: number; high: number; count: number }> = [];
      if (count > 0 && maxIdr > minIdr) {
        const N = input.buckets;
        const step = Math.max(1, Math.ceil((maxIdr - minIdr + 1) / N));
        const counts = Array<number>(N).fill(0);

        // Pull just the prices; for our scale this is fine. Swap to
        // raw SQL bucketing if the table grows past ~100k rows.
        const rows = await this.prisma.listing.findMany({
          where,
          select: { priceCents: true },
          take: 5000,
        });
        for (const r of rows) {
          const idr = Number(r.priceCents / CENTS_PER_RUPIAH);
          let idx = Math.floor((idr - minIdr) / step);
          if (idx >= N) idx = N - 1;
          if (idx < 0) idx = 0;
          counts[idx] = (counts[idx] ?? 0) + 1;
        }
        bucketsOut = counts.map((c, i) => ({
          low:  minIdr + i * step,
          high: i === N - 1 ? maxIdr : minIdr + (i + 1) * step - 1,
          count: c,
        }));
      } else if (count > 0) {
        bucketsOut = [{ low: minIdr, high: maxIdr, count }];
      }

      // Top cities by listing count among current matches
      const cityRows = await this.prisma.listing.findMany({
        where,
        select: { seller: { select: { city: true } } },
        take: 2000,
      });
      const cityMap = new Map<string, number>();
      for (const r of cityRows) {
        const c = r.seller.city?.trim();
        if (!c) continue;
        cityMap.set(c, (cityMap.get(c) ?? 0) + 1);
      }
      const cities = [...cityMap.entries()]
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);

      return {
        histogram: { buckets: bucketsOut, minIdr, maxIdr, total: count },
        cities,
      };
    });
  }

  async getBySlug(slugOrId: string) {
    // Accept either the slug or the cuid id so that links from the listing
    // detail page (which historically used id) continue to resolve. Slugs
    // and cuids don't collide in practice.
    const listing = await this.prisma.listing.findFirst({
      where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
      include: {
        seller: { select: { username: true, name: true, avatarUrl: true, city: true, trustScore: true } },
        category: { select: { id: true, slug: true, name: true } },
      },
    });
    if (!listing || listing.deletedAt || !listing.isPublished) {
      throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });
    }
    // Aggregate review stats — single roundtrip; cheap because indexed on listingId.
    const ratingAgg = await this.prisma.listingReview.aggregate({
      where: { listingId: listing.id },
      _avg: { rating: true },
      _count: { _all: true },
    });
    this.prisma.listing.update({ where: { id: listing.id }, data: { views: { increment: 1 } } }).catch(() => undefined);
    return {
      ...toDetail(listing),
      seller: {
        username: listing.seller.username,
        name: listing.seller.name,
        avatarUrl: listing.seller.avatarUrl,
        city: listing.seller.city,
        trustScore: Number(listing.seller.trustScore),
      },
      rating: {
        avg: ratingAgg._avg.rating,
        count: ratingAgg._count._all,
      },
      views: listing.views,
    };
  }

  async create(sellerId: string, input: CreateListingInput) {
    const slug = await this.uniqueSlug(input.title);
    const listing = await this.prisma.listing.create({
      data: {
        slug,
        sellerId,
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        priceCents: BigInt(input.priceIdr) * CENTS_PER_RUPIAH,
        stock: input.stock,
        condition: input.condition,
        imagesJson: JSON.stringify(input.images),
        weightGrams: input.weightGrams,
        couriersJson: JSON.stringify(input.couriers ?? []),
        ...(input.originSubdistrictId !== undefined && { originSubdistrictId: input.originSubdistrictId }),
        tradeable: input.tradeable ?? false,
        isPublished: false,
        moderation: "pending",
      },
    });
    await this.redis.invalidate("listings:search:*");
    return { id: listing.id, slug: listing.slug };
  }

  async update(sellerId: string, id: string, input: UpdateListingInput) {
    const existing = await this.prisma.listing.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });
    if (existing.sellerId !== sellerId) throw new ForbiddenException({ code: "forbidden", message: "Kamu bukan pemilik listing ini." });

    const data: Record<string, unknown> = { ...input };
    if (input.priceIdr !== undefined) {
      data.priceCents = BigInt(input.priceIdr) * CENTS_PER_RUPIAH;
      delete data.priceIdr;
    }
    if (input.images !== undefined) {
      data.imagesJson = JSON.stringify(input.images);
      delete data.images;
    }
    if (input.couriers !== undefined) {
      data.couriersJson = JSON.stringify(input.couriers);
      delete data.couriers;
    }

    const updated = await this.prisma.listing.update({ where: { id }, data });
    await this.redis.invalidate("listings:search:*");
    return { id: updated.id, slug: updated.slug };
  }

  async softDelete(sellerId: string, id: string) {
    const existing = await this.prisma.listing.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });
    if (existing.sellerId !== sellerId) throw new ForbiddenException({ code: "forbidden", message: "Kamu bukan pemilik listing ini." });
    await this.prisma.listing.update({ where: { id }, data: { deletedAt: new Date(), isPublished: false } });
    await this.redis.invalidate("listings:search:*");
  }

  /**
   * BFS down the category tree from `slug`. Returns [rootId, ...allDescendants].
   * Cached briefly because the tree changes infrequently and we hit this on
   * every category-filtered search.
   */
  private async descendantCategoryIds(slug: string): Promise<string[]> {
    return this.redis.cached(`category:descendants:${slug}`, 120, async () => {
      const root = await this.prisma.category.findUnique({ where: { slug }, select: { id: true } });
      if (!root) return [];
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
      return out;
    });
  }

  private async uniqueSlug(title: string): Promise<string> {
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "listing";
    let slug = base;
    let i = 1;
    while (await this.prisma.listing.findUnique({ where: { slug }, select: { id: true } })) {
      i += 1;
      slug = `${base}-${i}`;
    }
    return slug;
  }
}

type Row = {
  id: string; slug: string; title: string; priceCents: bigint;
  condition: string; imagesJson: string; boostedUntil: Date | null; createdAt: Date;
  seller: { username: string; city: string | null; trustScore: number };
};

function toSummary(l: Row) {
  const images = parseImages(l.imagesJson);
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    priceIdr: Number(l.priceCents / CENTS_PER_RUPIAH),
    condition: l.condition as "MINT" | "NEAR_MINT" | "EXCELLENT" | "GOOD" | "FAIR",
    images,
    cover: images[0] ?? null,
    boosted: !!l.boostedUntil && l.boostedUntil > new Date(),
    seller: { username: l.seller.username, city: l.seller.city, trustScore: Number(l.seller.trustScore) },
    createdAt: l.createdAt.toISOString(),
  };
}

function toDetail(l: Row & {
  description: string; stock: number; weightGrams: number;
  couriersJson?: string; originSubdistrictId?: number | null; tradeable?: boolean;
  category: { id: string; slug: string; name: string };
}) {
  let couriers: string[] = [];
  try { const v = JSON.parse(l.couriersJson ?? "[]"); if (Array.isArray(v)) couriers = v.filter((s) => typeof s === "string"); } catch { /* fall through */ }
  return {
    ...toSummary(l),
    description: l.description,
    stock: l.stock,
    weightGrams: l.weightGrams,
    couriers,
    originSubdistrictId: l.originSubdistrictId ?? null,
    tradeable: l.tradeable ?? false,
    category: l.category,
  };
}
