import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CheckoutInput,
  ShipOrderInput,
  CancelRequestInput,
  CancelRespondInput,
  ReturnRequestInput,
  ReturnRespondInput,
  ReturnShipBackInput,
  DisputeOpenInput,
  DisputeDecideInput,
} from "@hoobiq/types";
import { env } from "../../config/env";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { PAYMENT_PROVIDER, type PaymentProvider } from "../payments/payment-provider.interface";

const CENTS_PER_RUPIAH = 100n;
const PLATFORM_FEE_BPS = 200n;
const PAY_FEE_BPS = 100n;

// Timer constants — single source of truth, also referenced by the scheduler.
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
export const TIMERS = {
  shipmentDeadline:        7 * DAY,  // PAID → still not shipped → auto-cancel + refund
  autoReleaseAfterDeliver: 3 * DAY,  // DELIVERED, buyer diam → release ke seller
  cancelResponse:         24 * HOUR, // Cancel pending, seller diam → auto-accept
  returnResponse:         48 * HOUR, // Return pending, seller diam → auto-approve
  returnShipBack:          5 * DAY,  // Return approved, buyer belum kirim → expired
  returnConfirm:           3 * DAY,  // Return shipped_back, seller diam → auto-confirm
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    @Inject(PAYMENT_PROVIDER) private readonly payment: PaymentProvider
  ) {}

  // -------------------------------------------------------------- checkout
  async checkout(buyerId: string, input: CheckoutInput) {
    const [listing, address, buyer] = await Promise.all([
      this.prisma.listing.findUnique({ where: { id: input.listingId }, include: { seller: true } }),
      this.prisma.address.findUnique({ where: { id: input.addressId } }),
      this.prisma.user.findUnique({ where: { id: buyerId } }),
    ]);

    if (!listing || listing.deletedAt || !listing.isPublished) throw new NotFoundException({ code: "not_found", message: "Listing tidak tersedia." });
    if (listing.stock < input.qty) throw new BadRequestException({ code: "out_of_stock", message: "Stok tidak cukup." });
    if (!address || address.userId !== buyerId) throw new BadRequestException({ code: "invalid_address", message: "Alamat tidak valid." });
    if (!buyer || listing.sellerId === buyerId) throw new BadRequestException({ code: "self_purchase", message: "Tidak bisa membeli listing sendiri." });

    const subtotal = listing.priceCents * BigInt(input.qty);
    // Use the quote the buyer saw at checkout (already calculated against
    // their subdistrict via Komerce). Falls back to the legacy 18k flat
    // for old clients that don't send shippingCents yet.
    const shipping = input.shippingCents > 0 ? BigInt(input.shippingCents) : 18_000n * CENTS_PER_RUPIAH;
    const platformFee = (subtotal * PLATFORM_FEE_BPS) / 10_000n;
    const payFee = (subtotal * PAY_FEE_BPS) / 10_000n;
    const insurance = input.insurance ? 15_000n * CENTS_PER_RUPIAH : 0n;
    const total = subtotal + shipping + platformFee + payFee + insurance;
    const humanId = genHumanId();

    // Two-stage so we can isolate the Midtrans network call from the
    // DB transaction: create the order row first, then fire Snap, then
    // upsert the Payment row. Avoids a long-running TX while we're
    // talking to Midtrans (which can be 1-3s and would otherwise hold
    // open Postgres locks).
    const order = await this.prisma.order.create({
      data: {
        humanId, buyerId, sellerId: listing.sellerId, listingId: listing.id, addressId: address.id,
        qty: input.qty,
        priceCents: listing.priceCents, shippingCents: shipping,
        platformFeeCents: platformFee, payFeeCents: payFee, insuranceCents: insurance,
        totalCents: total, courierCode: input.courierCode, status: "pending_payment",
      },
    });

    const webBase = (env.PUBLIC_WEB_BASE ?? "http://localhost:3000").replace(/\/$/, "");
    const charge = await this.payment.createCharge({
      orderId: order.id, humanId, amountCents: total, method: "snap",
      customer: { email: buyer.email, name: buyer.name ?? buyer.username, phone: buyer.phone ?? "" },
      items: [{ id: listing.id, name: listing.title, priceCents: listing.priceCents, qty: input.qty }],
      // Midtrans Snap bounces here after the buyer finishes (success or
      // close). The order detail page reconciles via webhook + on-mount
      // refetch so the buyer sees the right status either way.
      returnUrl: `${webBase}/checkout/sukses?o=${encodeURIComponent(humanId)}`,
    });

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "midtrans",
        providerTxId: charge.providerTxId,
        amountCents: total,
        statusRaw: charge.status,
      },
    });

    return {
      orderId: order.id, humanId: order.humanId,
      totalIdr: Number(total / CENTS_PER_RUPIAH),
      paymentRedirectUrl: charge.redirectUrl,
    };
  }

  /**
   * Re-create a Snap charge for an order that's still pending_payment.
   * Lets the buyer come back to /pesanan after a multi-item checkout
   * and finish paying any orders they haven't gotten to yet.
   *
   * Refuses for orders not in pending_payment so paid/shipped/cancelled
   * rows can't accidentally re-create charges.
   */
  async resumePay(buyerId: string, humanId: string) {
    const order = await this.prisma.order.findUnique({
      where: { humanId },
      include: { listing: true, buyer: true },
    });
    if (!order) throw new NotFoundException({ code: "not_found", message: "Pesanan tidak ditemukan." });
    if (order.buyerId !== buyerId) throw new ForbiddenException({ code: "forbidden", message: "Bukan pesanan kamu." });
    if (order.status !== "pending_payment") {
      throw new BadRequestException({ code: "invalid_status", message: "Pesanan ini sudah tidak menunggu pembayaran." });
    }

    const webBase = (env.PUBLIC_WEB_BASE ?? "http://localhost:3000").replace(/\/$/, "");
    const charge = await this.payment.createCharge({
      orderId: order.id,
      humanId: order.humanId,
      amountCents: order.totalCents,
      method: "snap",
      customer: {
        email: order.buyer.email,
        name: order.buyer.name ?? order.buyer.username,
        phone: order.buyer.phone ?? "",
      },
      items: [{
        id: order.listing.id,
        name: order.listing.title,
        priceCents: order.priceCents,
        qty: order.qty,
      }],
      returnUrl: `${webBase}/checkout/sukses?o=${encodeURIComponent(order.humanId)}`,
    });

    // Replace the existing Payment row's tx id + status so the
    // webhook reconciler matches the latest Snap session, not a
    // stale one from the original checkout.
    await this.prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        provider: "midtrans",
        providerTxId: charge.providerTxId,
        amountCents: order.totalCents,
        statusRaw: charge.status,
      },
      update: {
        providerTxId: charge.providerTxId,
        statusRaw: charge.status,
      },
    });

    return {
      humanId: order.humanId,
      totalIdr: Number(order.totalCents / CENTS_PER_RUPIAH),
      paymentRedirectUrl: charge.redirectUrl,
    };
  }

  /** Called by the Midtrans webhook handler after signature verification. */
  async markPaid(orderId: string, providerTxId: string, rawPayload: unknown) {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { orderId },
        data: { statusRaw: "paid", paidAt: now, payloadJson: JSON.stringify(rawPayload ?? {}), providerTxId },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: "paid",
          paidAt: now,
          // 7 hari belum kirim → auto cancel + refund
          shipmentDeadlineAt: new Date(now.getTime() + TIMERS.shipmentDeadline),
        },
      }),
    ]);
    const o = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (o) {
      await this.notify(o.buyerId, "order_paid", "Pembayaran diterima", "Pesanan kamu masuk ke seller.", { humanId: o.humanId }, { important: true });
      await this.notify(o.sellerId, "order_paid", "Pesanan baru — sudah dibayar", "Segera kirim dalam 7 hari.", { humanId: o.humanId }, { important: true });
    }
  }

  // ----------------------------------------------------------------- ship
  async ship(sellerId: string, humanId: string, input: ShipOrderInput) {
    const o = await this.prisma.order.findUnique({ where: { humanId } });
    if (!o) throw new NotFoundException({ code: "not_found", message: "Pesanan tidak ditemukan." });
    if (o.sellerId !== sellerId) throw new ForbiddenException({ code: "forbidden", message: "Bukan pesanan kamu." });
    if (o.status !== "paid") {
      throw new BadRequestException({ code: "invalid_status", message: "Order harus berstatus paid untuk dikirim." });
    }
    // Block ship kalau ada cancel request pending — seller harus respond dulu.
    const pendingCancel = await this.prisma.cancelRequest.findFirst({
      where: { orderId: o.id, status: "pending" },
    });
    if (pendingCancel) {
      throw new BadRequestException({ code: "cancel_pending", message: "Selesaikan request pembatalan dulu sebelum kirim." });
    }

    const now = new Date();
    await this.prisma.order.update({
      where: { id: o.id },
      data: {
        status: "shipped",
        trackingNumber: input.trackingNumber,
        shippedAt: now,
        shipmentDeadlineAt: null,
        // Set autoReleaseAt sekarang juga sebagai fallback (3 hari setelah shipped),
        // akan di-overwrite waktu Komerce push delivered event.
        autoReleaseAt: new Date(now.getTime() + TIMERS.autoReleaseAfterDeliver),
      },
    });
    await this.notify(o.buyerId, "order_shipped", "Pesanan dikirim", `Resi: ${input.trackingNumber}`, { humanId }, { important: true });
    return { ok: true, status: "shipped", trackingNumber: input.trackingNumber };
  }

  // ----------------------------------------------------------- buyer flow
  async confirmReceipt(buyerId: string, humanId: string, opts: { allowFromPaid: boolean }) {
    const o = await this.prisma.order.findUnique({ where: { humanId } });
    if (!o) throw new NotFoundException({ code: "not_found", message: "Pesanan tidak ditemukan." });
    if (o.buyerId !== buyerId) throw new ForbiddenException({ code: "forbidden", message: "Hanya pembeli yang bisa konfirmasi." });
    if (o.status === "completed") return { ok: true, status: o.status };

    const allowed = opts.allowFromPaid ? ["paid", "shipped", "delivered"] : ["shipped", "delivered"];
    if (!allowed.includes(o.status)) {
      throw new BadRequestException({ code: "invalid_status", message: "Pesanan belum bisa dikonfirmasi diterima." });
    }
    const now = new Date();
    await this.prisma.order.update({
      where: { id: o.id },
      data: {
        status: "completed",
        deliveredAt: o.deliveredAt ?? now,
        completedAt: now,
        autoReleaseAt: null,
      },
    });
    await this.notify(o.sellerId, "order_completed", "Pesanan selesai", "Dana sudah dilepas ke saldo kamu.", { humanId }, { important: true });
    return { ok: true, status: "completed" };
  }

  // ------------------------------------------------------------- cancel
  async createCancelRequest(buyerId: string, humanId: string, input: CancelRequestInput) {
    const o = await this.prisma.order.findUnique({ where: { humanId } });
    if (!o) throw new NotFoundException({ code: "not_found", message: "Pesanan tidak ditemukan." });
    if (o.buyerId !== buyerId) throw new ForbiddenException({ code: "forbidden", message: "Bukan pesanan kamu." });
    // Boleh request cancel hanya selama belum SHIPPED (resi belum diinput).
    if (!["pending_payment", "paid"].includes(o.status)) {
      throw new BadRequestException({ code: "invalid_status", message: "Pesanan tidak bisa dibatalkan pada status ini." });
    }
    const existing = await this.prisma.cancelRequest.findFirst({
      where: { orderId: o.id, status: "pending" },
    });
    if (existing) {
      throw new BadRequestException({ code: "already_pending", message: "Sudah ada request pembatalan menunggu respon." });
    }

    const cr = await this.prisma.cancelRequest.create({
      data: {
        orderId: o.id, buyerId, reason: input.reason,
        expiresAt: new Date(Date.now() + TIMERS.cancelResponse),
      },
    });
    await this.notify(o.sellerId, "cancel_requested", "Pembeli minta pembatalan", input.reason, { humanId });
    return { ok: true, cancelRequestId: cr.id, expiresAt: cr.expiresAt.toISOString() };
  }

  async respondCancelRequest(sellerId: string, humanId: string, input: CancelRespondInput) {
    const o = await this.prisma.order.findUnique({ where: { humanId } });
    if (!o) throw new NotFoundException({ code: "not_found", message: "Pesanan tidak ditemukan." });
    if (o.sellerId !== sellerId) throw new ForbiddenException({ code: "forbidden", message: "Bukan pesanan kamu." });

    const cr = await this.prisma.cancelRequest.findFirst({
      where: { orderId: o.id, status: "pending" },
      orderBy: { createdAt: "desc" },
    });
    if (!cr) throw new NotFoundException({ code: "not_found", message: "Tidak ada request pembatalan aktif." });
    if (input.decision === "reject" && !input.rejectNote) {
      throw new BadRequestException({ code: "missing_note", message: "Wajib isi alasan penolakan." });
    }

    if (input.decision === "accept") {
      await this.acceptCancel(o.id, cr.id, "seller_accepted");
      await this.notify(o.buyerId, "cancel_accepted", "Pembatalan disetujui", "Dana akan direfund.", { humanId }, { important: true });
      return { ok: true, status: "cancelled" };
    } else {
      await this.prisma.cancelRequest.update({
        where: { id: cr.id },
        data: { status: "rejected", rejectNote: input.rejectNote, respondedAt: new Date() },
      });
      await this.notify(o.buyerId, "cancel_rejected", "Pembatalan ditolak", input.rejectNote ?? "", { humanId });
      return { ok: true, status: "rejected" };
    }
  }

  /**
   * Accepts a cancel request and refunds the buyer. Used by both seller manual
   * accept and the scheduler's auto-accept after the 24-hour timeout.
   */
  async acceptCancel(orderId: string, cancelRequestId: string, finalStatus: "seller_accepted" | "auto_accepted") {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.cancelRequest.update({
        where: { id: cancelRequestId },
        data: { status: finalStatus === "auto_accepted" ? "auto_accepted" : "accepted", respondedAt: now },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: "cancelled",
          cancelledAt: now,
          refundedAt: now,
          shipmentDeadlineAt: null,
          autoReleaseAt: null,
        },
      }),
    ]);
    // Fire the actual refund at the payment provider. Failure here is
    // logged but doesn't roll back the cancel — ops still has the
    // refundedAt timestamp + provider tx id to manually reconcile if
    // the provider's refund endpoint is flaky. Same shape used by
    // returnComplete() and the scheduler's auto-cancel path.
    await this.tryRefund(orderId, "cancel");
  }

  // ------------------------------------------------------------- return
  async createReturnRequest(buyerId: string, humanId: string, input: ReturnRequestInput) {
    const o = await this.prisma.order.findUnique({ where: { humanId } });
    if (!o) throw new NotFoundException({ code: "not_found", message: "Pesanan tidak ditemukan." });
    if (o.buyerId !== buyerId) throw new ForbiddenException({ code: "forbidden", message: "Bukan pesanan kamu." });
    // Retur hanya boleh setelah barang sampai. Untuk dev (paid → received shortcut)
    // kita izinkan dari `delivered` saja agar konsisten dengan flow real.
    if (!["delivered", "shipped"].includes(o.status)) {
      throw new BadRequestException({ code: "invalid_status", message: "Retur hanya bisa diajukan setelah barang dikirim/diterima." });
    }
    const existing = await this.prisma.returnRequest.findFirst({
      where: { orderId: o.id, status: { in: ["requested", "approved", "shipped_back"] } },
    });
    if (existing) {
      throw new BadRequestException({ code: "already_open", message: "Sudah ada proses retur aktif." });
    }

    const rr = await this.prisma.returnRequest.create({
      data: {
        orderId: o.id, buyerId,
        reason: input.reason, description: input.description,
        evidenceJson: JSON.stringify(input.evidence),
        responseDeadlineAt: new Date(Date.now() + TIMERS.returnResponse),
      },
    });
    await this.prisma.order.update({ where: { id: o.id }, data: { status: "returning", autoReleaseAt: null } });
    await this.notify(o.sellerId, "return_requested", "Pembeli ajukan retur", input.reason, { humanId });
    return { ok: true, returnRequestId: rr.id };
  }

  async respondReturnRequest(sellerId: string, humanId: string, input: ReturnRespondInput) {
    const o = await this.prisma.order.findUnique({ where: { humanId } });
    if (!o) throw new NotFoundException({ code: "not_found", message: "Pesanan tidak ditemukan." });
    if (o.sellerId !== sellerId) throw new ForbiddenException({ code: "forbidden", message: "Bukan pesanan kamu." });

    const rr = await this.prisma.returnRequest.findFirst({
      where: { orderId: o.id, status: "requested" },
      orderBy: { createdAt: "desc" },
    });
    if (!rr) throw new NotFoundException({ code: "not_found", message: "Tidak ada retur aktif." });
    if (input.decision === "reject" && !input.rejectNote) {
      throw new BadRequestException({ code: "missing_note", message: "Wajib isi alasan penolakan." });
    }

    if (input.decision === "approve") {
      await this.approveReturn(rr.id, "seller_approved");
      await this.notify(o.buyerId, "return_approved", "Retur disetujui", "Silakan kirim barang kembali (max 5 hari).", { humanId }, { important: true });
      return { ok: true, status: "approved" };
    } else {
      // Tolak retur → buka dispute otomatis, biar admin yang putuskan.
      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.returnRequest.update({
          where: { id: rr.id },
          data: { status: "rejected", rejectNote: input.rejectNote, resolvedAt: now },
        }),
        this.prisma.dispute.upsert({
          where: { orderId: o.id },
          update: { status: "new", kind: "return_rejected" },
          create: {
            orderId: o.id, buyerId: o.buyerId, sellerId: o.sellerId,
            kind: "return_rejected",
            reason: "Seller menolak retur",
            description: rr.description,
            evidenceJson: rr.evidenceJson,
          },
        }),
        this.prisma.order.update({ where: { id: o.id }, data: { status: "disputed" } }),
      ]);
      await this.notify(o.buyerId, "return_rejected", "Retur ditolak — masuk dispute admin", input.rejectNote ?? "", { humanId }, { important: true });
      return { ok: true, status: "rejected_to_dispute" };
    }
  }

  /** Mark return approved + start the 5-day ship-back countdown. */
  async approveReturn(returnRequestId: string, by: "seller_approved" | "auto_approved") {
    const now = new Date();
    await this.prisma.returnRequest.update({
      where: { id: returnRequestId },
      data: {
        status: "approved",
        approvedAt: now,
        shipBackDeadlineAt: new Date(now.getTime() + TIMERS.returnShipBack),
        rejectNote: by === "auto_approved" ? "Auto-approved (seller diam 48 jam)" : null,
      },
    });
  }

  async shipBack(buyerId: string, humanId: string, input: ReturnShipBackInput) {
    const o = await this.prisma.order.findUnique({ where: { humanId } });
    if (!o) throw new NotFoundException({ code: "not_found", message: "Pesanan tidak ditemukan." });
    if (o.buyerId !== buyerId) throw new ForbiddenException({ code: "forbidden", message: "Bukan pesanan kamu." });
    const rr = await this.prisma.returnRequest.findFirst({
      where: { orderId: o.id, status: "approved" },
      orderBy: { createdAt: "desc" },
    });
    if (!rr) throw new BadRequestException({ code: "not_approved", message: "Retur belum di-approve atau sudah lewat batas." });

    const now = new Date();
    await this.prisma.returnRequest.update({
      where: { id: rr.id },
      data: {
        status: "shipped_back",
        returnTrackingNumber: input.trackingNumber,
        returnCourierCode: input.courierCode,
        shippedBackAt: now,
        shipBackDeadlineAt: null,
        confirmDeadlineAt: new Date(now.getTime() + TIMERS.returnConfirm),
      },
    });
    await this.notify(o.sellerId, "return_shipped_back", "Buyer kirim barang balik", `Resi: ${input.trackingNumber}`, { humanId });
    return { ok: true };
  }

  async confirmReturnReceived(sellerId: string, humanId: string) {
    const o = await this.prisma.order.findUnique({ where: { humanId } });
    if (!o) throw new NotFoundException({ code: "not_found", message: "Pesanan tidak ditemukan." });
    if (o.sellerId !== sellerId) throw new ForbiddenException({ code: "forbidden", message: "Bukan pesanan kamu." });
    const rr = await this.prisma.returnRequest.findFirst({
      where: { orderId: o.id, status: "shipped_back" },
      orderBy: { createdAt: "desc" },
    });
    if (!rr) throw new NotFoundException({ code: "not_found", message: "Tidak ada retur yang sedang dikirim balik." });
    await this.completeReturn(rr.id, "seller_confirmed");
    await this.notify(o.buyerId, "return_completed", "Retur selesai", "Dana refund diproses.", { humanId }, { important: true });
    return { ok: true };
  }

  async completeReturn(returnRequestId: string, by: "seller_confirmed" | "auto_confirmed") {
    const rr = await this.prisma.returnRequest.findUnique({ where: { id: returnRequestId } });
    if (!rr) return;
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.returnRequest.update({
        where: { id: rr.id },
        data: {
          status: "completed",
          resolvedAt: now,
          rejectNote: by === "auto_confirmed" ? "Auto-confirmed (seller diam 3 hari)" : null,
          confirmDeadlineAt: null,
        },
      }),
      this.prisma.order.update({
        where: { id: rr.orderId },
        data: { status: "refunded", refundedAt: now },
      }),
    ]);
    await this.tryRefund(rr.orderId, "return");
  }

  /** Buyer fails to ship back within 5 days — return expires, transaction continues. */
  async expireReturn(returnRequestId: string) {
    const rr = await this.prisma.returnRequest.findUnique({ where: { id: returnRequestId } });
    if (!rr) return;
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.returnRequest.update({
        where: { id: rr.id },
        data: { status: "expired", resolvedAt: now, shipBackDeadlineAt: null },
      }),
      // Transaksi lanjut: kembali ke delivered → buyer wajib terima.
      this.prisma.order.update({
        where: { id: rr.orderId },
        data: {
          status: "delivered",
          // restart 3-day auto-release timer dari sekarang.
          autoReleaseAt: new Date(now.getTime() + TIMERS.autoReleaseAfterDeliver),
        },
      }),
    ]);
  }

  // ----------------------------------------------------- auto-cancel jobs
  /** Order paid 7 hari, belum SHIPPED → auto-cancel + refund. */
  async autoCancelNoShipment(orderId: string) {
    const now = new Date();
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: "cancelled",
        cancelledAt: now,
        refundedAt: now,
        shipmentDeadlineAt: null,
      },
    });
    await this.tryRefund(orderId, "auto_cancel");
    const o = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (o) {
      await this.notify(o.buyerId, "order_auto_cancelled", "Pesanan dibatalkan otomatis", "Seller tidak mengirim dalam 7 hari. Dana direfund.", { humanId: o.humanId }, { important: true });
      await this.notify(o.sellerId, "order_auto_cancelled", "Pesanan dibatalkan otomatis", "Kamu tidak mengirim dalam 7 hari.", { humanId: o.humanId }, { important: true });
    }
  }

  /** DELIVERED + 3 hari, buyer tidak konfirmasi → auto-release ke seller. */
  async autoReleaseEscrow(orderId: string) {
    const now = new Date();
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: "completed", completedAt: now, autoReleaseAt: null },
    });
    const o = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (o) {
      await this.notify(o.sellerId, "order_auto_released", "Dana dilepas otomatis", "Buyer tidak konfirmasi dalam 3 hari.", { humanId: o.humanId }, { important: true });
    }
  }

  // ----------------------------------------------------------- dispute
  async openDispute(userId: string, humanId: string, input: DisputeOpenInput) {
    const o = await this.prisma.order.findUnique({ where: { humanId } });
    if (!o) throw new NotFoundException({ code: "not_found", message: "Pesanan tidak ditemukan." });
    if (o.buyerId !== userId && o.sellerId !== userId) {
      throw new ForbiddenException({ code: "forbidden", message: "Bukan pesanan kamu." });
    }
    // Dispute boleh dibuka kalau order sudah PAID (ada uang yang dipertaruhkan).
    if (["pending_payment", "cancelled", "refunded", "completed"].includes(o.status)) {
      throw new BadRequestException({ code: "invalid_status", message: "Dispute tidak tersedia pada status ini." });
    }

    const d = await this.prisma.dispute.upsert({
      where: { orderId: o.id },
      update: {
        kind: input.kind, reason: input.reason, description: input.description,
        evidenceJson: JSON.stringify(input.evidence), status: "new",
      },
      create: {
        orderId: o.id, buyerId: o.buyerId, sellerId: o.sellerId,
        kind: input.kind, reason: input.reason, description: input.description,
        evidenceJson: JSON.stringify(input.evidence),
      },
    });
    await this.prisma.order.update({ where: { id: o.id }, data: { status: "disputed" } });
    return { ok: true, disputeId: d.id };
  }

  async adminDecideDispute(adminId: string, disputeId: string, input: DisputeDecideInput) {
    const d = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!d) throw new NotFoundException({ code: "not_found", message: "Dispute tidak ditemukan." });
    const now = new Date();

    // Apply decision to the order.
    const orderUpdate =
      input.decision === "release_seller"
        ? { status: "completed" as const, completedAt: now }
        : { status: "refunded" as const, refundedAt: now };

    await this.prisma.$transaction([
      this.prisma.dispute.update({
        where: { id: d.id },
        data: {
          status: "resolved",
          decision: input.decision,
          adminNote: input.adminNote,
          resolvedAt: now,
        },
      }),
      this.prisma.order.update({ where: { id: d.orderId }, data: orderUpdate }),
      this.prisma.auditEntry.create({
        data: {
          actorId: adminId,
          action: "dispute.decide",
          targetRef: `dispute:${d.id}`,
          metaJson: JSON.stringify({ decision: input.decision, orderId: d.orderId }),
        },
      }),
    ]);
    await this.notify(d.buyerId, "dispute_resolved", "Keputusan dispute", labelDecision(input.decision), { humanId: null }, { important: true });
    await this.notify(d.sellerId, "dispute_resolved", "Keputusan dispute", labelDecision(input.decision), { humanId: null }, { important: true });
    if (input.decision !== "release_seller") {
      await this.tryRefund(d.orderId, "dispute");
    }
    return { ok: true, decision: input.decision };
  }

  // ------------------------------------------------------------- helper
  /**
   * Persist an in-app notification, and ONLY fire a transactional email
   * when `important` is true. Resend free tier is ~3k/month so we save
   * the email quota for milestone events (paid, shipped, refunded,
   * dispute resolved). In-app notifications still fire every time.
   */
  private async notify(
    userId: string, kind: string, title: string, body: string,
    data: Record<string, unknown>,
    opts: { important?: boolean } = {},
  ) {
    await this.prisma.notification.create({
      data: { userId, kind, title, body, dataJson: JSON.stringify(data) },
    }).catch(() => { /* notif best-effort */ });

    if (!opts.important) return;

    // Pull the email + name once. Skip email if the user has no email
    // (shouldn't happen but defensive).
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, username: true },
    }).catch(() => null);
    if (!u?.email) return;

    const name = u.name ?? u.username;
    const humanId = typeof data.humanId === "string" ? data.humanId : null;
    const cta = humanId
      ? `<p style="margin:24px 0"><a href="${escapeHtml((env.PUBLIC_WEB_BASE ?? "https://hoobiq.com").replace(/\/$/, ""))}/pesanan/${encodeURIComponent(humanId)}" style="display:inline-block;background:#E7559F;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Lihat detail pesanan</a></p>`
      : "";
    const html = `
      <div style="font-family:'Nunito',Arial,sans-serif;color:#0F172A;max-width:560px;margin:0 auto;padding:24px">
        <h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(title)}</h1>
        <p style="font-size:14px;line-height:1.6;color:#475569">Halo ${escapeHtml(name)},</p>
        <p style="font-size:14px;line-height:1.6;color:#0F172A">${escapeHtml(body)}</p>
        ${cta}
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0" />
        <p style="font-size:12px;color:#94A3B8">Email otomatis dari Hoobiq — jangan balas ke alamat ini. Butuh bantuan? <a href="mailto:bantuan@hoobiq.id" style="color:#E7559F">bantuan@hoobiq.id</a></p>
      </div>`;
    await this.email.send(u.email, `[Hoobiq] ${title}`, html);
  }

  /**
   * Best-effort refund at the payment provider. Pulls the saved
   * provider tx id off the Payment row and calls
   * paymentProvider.refund() with the order's total. Failures are
   * logged + a refund_failed notification is sent so ops can manually
   * reconcile — we never roll back the order's refunded state because
   * the buyer-facing UX needs to show "refund initiated" as soon as
   * the operational side has decided the order is over.
   *
   * `reason` is just a tag for the audit log so we know which path
   * (cancel / return / auto / dispute) triggered the refund.
   */
  private async tryRefund(orderId: string, reason: "cancel" | "return" | "auto_cancel" | "dispute") {
    const [order, payment] = await Promise.all([
      this.prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, humanId: true, totalCents: true, buyerId: true },
      }),
      this.prisma.payment.findUnique({
        where: { orderId },
        select: { providerTxId: true, provider: true },
      }),
    ]);
    if (!order) return;
    // Audit the refund attempt regardless of outcome.
    await this.prisma.auditEntry.create({
      data: {
        actorId: null,
        action: `order.refund.${reason}`,
        targetRef: `order:${order.humanId}`,
        metaJson: JSON.stringify({
          orderId: order.id,
          totalCents: String(order.totalCents),
          provider: payment?.provider ?? "unknown",
          providerTxId: payment?.providerTxId ?? null,
        }),
      },
    }).catch(() => undefined);

    if (!payment?.providerTxId) {
      // Order was probably never charged (legacy / dev seed). Mark refund
      // as completed without provider call.
      return;
    }
    try {
      await this.payment.refund(payment.providerTxId, BigInt(order.totalCents));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Notify ops via audit + buyer notification so the failure is
      // visible. Buyer's order still shows refunded; operational side
      // has to manually reconcile via the provider dashboard.
      await this.prisma.auditEntry.create({
        data: {
          actorId: null,
          action: `order.refund.failed`,
          targetRef: `order:${order.humanId}`,
          metaJson: JSON.stringify({ reason, error: msg, providerTxId: payment.providerTxId }),
        },
      }).catch(() => undefined);
      await this.notify(order.buyerId, "refund_failed", "Refund tertunda",
        "Refund kamu sedang diproses manual oleh tim Hoobiq. Mohon ditunggu.",
        { humanId: order.humanId, reason }, { important: true });
    }
  }
}

function genHumanId() {
  const y = new Date().getFullYear();
  const n = String(Math.floor(Math.random() * 99_999_999)).padStart(8, "0");
  return `HBQ-${y}-${n}`;
}

function labelDecision(d: DisputeDecideInput["decision"]) {
  switch (d) {
    case "refund_buyer_no_return":   return "Refund ke buyer, barang tidak dikirim balik.";
    case "refund_buyer_with_return": return "Refund ke buyer, barang dikirim balik ke seller.";
    case "release_seller":           return "Dana tetap ke seller, retur ditolak.";
  }
}

/** Minimal HTML escaper for user-derived strings in email templates. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
