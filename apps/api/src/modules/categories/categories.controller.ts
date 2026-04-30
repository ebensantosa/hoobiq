import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { z } from "zod";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";

type Node = {
  id: string;
  slug: string;
  name: string;
  level: number;
  parentId: string | null;
  imageUrl: string | null;
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
    return this.redis.cached("categories:tree:v3", 60, async () => {
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
          imageUrl: r.imageUrl,
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
  /* --------------------- Category requests --------------------- */
  // Restored after the brief "remove" experiment — sellers occasionally
  // need a sub-category that doesn't exist (new anime, new brand) and
  // emailing support added too much friction. Buyer/seller proposes;
  // admin reviews; on approve a real Category row is inserted and the
  // tree cache is busted so it appears immediately on /kategori.

  @Post("requests")
  @HttpCode(201)
  async createRequest(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(z.object({
      parentId: z.string().cuid(),
      name: z.string().trim().min(2).max(80),
      slugHint: z.string().trim().min(2).max(64).regex(/^[a-z0-9-]+$/i, "huruf/angka/strip").optional(),
      description: z.string().trim().max(500).optional(),
    }))) body: { parentId: string; name: string; slugHint?: string; description?: string },
  ) {
    // Anti-spam cap. Once admin clears (approve/reject) the user can
    // submit again.
    const pending = await this.prisma.categoryRequest.count({
      where: { userId: user.id, status: "pending" },
    });
    if (pending >= 5) {
      throw new BadRequestException({
        code: "rate_limit_request",
        message: "Sudah ada 5 request kategori yang masih pending. Tunggu admin review dulu.",
      });
    }

    const parent = await this.prisma.category.findUnique({
      where: { id: body.parentId },
      select: { id: true, level: true },
    });
    if (!parent) throw new NotFoundException({ code: "parent_not_found", message: "Kategori induk tidak ditemukan." });
    if (parent.level >= 3) {
      throw new BadRequestException({
        code: "max_depth",
        message: "Sudah di kedalaman maksimum (3 level). Pilih induk lain.",
      });
    }

    const req = await this.prisma.categoryRequest.create({
      data: {
        userId: user.id,
        parentId: body.parentId,
        name: body.name,
        slugHint: body.slugHint,
        description: body.description,
      },
      select: { id: true, status: true, createdAt: true },
    });
    return req;
  }

  // List my own requests.
  @Get("requests/mine")
  async myRequests(@CurrentUser() user: SessionUser) {
    const rows = await this.prisma.categoryRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { parent: { select: { slug: true, name: true } } },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        slugHint: r.slugHint,
        description: r.description,
        status: r.status,
        rejectNote: r.rejectNote,
        parent: r.parent,
        categoryId: r.categoryId,
        createdAt: r.createdAt.toISOString(),
        decidedAt: r.decidedAt?.toISOString() ?? null,
      })),
    };
  }

  // Admin queue. Manual role check — kept off the AdminGuard to stay
  // scoped to /categories/requests.
  @Get("requests")
  async listRequests(
    @CurrentUser() user: SessionUser,
    @Query("status") status?: string,
  ) {
    if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "ops") {
      throw new ForbiddenException({ code: "forbidden", message: "Khusus admin." });
    }
    const where = status === "approved" || status === "rejected"
      ? { status }
      : { status: "pending" };
    const rows = await this.prisma.categoryRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user:   { select: { username: true, name: true, avatarUrl: true } },
        parent: { select: { slug: true, name: true, level: true } },
        // Up to 5 linked listings inline so the admin can preview what
        // approving/rejecting will affect without opening a separate
        // tab. _count gives the full total when there are more.
        listings: {
          where: { deletedAt: null },
          take: 5,
          select: { id: true, slug: true, title: true },
        },
        _count: { select: { listings: true } },
      },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        slugHint: r.slugHint,
        description: r.description,
        status: r.status,
        rejectNote: r.rejectNote,
        parent: r.parent,
        user: r.user,
        listings: r.listings,
        listingsCount: r._count.listings,
        createdAt: r.createdAt.toISOString(),
        decidedAt: r.decidedAt?.toISOString() ?? null,
      })),
    };
  }

  @Post("requests/:id/approve")
  async approveRequest(
    @CurrentUser() admin: SessionUser,
    @Param("id") id: string,
    @Body(new ZodPipe(z.object({
      slug: z.string().trim().min(2).max(64).regex(/^[a-z0-9-]+$/, "huruf kecil/angka/strip"),
      name: z.string().trim().min(2).max(80).optional(),
    }))) body: { slug: string; name?: string },
  ) {
    if (admin.role !== "admin" && admin.role !== "superadmin") {
      throw new ForbiddenException({ code: "forbidden", message: "Khusus admin." });
    }
    const req = await this.prisma.categoryRequest.findUnique({
      where: { id },
      include: { parent: { select: { id: true, level: true } } },
    });
    if (!req) throw new NotFoundException({ code: "not_found", message: "Request tidak ditemukan." });
    if (req.status !== "pending") {
      throw new BadRequestException({ code: "bad_state", message: "Request sudah diproses." });
    }
    const slugTaken = await this.prisma.category.findUnique({ where: { slug: body.slug } });
    if (slugTaken) throw new BadRequestException({ code: "slug_taken", message: "Slug sudah dipakai." });

    const result = await this.prisma.$transaction(async (tx) => {
      const cat = await tx.category.create({
        data: {
          slug: body.slug,
          name: body.name ?? req.name,
          parentId: req.parentId,
          level: req.parent.level + 1,
        },
      });
      await tx.categoryRequest.update({
        where: { id },
        data: {
          status: "approved",
          categoryId: cat.id,
          decidedById: admin.id,
          decidedAt: new Date(),
        },
      });
      // Cascade-publish — every listing parked behind this request
      // now has a real category to point at. Flip them to active +
      // published in one shot and clear the pending link so the
      // listing detail / admin queries stop treating them as pending.
      const linked = await tx.listing.findMany({
        where: { categoryRequestId: id, deletedAt: null },
        select: { id: true, sellerId: true, slug: true, title: true },
      });
      if (linked.length > 0) {
        await tx.listing.updateMany({
          where: { categoryRequestId: id, deletedAt: null },
          data: {
            categoryId: cat.id,
            categoryRequestId: null,
            moderation: "active",
            isPublished: true,
          },
        });
        // Notification per affected seller. Buyer experience-wise this
        // is the moment the listing actually goes live, so the seller
        // gets a heads-up + deep link to the listing.
        await tx.notification.createMany({
          data: linked.map((l) => ({
            userId: l.sellerId,
            kind: "category.approved",
            title: "Kategori disetujui — listing kamu live",
            body: `"${l.title}" sekarang tampil di marketplace di kategori ${cat.name}.`,
            dataJson: JSON.stringify({
              listingId: l.id,
              listingSlug: l.slug,
              categoryId: cat.id,
              categorySlug: cat.slug,
            }),
          })),
        });
      }
      return { cat, publishedCount: linked.length };
    });

    await this.redis.client.del("categories:tree:v3").catch(() => undefined);
    await this.redis.invalidate("listings:search:*").catch(() => undefined);
    return {
      id: result.cat.id,
      slug: result.cat.slug,
      name: result.cat.name,
      level: result.cat.level,
      publishedCount: result.publishedCount,
    };
  }

  @Post("requests/:id/reject")
  async rejectRequest(
    @CurrentUser() admin: SessionUser,
    @Param("id") id: string,
    @Body(new ZodPipe(z.object({
      note: z.string().trim().min(2).max(500),
    }))) body: { note: string },
  ) {
    if (admin.role !== "admin" && admin.role !== "superadmin") {
      throw new ForbiddenException({ code: "forbidden", message: "Khusus admin." });
    }
    const req = await this.prisma.categoryRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException({ code: "not_found", message: "Request tidak ditemukan." });
    if (req.status !== "pending") {
      throw new BadRequestException({ code: "bad_state", message: "Request sudah diproses." });
    }
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.categoryRequest.update({
        where: { id },
        data: {
          status: "rejected",
          rejectNote: body.note,
          decidedById: admin.id,
          decidedAt: new Date(),
        },
      });
      // Linked listings stay parked but flip to "rejected" so the
      // seller sees a clear state in the dashboard and can edit + pick
      // a different (existing) category to resubmit. We do NOT delete
      // the listing — content stays so the seller can edit in place.
      const linked = await tx.listing.findMany({
        where: { categoryRequestId: id, deletedAt: null },
        select: { id: true, sellerId: true, slug: true, title: true },
      });
      if (linked.length > 0) {
        await tx.listing.updateMany({
          where: { categoryRequestId: id, deletedAt: null },
          data: { moderation: "rejected", isPublished: false },
        });
        await tx.notification.createMany({
          data: linked.map((l) => ({
            userId: l.sellerId,
            kind: "category.rejected",
            title: "Kategori ditolak — listing perlu diedit",
            body: `Request kategori untuk "${l.title}" ditolak: ${body.note}. Edit listing dan pilih kategori yang sudah ada.`,
            dataJson: JSON.stringify({ listingId: l.id, listingSlug: l.slug, note: body.note }),
          })),
        });
      }
      return { affectedCount: linked.length };
    });
    return { ok: true, affectedCount: result.affectedCount };
  }
}
