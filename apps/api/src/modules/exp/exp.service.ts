import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

/**
 * Centralized EXP awarder. Every codepath that wants to give a user
 * EXP calls one of:
 *
 *   - award()              one-shot, no dedupe (e.g. each completed sale).
 *   - awardOnce()          first-time only — dedupeKey = "once".
 *   - awardOnceDaily()     1x per UTC day per kind — dedupeKey = "daily:YYYY-MM-DD".
 *   - awardWithDailyCap()  unbounded inserts but stops once the kind's
 *                          daily total reaches `dailyCap`.
 *
 * Recomputes User.level from the new total exp using the canonical
 * formula `level = ceil(sqrt(exp / 50))` (range upper bound at level N
 * is N² × 50 — see Sistem EXP doc). Persists level in the same
 * transaction so the topbar / passport stays in sync without an extra
 * read after the next page render.
 */
@Injectable()
export class ExpService {
  private readonly log = new Logger(ExpService.name);
  constructor(private readonly prisma: PrismaService) {}

  /** Compute level from cumulative EXP. Min level is 1. */
  static levelFromExp(exp: number): number {
    if (exp <= 0) return 1;
    return Math.max(1, Math.ceil(Math.sqrt(exp / 50)));
  }

  /** EXP needed to *enter* the next level (cumulative — not delta). */
  static expForLevel(level: number): number {
    return level * level * 50;
  }

  private todayKey(): string {
    // UTC date so Asia/Jakarta and other zones don't double-claim across
    // midnight rollovers. The grinding spec is "1x / hari (reset daily)";
    // we treat "hari" as UTC for server simplicity.
    return new Date().toISOString().slice(0, 10);
  }

  async award(userId: string, kind: string, amount: number): Promise<{ awarded: number }> {
    return this.insertAndBump(userId, kind, amount, null);
  }

  async awardOnce(userId: string, kind: string, amount: number) {
    return this.insertAndBump(userId, kind, amount, "once");
  }

  async awardOnceDaily(userId: string, kind: string, amount: number) {
    return this.insertAndBump(userId, kind, amount, `daily:${this.todayKey()}`);
  }

  /** Award up to `dailyCap` total EXP per UTC day for this kind. */
  async awardWithDailyCap(userId: string, kind: string, amount: number, dailyCap: number) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const today = await this.prisma.expAward.aggregate({
      where: { userId, kind, createdAt: { gte: since } },
      _sum: { amount: true },
    });
    const used = today._sum.amount ?? 0;
    const give = Math.min(amount, Math.max(0, dailyCap - used));
    if (give <= 0) return { awarded: 0 };
    return this.insertAndBump(userId, kind, give, null);
  }

  private async insertAndBump(
    userId: string,
    kind: string,
    amount: number,
    dedupeKey: string | null,
  ): Promise<{ awarded: number }> {
    if (amount <= 0) return { awarded: 0 };
    try {
      await this.prisma.expAward.create({
        data: { userId, kind, amount, dedupeKey },
      });
    } catch (e) {
      // Unique-violation on (userId, kind, dedupeKey) means the user has
      // already claimed this award — silent no-op. Anything else logs.
      const code = (e as { code?: string }).code;
      if (code === "P2002") return { awarded: 0 };
      this.log.warn(`exp award failed for ${userId}/${kind}: ${(e as Error).message}`);
      return { awarded: 0 };
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { exp: { increment: amount } },
      select: { exp: true, level: true },
    });
    const newLevel = ExpService.levelFromExp(updated.exp);
    if (newLevel !== updated.level) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { level: newLevel },
      });
    }
    return { awarded: amount };
  }
}

/** Canonical EXP kinds — keep in sync with the Sistem EXP doc. */
export const EXP_KIND = {
  profileComplete:    "profile_complete",     // 1x/akun, 200
  firstPost:          "post_first",           // 1x/akun, 100
  post:               "post",                 // 20/post, daily cap 100
  swipe50Daily:       "swipe_50_daily",       // 1x/hari, 100
  firstPurchase:      "purchase_first",       // 1x/akun, 300
  purchaseComplete:   "purchase_complete",    // 50/order completed
  reviewSeller:       "review_seller",        // 20/rating
  firstListing:       "listing_first",        // 1x/akun, 300
  firstSaleComplete:  "sale_first",           // 1x/akun, 500
  saleComplete:       "sale_complete",        // 20/sale completed
  ratingReceived45:   "rating_received_45",   // 10/4-5★ rating diterima seller
} as const;

export type ExpKind = typeof EXP_KIND[keyof typeof EXP_KIND];
