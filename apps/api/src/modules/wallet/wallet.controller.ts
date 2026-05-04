import { Controller, Get } from "@nestjs/common";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

/**
 * Wallet endpoints — derived from orders/payments. The "real" wallet ledger
 * (separate table for top-ups, fees, refunds) lands in a follow-up; for now
 * we compute balances on the fly so the dashboard shows real numbers.
 */
@Controller("wallet")
export class WalletController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async balance(@CurrentUser() user: SessionUser) {
    // Seller-net per order = subtotal (priceCents * qty) − sellerFee (5%).
    // Shipping, buyer fee, payment fee, and insurance never flow to seller.
    const [escrowOrders, completedOrders, payoutOut, recentTx] = await Promise.all([
      this.prisma.order.findMany({
        where: { sellerId: user.id, status: { in: ["paid", "shipped"] } },
        select: { priceCents: true, qty: true, sellerFeeCents: true },
      }),
      this.prisma.order.findMany({
        where: { sellerId: user.id, status: "completed" },
        select: { priceCents: true, qty: true, sellerFeeCents: true },
      }),
      this.prisma.payoutRequest.aggregate({
        _sum: { amountCents: true },
        where: { userId: user.id, status: { in: ["pending", "approved", "paid"] } },
      }),
      this.prisma.order.findMany({
        where: { OR: [{ sellerId: user.id }, { buyerId: user.id }] },
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: {
          id: true, humanId: true, status: true, totalCents: true,
          sellerId: true, buyerId: true, createdAt: true, updatedAt: true,
        },
      }),
    ]);

    const sumNet = (rows: Array<{ priceCents: bigint; qty: number; sellerFeeCents: bigint }>) =>
      rows.reduce((acc, o) => acc + (o.priceCents * BigInt(o.qty) - o.sellerFeeCents), 0n);

    const escrow = sumNet(escrowOrders);
    const earned = sumNet(completedOrders);
    const available = earned - (payoutOut._sum.amountCents ?? 0n);

    return {
      availableIdr: Number((available > 0n ? available : 0n) / 100n),
      escrowIdr:    Number(escrow / 100n),
      recent: recentTx.map((t) => ({
        id: t.humanId,
        kind: t.sellerId === user.id ? ("in" as const) : ("out" as const),
        status: t.status,
        amountIdr: Number(t.totalCents / 100n),
        date: t.updatedAt.toISOString(),
      })),
    };
  }
}
