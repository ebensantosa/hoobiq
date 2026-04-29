import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { OrdersService } from "./orders.service";

/**
 * Periodic worker that drives all timer-based order transitions:
 *
 *  - PAID + 7 hari, belum SHIPPED          → auto-cancel + refund
 *  - DELIVERED + 3 hari, buyer diam        → auto-release ke seller
 *  - Cancel pending + 24 jam, seller diam  → auto-accept cancel + refund
 *  - Return requested + 48 jam, seller diam → auto-approve return
 *  - Return approved + 5 hari, buyer belum kirim → expire return
 *  - Return shipped_back + 3 hari, seller diam   → auto-confirm + refund
 *
 * Design: simple `setInterval` loop. Tidak pakai BullMQ/Redis queue dulu
 * karena scope local-dev. Aman di-restart (idempotent — semua transisi
 * pakai status check sebelum update). Frequency: setiap 5 menit.
 */
@Injectable()
export class OrdersScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("OrdersScheduler");
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  onModuleInit() {
    // First sweep after 30s so app boots cleanly, then every 5 min.
    setTimeout(() => this.tick().catch(() => {}), 30_000);
    this.timer = setInterval(() => this.tick().catch(() => {}), 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** One sweep pass — exposed so tests/admin can trigger manually if needed. */
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await Promise.allSettled([
        this.sweepShipmentDeadline(),
        this.sweepAutoRelease(),
        this.sweepCancelTimeout(),
        this.sweepReturnAutoApprove(),
        this.sweepReturnShipBackExpired(),
        this.sweepReturnAutoConfirm(),
        this.sweepStalledPayment(),
      ]);
    } finally {
      this.running = false;
    }
  }

  private async sweepShipmentDeadline() {
    const now = new Date();
    const due = await this.prisma.order.findMany({
      where: { status: "paid", shipmentDeadlineAt: { lte: now } },
      select: { id: true, humanId: true },
      take: 100,
    });
    for (const o of due) {
      try { await this.orders.autoCancelNoShipment(o.id); }
      catch (e) { this.log.error(`autoCancelNoShipment failed ${o.humanId}: ${(e as Error).message}`); }
    }
    if (due.length) this.log.log(`Auto-cancelled ${due.length} unshipped orders`);
  }

  private async sweepAutoRelease() {
    const now = new Date();
    const due = await this.prisma.order.findMany({
      where: { status: { in: ["delivered", "shipped"] }, autoReleaseAt: { lte: now } },
      select: { id: true, humanId: true },
      take: 100,
    });
    for (const o of due) {
      try { await this.orders.autoReleaseEscrow(o.id); }
      catch (e) { this.log.error(`autoReleaseEscrow failed ${o.humanId}: ${(e as Error).message}`); }
    }
    if (due.length) this.log.log(`Auto-released ${due.length} orders`);
  }

  private async sweepCancelTimeout() {
    const now = new Date();
    const due = await this.prisma.cancelRequest.findMany({
      where: { status: "pending", expiresAt: { lte: now } },
      select: { id: true, orderId: true },
      take: 100,
    });
    for (const cr of due) {
      try { await this.orders.acceptCancel(cr.orderId, cr.id, "auto_accepted"); }
      catch (e) { this.log.error(`acceptCancel auto failed ${cr.id}: ${(e as Error).message}`); }
    }
    if (due.length) this.log.log(`Auto-accepted ${due.length} cancel requests`);
  }

  private async sweepReturnAutoApprove() {
    const now = new Date();
    const due = await this.prisma.returnRequest.findMany({
      where: { status: "requested", responseDeadlineAt: { lte: now } },
      select: { id: true },
      take: 100,
    });
    for (const rr of due) {
      try { await this.orders.approveReturn(rr.id, "auto_approved"); }
      catch (e) { this.log.error(`approveReturn auto failed ${rr.id}: ${(e as Error).message}`); }
    }
    if (due.length) this.log.log(`Auto-approved ${due.length} returns`);
  }

  private async sweepReturnShipBackExpired() {
    const now = new Date();
    const due = await this.prisma.returnRequest.findMany({
      where: { status: "approved", shipBackDeadlineAt: { lte: now } },
      select: { id: true },
      take: 100,
    });
    for (const rr of due) {
      try { await this.orders.expireReturn(rr.id); }
      catch (e) { this.log.error(`expireReturn failed ${rr.id}: ${(e as Error).message}`); }
    }
    if (due.length) this.log.log(`Expired ${due.length} returns (buyer didn't ship back)`);
  }

  private async sweepReturnAutoConfirm() {
    const now = new Date();
    const due = await this.prisma.returnRequest.findMany({
      where: { status: "shipped_back", confirmDeadlineAt: { lte: now } },
      select: { id: true },
      take: 100,
    });
    for (const rr of due) {
      try { await this.orders.completeReturn(rr.id, "auto_confirmed"); }
      catch (e) { this.log.error(`completeReturn auto failed ${rr.id}: ${(e as Error).message}`); }
    }
    if (due.length) this.log.log(`Auto-confirmed ${due.length} returns`);
  }

  /**
   * Orders stuck in pending_payment longer than 24 hours are auto-expired.
   * Komerce / Midtrans VAs already expire on their side after 24h, so the
   * order can never become paid past that window — leaving the row in
   * pending_payment forever just clutters the buyer's /pesanan list and
   * keeps stock reserved that we can never collect on.
   *
   * Pure DB transition (no provider call needed since the charge has
   * already expired upstream). The audit row gives ops a clean record.
   */
  private async sweepStalledPayment() {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
    const due = await this.prisma.order.findMany({
      where: { status: "pending_payment", createdAt: { lte: cutoff } },
      select: { id: true, humanId: true, buyerId: true },
      take: 200,
    });
    for (const o of due) {
      try {
        const now = new Date();
        await this.prisma.$transaction([
          this.prisma.order.update({
            where: { id: o.id },
            data: { status: "expired", cancelledAt: now },
          }),
          this.prisma.auditEntry.create({
            data: {
              actorId: null,
              action: "order.payment_expired",
              targetRef: `order:${o.humanId}`,
              metaJson: JSON.stringify({ reason: "no_payment_24h" }),
            },
          }),
        ]);
      } catch (e) {
        this.log.error(`sweepStalledPayment failed ${o.humanId}: ${(e as Error).message}`);
      }
    }
    if (due.length) this.log.log(`Expired ${due.length} unpaid orders past the 24h window`);
  }
}
