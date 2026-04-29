import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";

type Node = {
  id: string;
  slug: string;
  name: string;
  level: number;
  parentId: string | null;
  listingCount: number;
  children: Node[];
};

@Controller("categories")
export class CategoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  /**
   * Returns the category tree with real `listingCount` per node. Counts
   * propagate upward — a parent's count = own listings + sum(children).
   * Cached 60s; invalidated implicitly by TTL when listings get created.
   */
  @Public()
  @Get()
  async tree() {
    return this.redis.cached("categories:tree:v2", 60, async () => {
      const [rows, counts] = await Promise.all([
        this.prisma.category.findMany({
          orderBy: [{ level: "asc" }, { order: "asc" }, { name: "asc" }],
        }),
        this.prisma.listing.groupBy({
          by: ["categoryId"],
          where: { deletedAt: null, isPublished: true, moderation: "active" },
          _count: { _all: true },
        }),
      ]);

      const directCount = new Map<string, number>();
      for (const c of counts) directCount.set(c.categoryId, c._count._all);

      const map = new Map<string, Node>();
      for (const r of rows) {
        map.set(r.id, {
          id: r.id, slug: r.slug, name: r.name, level: r.level,
          parentId: r.parentId,
          listingCount: directCount.get(r.id) ?? 0,
          children: [],
        });
      }
      // Build tree
      const roots: Node[] = [];
      for (const node of map.values()) {
        if (node.parentId && map.has(node.parentId)) {
          map.get(node.parentId)!.children.push(node);
        } else {
          roots.push(node);
        }
      }
      // Roll counts upward (post-order)
      const rollup = (n: Node): number => {
        for (const c of n.children) n.listingCount += rollup(c);
        return n.listingCount;
      };
      roots.forEach(rollup);
      return roots;
    });
  }
  // Category-request endpoints removed per spec. The CategoryRequest
  // schema model + admin moderation surfaces are gone too — sellers
  // submit any new sub-category needs through email/support.
}
