import { BadRequestException, Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { z } from "zod";
import { DisputeDecideInput, type SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { OrdersService } from "../orders/orders.service";

const ListingPatch = z.object({
  title:        z.string().min(3).max(140).optional(),
  description:  z.string().max(8_000).optional(),
  priceIdr:     z.number().int().positive().optional(),
  // null clears the discount; number sets the strike-through "before"
  // price. Server validates compareAt > priceIdr.
  compareAtIdr: z.number().int().positive().nullable().optional(),
  categoryId:   z.string().min(1).optional(),
  condition:    z.enum(["BRAND_NEW_SEALED", "LIKE_NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"]).optional(),
  moderation:   z.enum(["pending", "pending_category", "active", "hidden", "rejected"]).optional(),
  isPublished:  z.boolean().optional(),
  // New admin-only powers — full content edit + transfer ownership.
  images:       z.array(z.string().min(1)).min(1).max(8).optional(),
  stock:        z.number().int().min(0).max(999).optional(),
  weightGrams:  z.number().int().min(10).max(50_000).optional(),
  tradeable:    z.boolean().optional(),
  // Spec-block fields. Empty string from the form clears the field.
  brand:    z.string().trim().max(80).nullable().optional(),
  variant:  z.string().trim().max(120).nullable().optional(),
  warranty: z.string().trim().max(160).nullable().optional(),
  /** Reassign the listing to a different seller. Identifier can be a
   *  user id, username, or email — server resolves it. */
  sellerRef:    z.string().min(1).max(80).optional(),
});
type ListingPatch = z.infer<typeof ListingPatch>;

const UserPatch = z.object({
  status: z.enum(["active", "flagged", "suspended"]).optional(),
  role:   z.enum(["user", "verified", "admin", "ops", "superadmin"]).optional(),
});
type UserPatch = z.infer<typeof UserPatch>;

const CategoryUpsert = z.object({
  slug:     z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  name:     z.string().min(1).max(80),
  parentId: z.string().nullable().optional(),
  level:    z.number().int().min(1).max(3).optional(),
  order:    z.number().int().min(0).max(9999).optional(),
  imageUrl: z.string().url().nullable().optional(),
});
type CategoryUpsert = z.infer<typeof CategoryUpsert>;

const CategoryPatch = CategoryUpsert.partial();
type CategoryPatch = z.infer<typeof CategoryPatch>;

const ReviewPatch = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  body:   z.string().max(2000).nullable().optional(),
});
type ReviewPatch = z.infer<typeof ReviewPatch>;

/**
 * Admin endpoints — every route is role-gated by @Roles.
 * All admin mutations should also write to the audit log; pattern shown in /audit.
 */
