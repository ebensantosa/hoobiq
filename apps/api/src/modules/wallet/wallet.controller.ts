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
    // Money in escrow = orders where seller is me, status in [paid, shipped]
    const escrow = await this.prisma.order.aggregate({
      _sum: { totalCents: true },
      where: { sellerId: user.id, status: { in: ["paid", "shipped"] } },
    });

    // Available = completed orders minus already-paid-out (we don't track
    // payouts yet, so completed total ≈ available for MVP).
    const completed = await this.prisma.order.aggregate({
      _sum: { totalCents: true },
      where: { sellerId: user.id, status: "completed" },
    });

    const recentTx = await this.prisma.order.findMany({
      where: { OR: [{ sellerId: user.id }, { buyerId: user.id }] },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true, humanId: true, status: true, totalCents: true,
        sellerId: true, buyerId: true, createdAt: true, updatedAt: true,
      },
    });

    return {
      availableIdr: Number((completed._sum.totalCents ?? 0n) / 100n),
      escrowIdr:    Number((escrow._sum.totalCents ?? 0n) / 100n),
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
