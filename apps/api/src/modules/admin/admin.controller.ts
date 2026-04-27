import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { DisputeDecideInput, type SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";

/**
 * Admin endpoints — every route is role-gated by @Roles.
 * All admin mutations should also write to the audit log; pattern shown in /audit.
 */
@Controller("admin")
@Roles("admin", "ops", "superadmin")
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

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
