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

    const newCat = await this.prisma.$transaction(async (tx) => {
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
      return cat;
    });

    await this.redis.client.del("categories:tree:v3").catch(() => undefined);
    return { id: newCat.id, slug: newCat.slug, name: newCat.name, level: newCat.level };
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
    await this.prisma.categoryRequest.update({
      where: { id },
      data: {
        status: "rejected",
        rejectNote: body.note,
        decidedById: admin.id,
        decidedAt: new Date(),
      },
    });
    return { ok: true };
  }
}