@Controller("admin")
@Roles("admin", "ops", "superadmin")
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly ordersService: OrdersService,
  ) {}

  private async writeAudit(actorId: string, action: string, targetRef: string, meta?: object) {
    await this.prisma.auditEntry.create({
      data: { actorId, action, targetRef, metaJson: meta ? JSON.stringify(meta) : null },
    });
  }

  @Get("overview")
  async overview() {
    const since = new Date(Date.now() - 24 * 3600 * 1000);

    const [
      userCount,
      activeWeek,
      listingCount,
      openDisputes,
      gmv24h,
      orders24h,
      escrow,
    ] = await Promise.all([
      this.prisma.user.count({ where: { status: "active" } }),
      this.prisma.user.count({ where: { status: "active", updatedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
      this.prisma.listing.count({ where: { deletedAt: null, isPublished: true } }),
      this.prisma.dispute.count({ where: { status: { in: ["new", "waiting_seller", "reviewing"] } } }),
      this.prisma.order.aggregate({
        _sum: { totalCents: true },
        where: { paidAt: { gte: since } },
      }),
      this.prisma.order.count({ where: { createdAt: { gte: since } } }),
      this.prisma.order.aggregate({
        _sum: { totalCents: true },
        where: { status: { in: ["paid", "shipped"] } },
      }),
    ]);

    const recentActivity = await this.prisma.auditEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { username: true, name: true } } },
    });

    return {
      kpi: {
        userCount,
        activeWeek,
        listingCount,
        openDisputes,
        gmv24hIdr: Number((gmv24h._sum.totalCents ?? 0n) / 100n),
        orders24h,
        escrowIdr: Number((escrow._sum.totalCents ?? 0n) / 100n),
      },
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        actor: a.actor?.name ?? a.actor?.username ?? "System",
        action: a.action,
        target: a.targetRef,
        at: a.createdAt.toISOString(),
      })),
    };
  }

  @Get("users")
  async listUsers(@Query("status") status?: string, @Query("q") q?: string) {
    const rows = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(status && { status }),
        ...(q && {
          OR: [
            { username: { contains: q } },
            { email:    { contains: q } },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, username: true, email: true, name: true, city: true,
        role: true, status: true, trustScore: true, level: true, createdAt: true,
      },
    });
    return { items: rows.map((u) => ({ ...u, trustScore: Number(u.trustScore), createdAt: u.createdAt.toISOString() })) };
  }

  @Get("listings")
  async listListings(@Query("status") status?: string) {
    const rows = await this.prisma.listing.findMany({
      where: { deletedAt: null, ...(status && { moderation: status }) },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { seller: { select: { username: true } }, category: { select: { slug: true, name: true } } },
    });
    return {
      items: rows.map((l) => ({
        id: l.id,
        title: l.title,
        priceIdr: Number(l.priceCents / 100n),
        condition: l.condition,
        moderation: l.moderation,
        isPublished: l.isPublished,
        seller: l.seller.username,
        category: l.category.name,
        views: l.views,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }

  @Get("orders")
  async listOrders(@Query("status") status?: string) {
    const rows = await this.prisma.order.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        buyer:  { select: { username: true } },
        seller: { select: { username: true } },
        listing:{ select: { title: true } },
      },
    });
    return {
      items: rows.map((o) => ({
        id: o.id,
        humanId: o.humanId,
        status: o.status,
        totalIdr: Number(o.totalCents / 100n),
        courier: o.courierCode,
        buyer: o.buyer.username,
        seller: o.seller.username,
        item: o.listing.title,
        createdAt: o.createdAt.toISOString(),
      })),
    };
  }

  @Get("disputes")
  async listDisputes() {
    const rows = await this.prisma.dispute.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        buyer:  { select: { username: true } },
        seller: { select: { username: true } },
        order:  { select: { humanId: true, totalCents: true, listing: { select: { title: true } } } },
      },
    });
    return {
      items: rows.map((d) => ({
        id: d.id,
        status: d.status,
        decision: d.decision,
        reason: d.reason,
        buyer: d.buyer.username,
        seller: d.seller.username,
        item: d.order.listing.title,
        humanId: d.order.humanId,
        amountIdr: Number(d.order.totalCents / 100n),
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  /** Detailed dispute view + chat/order context for the admin review screen. */
  @Get("disputes/:id")
  async disputeDetail(@Param("id") id: string) {
    const d = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        buyer:  { select: { username: true, name: true, avatarUrl: true } },
        seller: { select: { username: true, name: true, avatarUrl: true } },
        order: {
          include: {
            listing: { select: { title: true, imagesJson: true } },
            returnRequests: { orderBy: { createdAt: "desc" } },
          },
        },
      },
    });
    if (!d) return null;
    let cover: string | null = null;
    try { const imgs = JSON.parse(d.order.listing.imagesJson); if (Array.isArray(imgs)) cover = imgs[0] ?? null; } catch { /* ignore */ }
    return {
      id: d.id,
      status: d.status,
      kind: d.kind,
      decision: d.decision,
      reason: d.reason,
      description: d.description,
      evidence: safeArray(d.evidenceJson),
      adminNote: d.adminNote,
      createdAt: d.createdAt.toISOString(),
      resolvedAt: d.resolvedAt?.toISOString() ?? null,
      buyer: d.buyer,
      seller: d.seller,
      order: {
        humanId: d.order.humanId,
        status: d.order.status,
        totalIdr: Number(d.order.totalCents / 100n),
        trackingNumber: d.order.trackingNumber,
        courier: d.order.courierCode,
        listing: { title: d.order.listing.title, cover },
      },
      returns: d.order.returnRequests.map((r) => ({
        id: r.id, status: r.status, reason: r.reason, description: r.description,
        evidence: safeArray(r.evidenceJson),
        returnTrackingNumber: r.returnTrackingNumber,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
      })),
    };
  }

  /** Admin's final decision — limited to the 3 CS options. */
  @Post("disputes/:id/decide")
  @HttpCode(200)
  decideDispute(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body(new ZodPipe(DisputeDecideInput)) body: DisputeDecideInput,
  ) {
    return this.ordersService.adminDecideDispute(user.id, id, body);
  }

  @Get("audit")
  async audit() {
    const entries = await this.prisma.auditEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: { select: { username: true } } },
    });
    return {
      entries: entries.map((e) => ({
        id: e.id,
        actor: e.actor?.username ?? "System",
        action: e.action,
        target: e.targetRef,
        ip: e.ip,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  // (helper at bottom of file)

  /* ------------------------------------------------------------------ */
  /* Listings — admin can edit moderation, price, basic fields, or wipe */
  /* ------------------------------------------------------------------ */

  /** Full listing detail for the admin editor — used by the edit form. */
  @Get("listings/:id")
  async getListing(@Param("id") id: string) {
    const l = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, username: true, name: true, email: true } },
        category: { select: { id: true, slug: true, name: true } },
      },
    });
    if (!l) throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });
    let images: string[] = [];
    try {
      const parsed = JSON.parse(l.imagesJson);
      if (Array.isArray(parsed)) images = parsed.filter((s) => typeof s === "string");
    } catch { /* ignore */ }
    return {
      id: l.id,
      slug: l.slug,
      title: l.title,
      description: l.description,
      priceIdr: Number(l.priceCents / 100n),
      compareAtIdr: l.compareAtCents != null ? Number(l.compareAtCents / 100n) : null,
      brand: l.brand,
      variant: l.variant,
      warranty: l.warranty,
      condition: l.condition,
      stock: l.stock,
      weightGrams: l.weightGrams,
      tradeable: l.tradeable,
      moderation: l.moderation,
      isPublished: l.isPublished,
      images,
      seller: l.seller,
      category: l.category,
    };
  }

  @Patch("listings/:id")
  async patchListing(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body(new ZodPipe(ListingPatch)) input: ListingPatch,
  ) {
    const exists = await this.prisma.listing.findUnique({ where: { id }, select: { id: true, sellerId: true, priceCents: true } });
    if (!exists) throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });

    // Validate compareAtIdr (when set) against the live price — either
    // the just-supplied priceIdr or the existing one. Reject equal-or-
    // lower so a stale strike-through can't accidentally raise the
    // displayed price.
    if (input.compareAtIdr != null) {
      const livePriceIdr = input.priceIdr ?? Number(exists.priceCents / 100n);
      if (input.compareAtIdr <= livePriceIdr) {
        throw new BadRequestException({
          code: "compare_at_invalid",
          message: "Harga coret harus lebih tinggi dari harga jual.",
        });
      }
    }

    // Resolve transfer target — accepts id, username, or email so the
    // admin doesn't have to copy the user id from another tab.
    let nextSellerId: string | undefined;
    if (input.sellerRef && input.sellerRef.trim()) {
      // Accept either `@username`, `username`, an email, or a raw user id.
      // Stripping the optional leading `@` here means the admin can paste
      // straight from a user mention without having to clean it up.
      const ref = input.sellerRef.trim().replace(/^@+/, "");
      const target = await this.prisma.user.findFirst({
        where: {
          deletedAt: null,
          OR: [{ id: ref }, { username: ref }, { email: ref.toLowerCase() }],
        },
        select: { id: true },
      });
      if (!target) {
        throw new NotFoundException({ code: "seller_not_found", message: `Seller "${ref}" tidak ditemukan.` });
      }
      if (target.id !== exists.sellerId) nextSellerId = target.id;
    }

    const updated = await this.prisma.listing.update({
      where: { id },
      data: {
        ...(input.title       !== undefined && { title:       input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.priceIdr    !== undefined && { priceCents:  BigInt(input.priceIdr) * 100n }),
        ...(input.compareAtIdr !== undefined && {
          compareAtCents: input.compareAtIdr === null
            ? null
            : BigInt(input.compareAtIdr) * 100n,
        }),
        ...(input.brand       !== undefined && { brand:       input.brand    || null }),
        ...(input.variant     !== undefined && { variant:     input.variant  || null }),
        ...(input.warranty    !== undefined && { warranty:    input.warranty || null }),
        ...(input.categoryId  !== undefined && { categoryId:  input.categoryId }),
        ...(input.condition   !== undefined && { condition:   input.condition }),
        ...(input.moderation  !== undefined && { moderation:  input.moderation }),
        ...(input.isPublished !== undefined && { isPublished: input.isPublished }),
        ...(input.images      !== undefined && { imagesJson:  JSON.stringify(input.images) }),
        ...(input.stock       !== undefined && { stock:       input.stock }),
        ...(input.weightGrams !== undefined && { weightGrams: input.weightGrams }),
        ...(input.tradeable   !== undefined && { tradeable:   input.tradeable }),
        ...(nextSellerId      !== undefined && { sellerId:    nextSellerId }),
      },
      select: { id: true, title: true, moderation: true, isPublished: true, priceCents: true },
    });
    await this.writeAudit(user.id, "listing.admin_update", `listing:${id}`, input);
    return { ok: true, id: updated.id };
  }

  /** Hard delete — caller asked for permanent. Cascades via FK SET NULL on
   * orders.listingId would fail here because orders.listingId is NOT NULL,
   * so guard against deleting listings with existing orders.
   */
  @Delete("listings/:id")
  @HttpCode(204)
  async deleteListing(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    const orderCount = await this.prisma.order.count({ where: { listingId: id } });
    if (orderCount > 0) {
      // Soft-disable instead so historical orders keep their reference.
      await this.prisma.listing.update({
        where: { id },
        data: { isPublished: false, moderation: "hidden", deletedAt: new Date() },
      });
      await this.writeAudit(user.id, "listing.soft_delete", `listing:${id}`, { reason: "has_orders", orderCount });
      return;
    }
    await this.prisma.listing.delete({ where: { id } });
    await this.writeAudit(user.id, "listing.hard_delete", `listing:${id}`);
  }

  /* ------------------------------------------------------------------ */
  /* Users — status (suspend) + role only. No email/password edit.      */
  /* ------------------------------------------------------------------ */

  @Patch("users/:id")
  async patchUser(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body(new ZodPipe(UserPatch)) input: UserPatch,
  ) {
    if (id === user.id && input.role && input.role !== "admin" && input.role !== "superadmin") {
      // Prevent locking yourself out by demoting your own admin account.
      throw new NotFoundException({ code: "self_demote_forbidden", message: "Tidak bisa menurunkan role akunmu sendiri." });
    }
    const exists = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException({ code: "not_found", message: "User tidak ditemukan." });

    await this.prisma.user.update({
      where: { id },
      data: {
        ...(input.status !== undefined && { status: input.status }),
        ...(input.role   !== undefined && { role:   input.role }),
      },
    });
    await this.writeAudit(user.id, "user.admin_update", `user:${id}`, input);
    return { ok: true };
  }

  /** Soft-delete only — hard delete would orphan orders, listings, posts. */
  @Delete("users/:id")
  @HttpCode(204)
  async deleteUser(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    if (id === user.id) {
      throw new NotFoundException({ code: "self_delete_forbidden", message: "Tidak bisa menghapus akunmu sendiri." });
    }
    await this.prisma.user.update({
      where: { id },
      data: { status: "deleted", deletedAt: new Date() },
    });
    await this.writeAudit(user.id, "user.soft_delete", `user:${id}`);
  }

  /* ------------------------------------------------------------------ */
  /* Categories — full CRUD                                              */
  /* ------------------------------------------------------------------ */

  @Post("categories")
  async createCategory(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(CategoryUpsert)) input: CategoryUpsert,
  ) {
    const created = await this.prisma.category.create({
      data: {
        slug: input.slug,
        name: input.name,
        parentId: input.parentId ?? null,
        level: input.level ?? (input.parentId ? 2 : 1),
        order: input.order ?? 0,
        imageUrl: input.imageUrl ?? null,
      },
    });
    await this.redis.del("categories:tree:v3");
    await this.writeAudit(user.id, "category.create", `category:${created.id}`, input);
    return { id: created.id };
  }

  @Patch("categories/:id")
  async patchCategory(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body(new ZodPipe(CategoryPatch)) input: CategoryPatch,
  ) {
    const exists = await this.prisma.category.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException({ code: "not_found", message: "Kategori tidak ditemukan." });
    await this.prisma.category.update({ where: { id }, data: input });
    await this.redis.del("categories:tree:v3");
    await this.writeAudit(user.id, "category.update", `category:${id}`, input);
    return { ok: true };
  }

  @Delete("categories/:id")
  @HttpCode(204)
  async deleteCategory(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    const [childCount, listingCount] = await Promise.all([
      this.prisma.category.count({ where: { parentId: id } }),
      this.prisma.listing.count({ where: { categoryId: id } }),
    ]);
    if (childCount > 0 || listingCount > 0) {
      throw new NotFoundException({
        code: "category_in_use",
        message: `Tidak bisa hapus: ${childCount} sub-kategori dan ${listingCount} listing masih pakai kategori ini.`,
      });
    }
    await this.prisma.category.delete({ where: { id } });
    await this.redis.del("categories:tree:v3");
    await this.writeAudit(user.id, "category.delete", `category:${id}`);
  }

  /** Flat list (no tree) for admin table. */
  @Get("categories")
  async listCategories() {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ level: "asc" }, { order: "asc" }, { name: "asc" }],
      include: { parent: { select: { name: true } }, _count: { select: { listings: true, children: true } } },
    });
    return {
      items: rows.map((c) => ({
        id: c.id, slug: c.slug, name: c.name, level: c.level, order: c.order,
        parentId: c.parentId, parentName: c.parent?.name ?? null,
        imageUrl: c.imageUrl,
        listingCount: c._count.listings,
        childCount: c._count.children,
      })),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Reviews — admin moderation                                          */
  /* ------------------------------------------------------------------ */

  /** List reviews with listing + buyer context for the admin table. */
  @Get("reviews")
  async listReviews(@Query("q") q?: string) {
    const rows = await this.prisma.listingReview.findMany({
      where: q
        ? {
            OR: [
              { body:    { contains: q } },
              { listing: { title: { contains: q } } },
              { buyer:   { username: { contains: q } } },
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        listing: { select: { id: true, slug: true, title: true } },
        buyer:   { select: { id: true, username: true, name: true } },
      },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        listing: r.listing,
        buyer: r.buyer,
      })),
    };
  }

  @Patch("reviews/:id")
  async patchReview(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body(new ZodPipe(ReviewPatch)) input: ReviewPatch,
  ) {
    const exists = await this.prisma.listingReview.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException({ code: "not_found", message: "Review tidak ditemukan." });
    await this.prisma.listingReview.update({
      where: { id },
      data: {
        ...(input.rating !== undefined && { rating: input.rating }),
        ...(input.body   !== undefined && { body:   input.body }),
      },
    });
    await this.writeAudit(user.id, "review.update", `review:${id}`, input);
    return { ok: true };
  }

  @Delete("reviews/:id")
  @HttpCode(204)
  async deleteReview(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    const exists = await this.prisma.listingReview.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException({ code: "not_found", message: "Review tidak ditemukan." });
    await this.prisma.listingReview.delete({ where: { id } });
    await this.writeAudit(user.id, "review.delete", `review:${id}`);
  }

  @Get("webhooks")
  async webhooks() {
    const rows = await this.prisma.webhookLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return {
      items: rows.map((w) => ({
        id: w.id,
        source: w.source,
        event: w.event,
        statusRaw: w.statusRaw,
        latencyMs: w.latencyMs,
        signatureOk: w.signatureOk,
        createdAt: w.createdAt.toISOString(),
      })),
    };
  }
}

function safeArray(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
