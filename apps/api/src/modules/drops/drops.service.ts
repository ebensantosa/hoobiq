import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

const REMIND_LEAD_MS = 60 * 60 * 1000; // 1 hour
const SCHEDULER_TICK_MS = 60_000;

const CENTS_PER_RUPIAH = 100n;

export type DropSummary = {
  id: string;
  slug: string;
  productName: string;
  brand: string;
  heroImageUrl: string | null;
  supplyQty: number;
  priceIdr: number | null;
  dropsAt: string;
  endsAt: string | null;
  status: "scheduled" | "live" | "sold_out" | "cancelled";
  reminded: boolean;
};

export type DropDetail = DropSummary & {
  description: string | null;
  listingSlug: string | null;
};

@Injectable()
export class DropsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(DropsService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /* -------- scheduler: dispatch reminders 1h before drop ------------ */

  onModuleInit() {
    this.timer = setInterval(() => {
      this.dispatchDueReminders().catch((err) => {
        this.log.warn(`reminder dispatch failed: ${(err as Error).message}`);
      });
    }, SCHEDULER_TICK_MS);
    if (this.timer.unref) this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Picks reminders whose `notifyAt` is in the past and `sentAt` is null,
   * writes a Notification row per user, marks them sent. Capped per tick
   * to avoid a stampede when many drops share a 1h boundary.
   */
  private async dispatchDueReminders(): Promise<void> {
    const due = await this.prisma.dropReminder.findMany({
      where: { sentAt: null, notifyAt: { lte: new Date() } },
      include: { drop: true },
      take: 200,
    });
    if (due.length === 0) return;

    const now = new Date();
    for (const r of due) {
      if (r.drop.status === "cancelled") {
        await this.prisma.dropReminder.update({ where: { id: r.id }, data: { sentAt: now } });
        continue;
      }
      const minutesLeft = Math.max(1, Math.round((r.drop.dropsAt.getTime() - now.getTime()) / 60_000));
      try {
        await this.prisma.$transaction([
          this.prisma.notification.create({
            data: {
              userId: r.userId,
              kind: "drop_reminder",
              title: `${r.drop.productName} drop dalam ${minutesLeft} menit`,
              body: `${r.drop.brand} · stok ${r.drop.supplyQty.toLocaleString("id-ID")}. Siapkan tab — biasanya sold out cepat.`,
              dataJson: JSON.stringify({ dropSlug: r.drop.slug, dropId: r.drop.id }),
            },
          }),
          this.prisma.dropReminder.update({ where: { id: r.id }, data: { sentAt: now } }),
        ]);
      } catch (err) {
        this.log.warn(`reminder ${r.id}: ${(err as Error).message}`);
      }
    }
    this.log.log(`dispatched ${due.length} drop reminders`);
  }

  /* -------- queries -------------------------------------------------- */

  async upcoming(userId: string | null, limit = 6): Promise<DropSummary[]> {
    const rows = await this.prisma.drop.findMany({
      where: {
        status: { in: ["scheduled", "live"] },
        // include drops ending up to an hour ago so a "live" one stays visible
        OR: [{ dropsAt: { gte: new Date(Date.now() - 60 * 60_000) } }, { status: "live" }],
      },
      orderBy: { dropsAt: "asc" },
      take: limit,
    });
    return this.attachReminded(rows, userId);
  }

  async month(userId: string | null, year: number, month: number /* 1..12 */): Promise<DropSummary[]> {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end   = new Date(Date.UTC(year, month, 1));
    const rows = await this.prisma.drop.findMany({
      where: { dropsAt: { gte: start, lt: end } },
      orderBy: { dropsAt: "asc" },
    });
    return this.attachReminded(rows, userId);
  }

  async detail(userId: string | null, slug: string): Promise<DropDetail> {
    const drop = await this.prisma.drop.findUnique({ where: { slug } });
    if (!drop) throw new NotFoundException({ code: "not_found", message: "Drop tidak ditemukan." });
    const reminded = userId
      ? !!(await this.prisma.dropReminder.findUnique({ where: { userId_dropId: { userId, dropId: drop.id } } }))
      : false;
    return {
      ...this.toSummary(drop, reminded),
      description: drop.description,
      listingSlug: drop.listingSlug,
    };
  }

  /* -------- reminders: opt in/out ----------------------------------- */

  async setReminder(userId: string, dropId: string): Promise<{ reminded: true }> {
    const drop = await this.prisma.drop.findUnique({ where: { id: dropId } });
    if (!drop) throw new NotFoundException({ code: "not_found", message: "Drop tidak ditemukan." });
    const notifyAt = new Date(drop.dropsAt.getTime() - REMIND_LEAD_MS);
    await this.prisma.dropReminder.upsert({
      where: { userId_dropId: { userId, dropId } },
      create: { userId, dropId, notifyAt },
      // If the drop got rescheduled, re-arm the reminder by clearing sentAt.
      update: { notifyAt, sentAt: null },
    });
    return { reminded: true };
  }

  async clearReminder(userId: string, dropId: string): Promise<{ reminded: false }> {
    await this.prisma.dropReminder.deleteMany({ where: { userId, dropId } });
    return { reminded: false };
  }

  /* -------- helpers -------------------------------------------------- */

  private async attachReminded(
    rows: Array<Awaited<ReturnType<PrismaService["drop"]["findUnique"]>>>,
    userId: string | null
  ): Promise<DropSummary[]> {
    const valid = rows.filter((r): r is NonNullable<typeof r> => !!r);
    if (!userId || valid.length === 0) {
      return valid.map((r) => this.toSummary(r, false));
    }
    const reminders = await this.prisma.dropReminder.findMany({
      where: { userId, dropId: { in: valid.map((r) => r.id) } },
      select: { dropId: true },
    });
    const set = new Set(reminders.map((x) => x.dropId));
    return valid.map((r) => this.toSummary(r, set.has(r.id)));
  }

  private toSummary(d: NonNullable<Awaited<ReturnType<PrismaService["drop"]["findUnique"]>>>, reminded: boolean): DropSummary {
    return {
      id: d.id,
      slug: d.slug,
      productName: d.productName,
      brand: d.brand,
      heroImageUrl: d.heroImageUrl,
      supplyQty: d.supplyQty,
      priceIdr: d.priceIdr ? Number(d.priceIdr / CENTS_PER_RUPIAH) : null,
      dropsAt: d.dropsAt.toISOString(),
      endsAt: d.endsAt?.toISOString() ?? null,
      status: d.status as DropSummary["status"],
      reminded,
    };
  }
}
