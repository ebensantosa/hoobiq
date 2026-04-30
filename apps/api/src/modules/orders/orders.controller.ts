import {
  BadRequestException,
  Body, Controller, ForbiddenException, Get, HttpCode,
  NotFoundException, Param, Post, Query,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import {
  CheckoutInput,
  ShipOrderInput,
  CancelRequestInput,
  CancelRespondInput,
  ReturnRequestInput,
  ReturnRespondInput,
  ReturnShipBackInput,
  DisputeOpenInput,
  type SessionUser,
} from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { env } from "../../config/env";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly prisma: PrismaService
  ) {}

  // Throttle the heavy mutation endpoints. Per-user/IP caps stop a
  // compromised session from spamming orders or dispute storms before
  // ops notices. The numbers are deliberately generous for organic use
  // (5 checkouts / minute is a power buyer; everything else is rare).
  @Post("checkout")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(201)
  checkout(@CurrentUser() user: SessionUser, @Body(new ZodPipe(CheckoutInput)) body: CheckoutInput) {
    return this.orders.checkout(user.id, body);
  }

  /** Re-create a Snap charge for an order still in pending_payment.
   *  Used by /pesanan's "Bayar" button to resume multi-item checkout
   *  flows where the buyer paid the first order then bounced. */
  @Post(":humanId/resume-pay")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(200)
  resumePay(@CurrentUser() user: SessionUser, @Param("humanId") humanId: string) {
    return this.orders.resumePay(user.id, humanId);
  }

  @Get()
  async listMine(
    @CurrentUser() user: SessionUser,
    @Query("role") role: "buyer" | "seller" = "buyer",
    @Query("status") status?: string
  ) {
    const rows = await this.prisma.order.findMany({
      where: {
        [role === "buyer" ? "buyerId" : "sellerId"]: user.id,
        ...(status && { status: status as never }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { listing: { select: { title: true, imagesJson: true } } },
    });
    return {
      items: rows.map((o) => {
        let cover: string | null = null;
        try { const imgs = JSON.parse(o.listing.imagesJson); if (Array.isArray(imgs)) cover = imgs[0] ?? null; } catch { /* ignore */ }
        return {
          id: o.id,
          humanId: o.humanId,
          status: o.status,
          totalIdr: Number(o.totalCents / 100n),
          courier: o.courierCode,
          createdAt: o.createdAt.toISOString(),
          listing: { title: o.listing.title, cover },
        };
      }),
    };
  }

  @Get(":humanId")
  async byId(@CurrentUser() user: SessionUser, @Param("humanId") humanId: string) {
    const o = await this.prisma.order.findUnique({
      where: { humanId },
      include: {
        listing: { include: { category: { select: { name: true, slug: true } } } },
        buyer:  { select: { username: true, name: true, avatarUrl: true, city: true, trustScore: true } },
        seller: { select: { username: true, name: true, avatarUrl: true, city: true, trustScore: true } },
        address: true,
        payment: true,
        cancelRequests: { orderBy: { createdAt: "desc" } },
        returnRequests: { orderBy: { createdAt: "desc" } },
        dispute: true,
      },
    });
    if (!o || (o.buyerId !== user.id && o.sellerId !== user.id && user.role !== "admin")) {
      throw new NotFoundException({ code: "not_found", message: "Pesanan tidak ditemukan." });
    }
    let cover: string | null = null;
    try { const imgs = JSON.parse(o.listing.imagesJson); if (Array.isArray(imgs)) cover = imgs[0] ?? null; } catch { /* ignore */ }

    const activeCancel = o.cancelRequests.find((c) => c.status === "pending") ?? null;
    const activeReturn = o.returnRequests.find((r) =>
      ["requested", "approved", "shipped_back"].includes(r.status)
    ) ?? null;

    return {
      order: {
        id: o.id, humanId: o.humanId, status: o.status, qty: o.qty,
        priceIdr:        Number(o.priceCents / 100n),
        shippingIdr:     Number(o.shippingCents / 100n),
        platformFeeIdr:  Number(o.platformFeeCents / 100n),
        payFeeIdr:       Number(o.payFeeCents / 100n),
        insuranceIdr:    Number(o.insuranceCents / 100n),
        totalIdr:        Number(o.totalCents / 100n),
        courierCode: o.courierCode,
        trackingNumber: o.trackingNumber,
        createdAt:    o.createdAt.toISOString(),
        paidAt:       o.paidAt?.toISOString()      ?? null,
        shippedAt:    o.shippedAt?.toISOString()   ?? null,
        deliveredAt:  o.deliveredAt?.toISOString() ?? null,
        completedAt:  o.completedAt?.toISOString() ?? null,
        cancelledAt:  o.cancelledAt?.toISOString() ?? null,
        refundedAt:   o.refundedAt?.toISOString()  ?? null,
        autoReleaseAt: o.autoReleaseAt?.toISOString() ?? null,
        shipmentDeadlineAt: o.shipmentDeadlineAt?.toISOString() ?? null,
        listing: {
          id: o.listing.id, slug: o.listing.slug, title: o.listing.title,
          condition: o.listing.condition, cover,
          category: o.listing.category ? { name: o.listing.category.name, slug: o.listing.category.slug } : null,
        },
        buyer: o.buyer, seller: o.seller,
        address: {
          recipient: o.address.name, phone: o.address.phone,
          line1: o.address.line, line2: null as string | null,
          city: o.address.city, province: o.address.province, postalCode: o.address.postal,
        },
        payment: o.payment ? {
          method: o.payment.method ?? "bca_va",
          provider: o.payment.provider,
          vaNumber: null as string | null,
          status: o.payment.statusRaw,
        } : null,
        cancelRequest: activeCancel ? {
          id: activeCancel.id,
          reason: activeCancel.reason,
          status: activeCancel.status,
          rejectNote: activeCancel.rejectNote,
          expiresAt: activeCancel.expiresAt.toISOString(),
          createdAt: activeCancel.createdAt.toISOString(),
        } : null,
        returnRequest: activeReturn ? {
          id: activeReturn.id,
          reason: activeReturn.reason,
          description: activeReturn.description,
          evidence: safeArray(activeReturn.evidenceJson),
          status: activeReturn.status,
          rejectNote: activeReturn.rejectNote,
          returnTrackingNumber: activeReturn.returnTrackingNumber,
          returnCourierCode: activeReturn.returnCourierCode,
          responseDeadlineAt: activeReturn.responseDeadlineAt.toISOString(),
          shipBackDeadlineAt: activeReturn.shipBackDeadlineAt?.toISOString() ?? null,
          confirmDeadlineAt: activeReturn.confirmDeadlineAt?.toISOString() ?? null,
        } : null,
        dispute: o.dispute ? {
          id: o.dispute.id,
          kind: o.dispute.kind,
          status: o.dispute.status,
          decision: o.dispute.decision,
          reason: o.dispute.reason,
          description: o.dispute.description,
          evidence: safeArray(o.dispute.evidenceJson),
          adminNote: o.dispute.adminNote,
          createdAt: o.dispute.createdAt.toISOString(),
          resolvedAt: o.dispute.resolvedAt?.toISOString() ?? null,
        } : null,
      },
    };
  }

  /** Dev-only payment simulator. */
  @Post(":humanId/dev-mark-paid")
  @HttpCode(200)
  async devMarkPaid(@CurrentUser() user: SessionUser, @Param("humanId") humanId: string) {
    if (env.NODE_ENV === "production") {
      throw new ForbiddenException({ code: "disabled", message: "Endpoint dev tidak aktif di production." });
    }
    const o = await this.prisma.order.findUnique({ where: { humanId } });
    if (!o) throw new NotFoundException({ code: "not_found", message: "Pesanan tidak ditemukan." });
    if (o.buyerId !== user.id) throw new ForbiddenException({ code: "forbidden", message: "Bukan pesanan kamu." });
    if (o.status !== "pending_payment") return { ok: true, status: o.status };
    await this.orders.markPaid(o.id, `dev-${Date.now()}`, { simulator: true });
    return { ok: true, status: "paid" };
  }

  /** Seller input resi → status shipped. */
  @Post(":humanId/ship")
  @HttpCode(200)
  ship(
    @CurrentUser() user: SessionUser,
    @Param("humanId") humanId: string,
    @Body(new ZodPipe(ShipOrderInput)) body: ShipOrderInput
  ) {
    return this.orders.ship(user.id, humanId, body);
  }

  /** Buyer confirms receipt → completed. */
  @Post(":humanId/confirm-receipt")
  @HttpCode(200)
  confirmReceipt(@CurrentUser() user: SessionUser, @Param("humanId") humanId: string) {
    return this.orders.confirmReceipt(user.id, humanId, { allowFromPaid: env.NODE_ENV !== "production" });
  }

  // -------------------------------------- cancel ----------------------
  @Post(":humanId/cancel-request")
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @HttpCode(201)
  requestCancel(
    @CurrentUser() user: SessionUser,
    @Param("humanId") humanId: string,
    @Body(new ZodPipe(CancelRequestInput)) body: CancelRequestInput
  ) {
    return this.orders.createCancelRequest(user.id, humanId, body);
  }

  @Post(":humanId/cancel-respond")
  @HttpCode(200)
  respondCancel(
    @CurrentUser() user: SessionUser,
    @Param("humanId") humanId: string,
    @Body(new ZodPipe(CancelRespondInput)) body: CancelRespondInput
  ) {
    return this.orders.respondCancelRequest(user.id, humanId, body);
  }

  // -------------------------------------- return ----------------------
  @Post(":humanId/return-request")
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @HttpCode(201)
  requestReturn(
    @CurrentUser() user: SessionUser,
    @Param("humanId") humanId: string,
    @Body(new ZodPipe(ReturnRequestInput)) body: ReturnRequestInput
  ) {
    return this.orders.createReturnRequest(user.id, humanId, body);
  }

  @Post(":humanId/return-respond")
  @HttpCode(200)
  respondReturn(
    @CurrentUser() user: SessionUser,
    @Param("humanId") humanId: string,
    @Body(new ZodPipe(ReturnRespondInput)) body: ReturnRespondInput
  ) {
    return this.orders.respondReturnRequest(user.id, humanId, body);
  }

  @Post(":humanId/return-ship-back")
  @HttpCode(200)
  returnShipBack(
    @CurrentUser() user: SessionUser,
    @Param("humanId") humanId: string,
    @Body(new ZodPipe(ReturnShipBackInput)) body: ReturnShipBackInput
  ) {
    return this.orders.shipBack(user.id, humanId, body);
  }

  @Post(":humanId/return-confirm")
  @HttpCode(200)
  returnConfirm(@CurrentUser() user: SessionUser, @Param("humanId") humanId: string) {
    return this.orders.confirmReturnReceived(user.id, humanId);
  }

  // -------------------------------------- dispute ----------------------
  @Post(":humanId/dispute")
  @Throttle({ default: { ttl: 60_000, limit: 2 } })
  @HttpCode(201)
  openDispute(
    @CurrentUser() user: SessionUser,
    @Param("humanId") humanId: string,
    @Body(new ZodPipe(DisputeOpenInput)) body: DisputeOpenInput
  ) {
    return this.orders.openDispute(user.id, humanId, body);
  }

  /* ------------------------------ escrow chat ------------------------ */

  @Get(":humanId/messages")
  listMessages(@CurrentUser() user: SessionUser, @Param("humanId") humanId: string) {
    return this.orders.listMessages(user.id, humanId);
  }

  @Post(":humanId/messages")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(201)
  postMessage(
    @CurrentUser() user: SessionUser,
    @Param("humanId") humanId: string,
    @Body(new ZodPipe(z.object({
      body: z.string().trim().max(2000).default(""),
      images: z.array(z.string().min(1).max(1000)).max(4).optional(),
    }))) body: { body: string; images?: string[] }
  ) {
    return this.orders.postMessage(user.id, humanId, body.body, body.images ?? []);
  }

  @Post(":humanId/messages/read")
  @HttpCode(200)
  markRead(@CurrentUser() user: SessionUser, @Param("humanId") humanId: string) {
    return this.orders.markMessagesRead(user.id, humanId);
  }

  /** Admin posts to the order chat (intervention / clarification on
   *  a dispute). Inline role check — admin / superadmin / ops only. */
  @Post(":humanId/admin-messages")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @HttpCode(201)
  postAdminMessage(
    @CurrentUser() user: SessionUser,
    @Param("humanId") humanId: string,
    @Body(new ZodPipe(z.object({ body: z.string().trim().min(1).max(2000) }))) body: { body: string }
  ) {
    if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "ops") {
      throw new ForbiddenException({ code: "forbidden", message: "Khusus admin." });
    }
    return this.orders.postAdminMessage(user.id, humanId, body.body);
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
