import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { ListingSearchInput, CreateListingInput, UpdateListingInput } from "@hoobiq/types";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { ExpService, EXP_KIND } from "../exp/exp.service";

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

/** Merge the legacy single-slug filter with the multi-select array, dedup. */
function collectSlugs(single: string | undefined, multi: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [single, ...(multi ?? [])]) {
    if (s && !seen.has(s)) { seen.add(s); out.push(s); }
  }
  return out;
}

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly exp: ExpService,
  ) {}

  async search(input: ListingSearchInput) {
    const limit = Math.min(input.limit, MAX_LIMIT);
    const key = `listings:search:${JSON.stringify({ ...input, limit })}`;
    return this.redis.cached(key, 30, async () => {
      // Resolve every slug (single legacy `categorySlug` and the
      // checkbox-multi-select `cats`) to the union of its descendant
      // category ids. Hitting "Trading Cards" should also surface
      // listings under Pokémon, Crown Zenith, etc; checking
      // "Toys" + "Action Figure" + "Naruto" unions all three subtrees.
      let categoryIds: string[] | undefined;
      const slugs = collectSlugs(input.categorySlug, input.cats);
      if (slugs.length > 0) {
        const sets = await Promise.all(slugs.map((s) => this.descendantCategoryIds(s)));
        const merged = Array.from(new Set(sets.flat()));
        if (merged.length === 0) {
          return { items: [], nextCursor: null };
        }
        categoryIds = merged;
      }

      // Search query — matches across title AND seller (username, name,
      // city) so the same nav search bar finds "pikachu", "@adityacollects",
      // "Aditya Kurniawan", or "Jakarta" without the buyer having to know
      // which field they're hitting. Case-insensitive contains is good
      // enough for the current row counts; revisit with full-text/Postgres
      // tsvector when the catalog scales past ~100k.
      const q = input.q?.trim();
      const where = {
        deletedAt: null,
        isPublished: true,
        moderation: "active",
        ...(q && {
          OR: [
            { title:                  { contains: q, mode: "insensitive" as const } },
            { seller: { username:     { contains: q, mode: "insensitive" as const } } },
            { seller: { name:         { contains: q, mode: "insensitive" as const } } },
            { seller: { city:         { contains: q, mode: "insensitive" as const } } },
            { description:            { contains: q, mode: "insensitive" as const } },
          ],
        }),
        ...(categoryIds && { categoryId: { in: categoryIds } }),
        ...(input.condition && { condition: input.condition }),
        ...(input.minPrice !== undefined && { priceCents: { gte: BigInt(input.minPrice) * CENTS_PER_RUPIAH } }),
        ...(input.maxPrice !== undefined && { priceCents: { lte: BigInt(input.maxPrice) * CENTS_PER_RUPIAH } }),
      } as const;

      // "trending" = boosted first, then most-viewed within the last 7 days,
      // then most-viewed all time, then newest. Approximated via Prisma's
      // multi-key orderBy — the boosted+recent flag pulls hot listings up
      // without needing a separate aggregate query.
      const orderBy =
        input.sort === "price_asc"  ? [{ priceCents: "asc"  as const }] :
        input.sort === "price_desc" ? [{ priceCents: "desc" as const }] :
        input.sort === "trending"   ? [
                                        { boostedUntil: "desc" as const },
                                        { views: "desc" as const },
                                        { createdAt: "desc" as const },
                                      ] :
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
      const fq = input.q?.trim();
      const where = {
        deletedAt: null,
        isPublished: true,
        moderation: "active",
        ...(fq && {
          OR: [
            { title:                  { contains: fq, mode: "insensitive" as const } },
            { seller: { username:     { contains: fq, mode: "insensitive" as const } } },
            { seller: { name:         { contains: fq, mode: "insensitive" as const } } },
            { seller: { city:         { contains: fq, mode: "insensitive" as const } } },
          ],
        }),
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
    // Daily anti-spam cap. Most legitimate sellers post 1–2 listings per
    // day; accounts blasting 20+ are almost always reposters or scammers.
    // Cap is per-rolling-24h, not midnight-reset, so it's harder to game.
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const todays = await this.prisma.listing.count({
      where: { sellerId, createdAt: { gte: since }, deletedAt: null },
    });
    const DAILY_LISTING_LIMIT = 5;
    if (todays >= DAILY_LISTING_LIMIT) {
      throw new BadRequestException({
        code: "rate_limit_listing",
        message: `Batas ${DAILY_LISTING_LIMIT} listing per hari. Coba lagi besok.`,
      });
    }
    // Reject backwards discounts up front so the UI doesn't have to
     // guard against showing a "before" price that's lower than the
     // live one. Equal values are also rejected — a 0% discount is just
     // the regular price.
    if (
      input.compareAtIdr != null
      && input.compareAtIdr <= input.priceIdr
    ) {
      throw new BadRequestException({
        code: "compare_at_invalid",
        message: "Harga coret harus lebih tinggi dari harga jual.",
      });
    }
    // Pending-category branch — seller typed a brand-new sub-cat or
    // series in the creatable picker. We create a CategoryRequest
    // linked to the parent (input.categoryId), then create the listing
    // pointing at the parent + that request id, parked at
    // moderation="pending_category" / isPublished=false until admin
    // approves. categoryId stays as the parent so foreign-key constraints
    // and the rollup-counts query don't break in the meantime.
    let categoryRequestId: string | null = null;
    let initialModeration: string = "active";
    let initialPublished = true;
    if (input.pendingCategory) {
      const parent = await this.prisma.category.findUnique({
        where: { id: input.categoryId },
        select: { id: true, level: true },
      });
      if (!parent) {
        throw new NotFoundException({ code: "parent_not_found", message: "Kategori induk tidak ditemukan." });
      }
      if (parent.level >= 3) {
        throw new BadRequestException({
          code: "max_depth",
          message: "Sudah di kedalaman maksimum (3 level). Pilih induk lain.",
        });
      }
      const req = await this.prisma.categoryRequest.create({
        data: {
          userId: sellerId,
          parentId: parent.id,
          name: input.pendingCategory.name,
        },
        select: { id: true },
      });
      categoryRequestId = req.id;
      initialModeration = "pending_category";
      initialPublished = false;
    }

    const slug = await this.uniqueSlug(input.title);
    const listing = await this.prisma.listing.create({
      data: {
        slug,
        sellerId,
        categoryId: input.categoryId,
        ...(categoryRequestId && { categoryRequestId }),
        title: input.title,
        description: input.description,
        priceCents: BigInt(input.priceIdr) * CENTS_PER_RUPIAH,
        ...(input.compareAtIdr != null && {
          compareAtCents: BigInt(input.compareAtIdr) * CENTS_PER_RUPIAH,
        }),
        ...(input.brand    !== undefined && { brand:    input.brand    || null }),
        ...(input.variant  !== undefined && { variant:  input.variant  || null }),
        ...(input.warranty !== undefined && { warranty: input.warranty || null }),
        stock: input.stock,
        condition: input.condition,
        imagesJson: JSON.stringify(input.images),
        weightGrams: input.weightGrams,
        couriersJson: JSON.stringify(input.couriers ?? []),
        ...(input.originSubdistrictId !== undefined && { originSubdistrictId: input.originSubdistrictId }),
        // Default trade-on per spec — sellers opt out, not in.
        tradeable: input.tradeable ?? true,
        showOnFeed: input.showOnFeed ?? true,
        lengthCm: input.lengthCm ?? null,
        widthCm:  input.widthCm  ?? null,
        heightCm: input.heightCm ?? null,
        isPreorder: input.isPreorder ?? false,
        preorderShipDays: input.isPreorder ? (input.preorderShipDays ?? null) : null,
        isPublished: initialPublished,
        moderation: initialModeration,
      },
    });
    await this.redis.invalidate("listings:search:*");
    // EXP: first-listing one-shot (300) — only fires the first time the
    // seller publishes a listing, regardless of moderation state.
    void this.exp.awardOnce(sellerId, EXP_KIND.firstListing, 300);
    return { id: listing.id, slug: listing.slug, pendingCategory: !!categoryRequestId };
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
    // compareAtIdr: null clears the discount; a number sets it; undefined
    // leaves it untouched. Reject when the resulting compareAt would
    // sit at or below the live price (whether the live price was just
    // updated above or is the existing one).
    if (input.compareAtIdr !== undefined) {
      if (input.compareAtIdr === null) {
        data.compareAtCents = null;
      } else {
        const livePriceIdr =
          input.priceIdr ?? Number(existing.priceCents / CENTS_PER_RUPIAH);
        if (input.compareAtIdr <= livePriceIdr) {
          throw new BadRequestException({
            code: "compare_at_invalid",
            message: "Harga coret harus lebih tinggi dari harga jual.",
          });
        }
        data.compareAtCents = BigInt(input.compareAtIdr) * CENTS_PER_RUPIAH;
      }
      delete data.compareAtIdr;
    }
    // brand/variant/warranty: trim + treat empty string as a clear.
    for (const k of ["brand", "variant", "warranty"] as const) {
      if (data[k] !== undefined) {
        const v = typeof data[k] === "string" ? (data[k] as string).trim() : data[k];
        data[k] = v === "" ? null : v;
      }
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
  compareAtCents?: bigint | null;
  condition: string; imagesJson: string; boostedUntil: Date | null; createdAt: Date;
  seller: { username: string; city: string | null; trustScore: number };
};

function toSummary(l: Row) {
  const images = parseImages(l.imagesJson);
  // Only emit compareAtIdr when it's actually higher than the live
  // price — a stale value at or below priceCents would render an
  // upside-down "discount" so we pre-filter here rather than in every
  // UI surface.
  const priceCents = l.priceCents;
  const compareCents = l.compareAtCents ?? null;
  const compareAtIdr =
    compareCents != null && compareCents > priceCents
      ? Number(compareCents / CENTS_PER_RUPIAH)
      : null;
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    priceIdr: Number(priceCents / CENTS_PER_RUPIAH),
    compareAtIdr,
    // Stored as a string column — the type union covers the new enum
    // (BRAND_NEW_SEALED, LIKE_NEW, EXCELLENT, GOOD, FAIR, POOR) plus
    // legacy values still on un-migrated rows (MINT, NEAR_MINT). UI uses
    // conditionBadge() to normalize either form.
    condition: l.condition as
      | "BRAND_NEW_SEALED" | "LIKE_NEW" | "EXCELLENT" | "GOOD" | "FAIR" | "POOR"
      | "MINT" | "NEAR_MINT",
    images,
    cover: images[0] ?? null,
    boosted: !!l.boostedUntil && l.boostedUntil > new Date(),
    seller: { username: l.seller.username, city: l.seller.city, trustScore: Number(l.seller.trustScore) },
    createdAt: l.createdAt.toISOString(),
  };
}

function toDetail(l: Row & {
  description: string; stock: number; weightGrams: number;
  brand?: string | null; variant?: string | null; warranty?: string | null;
  couriersJson?: string; originSubdistrictId?: number | null; tradeable?: boolean;
  showOnFeed?: boolean;
  lengthCm?: number | null; widthCm?: number | null; heightCm?: number | null;
  isPreorder?: boolean; preorderShipDays?: number | null;
  category: { id: string; slug: string; name: string };
}) {
  let couriers: string[] = [];
  try { const v = JSON.parse(l.couriersJson ?? "[]"); if (Array.isArray(v)) couriers = v.filter((s) => typeof s === "string"); } catch { /* fall through */ }
  return {
    ...toSummary(l),
    description: l.description,
    stock: l.stock,
    weightGrams: l.weightGrams,
    // Empty strings round-trip from the form as "" rather than null;
    // normalize both to null so the renderer's "show only when truthy"
    // check matches once instead of twice.
    brand:    nullableTrim(l.brand),
    variant:  nullableTrim(l.variant),
    warranty: nullableTrim(l.warranty),
    couriers,
    originSubdistrictId: l.originSubdistrictId ?? null,
    tradeable: l.tradeable ?? false,
    showOnFeed: l.showOnFeed ?? true,
    lengthCm: l.lengthCm ?? null,
    widthCm:  l.widthCm  ?? null,
    heightCm: l.heightCm ?? null,
    isPreorder: l.isPreorder ?? false,
    preorderShipDays: l.preorderShipDays ?? null,
    category: l.category,
  };
}

function nullableTrim(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}
