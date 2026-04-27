import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";

const CENTS_PER_RUPIAH = 100n;
const TICK_MS = 30_000;
const SNAP_TTL_S = 60 * 60 * 26; // hold a snapshot a little over a day

export type FloorPill = {
  slug: string;
  name: string;
  floorIdr: number;
  /** 24h percentage change as a decimal, e.g. 0.024 = +2.4% */
  change24h: number;
  /** Number of active listings backing this floor */
  listings: number;
};

/**
 * Computes per-series floor prices (cheapest active listing in each
 * top-level category) and a 24h delta vs a daily snapshot in Redis.
 *
 * Source of truth is the `Listing` table. A snapshot is written once per
 * UTC day under `floor:snap:<dayKey>` with a ~26h TTL so the prior day
 * is always available for the diff. Live updates fan out via the gateway.
 */
@Injectable()
export class FloorService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(FloorService.name);
  private timer: NodeJS.Timeout | null = null;
  private latest: FloorPill[] = [];
  private subscribers = new Set<(pills: FloorPill[]) => void>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async onModuleInit() {
    // Compute once on boot so the first REST request has live data, then
    // tick periodically for the websocket fanout.
    await this.recompute().catch((err) => {
      this.log.warn(`initial floor compute failed: ${(err as Error).message}`);
    });
    this.timer = setInterval(() => {
      this.recompute().catch((err) => {
        this.log.warn(`floor tick failed: ${(err as Error).message}`);
      });
    }, TICK_MS);
    if (this.timer.unref) this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  current(): FloorPill[] {
    return this.latest;
  }

  /** Registers a callback for live updates. Returns an unsubscribe fn. */
  subscribe(fn: (pills: FloorPill[]) => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  private async recompute(): Promise<void> {
    const roots = await this.prisma.category.findMany({
      where: { level: 1 },
      select: { id: true, slug: true, name: true },
    });
    if (roots.length === 0) return;

    // For each root we need the MIN(priceCents) over all listings in that
    // root or any of its descendants. We pre-build a child map once and
    // walk it per root to keep the DB pressure low.
    const all = await this.prisma.category.findMany({ select: { id: true, parentId: true } });
    const childrenOf = new Map<string, string[]>();
    for (const c of all) {
      if (c.parentId) {
        const arr = childrenOf.get(c.parentId) ?? [];
        arr.push(c.id);
        childrenOf.set(c.parentId, arr);
      }
    }

    const dayKey = Math.floor(Date.now() / 86_400_000);
    const prevRaw = await this.redis.get(`floor:snap:${dayKey - 1}`);
    const prevSnap: Record<string, number> = prevRaw ? safeParse(prevRaw) : {};

    const todaySnap: Record<string, number> = {};
    const pills: FloorPill[] = [];

    for (const root of roots) {
      const ids = bfs(root.id, childrenOf);
      const agg = await this.prisma.listing.aggregate({
        where: {
          deletedAt: null,
          isPublished: true,
          moderation: "active",
          stock: { gt: 0 },
          categoryId: { in: ids },
        },
        _min: { priceCents: true },
        _count: { _all: true },
      });
      const min = agg._min.priceCents;
      if (!min || agg._count._all === 0) continue;
      const floorIdr = Number(min / CENTS_PER_RUPIAH);
      todaySnap[root.slug] = floorIdr;

      const prev = prevSnap[root.slug];
      const change24h = prev && prev > 0 ? (floorIdr - prev) / prev : 0;

      pills.push({
        slug: root.slug,
        name: root.name,
        floorIdr,
        change24h,
        listings: agg._count._all,
      });
    }

    // Cheap stable order — alphabetical by slug — so the bar doesn't reshuffle
    // every tick. The UI is meant to feel cleaner than a crypto ticker.
    pills.sort((a, b) => a.slug.localeCompare(b.slug));

    await this.redis.setex(`floor:snap:${dayKey}`, SNAP_TTL_S, JSON.stringify(todaySnap));
    this.latest = pills;
    for (const fn of this.subscribers) fn(pills);
  }
}

function safeParse(raw: string): Record<string, number> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function bfs(rootId: string, childrenOf: Map<string, string[]>): string[] {
  const out: string[] = [];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    out.push(id);
    const kids = childrenOf.get(id);
    if (kids) queue.push(...kids);
  }
  return out;
}
