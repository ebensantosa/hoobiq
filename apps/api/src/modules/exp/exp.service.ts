import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { MembershipService } from "../membership/membership.service";

const PENDING_TOAST_KEY = (userId: string) => `exp:pending:${userId}`;
const PENDING_TOAST_TTL_SEC = 300; // 5 menit — kalau user lama gak buka tab, drop biar gak nimbun

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Return + clear pending toast entries for this user. Called by the
   *  client poller; each entry shows once then never again. Stored as
   *  a single JSON-encoded array under one key so we can use the
   *  RedisService's existing get/setex/del surface (no list ops). */
  async drainToasts(userId: string): Promise<Array<{ amount: number; kind: string; at: number }>> {
    const key = PENDING_TOAST_KEY(userId);
    const raw = await this.redis.client.get(key);
    if (!raw) return [];
    await this.redis.client.del(key);
    try {
      const parsed = JSON.parse(raw) as Array<{ amount: number; kind: string; at: number }>;
      return Array.isArray(parsed) ? parsed.filter((p) => p && Number.isFinite(p.amount)) : [];
    } catch {
      return [];
    }
  }

  private async pushToast(userId: string, kind: string, amount: number) {
    if (amount <= 0) return;
    const key = PENDING_TOAST_KEY(userId);
    try {
      // Read-modify-write — bursty awards (post create grants 2 in a
      // row: post_first + post) can race here, but the worst case is
      // one entry lost to a race. Acceptable for a nice-to-have UI.
      const raw = await this.redis.client.get(key);
      const list: Array<{ amount: number; kind: string; at: number }> = raw ? JSON.parse(raw) : [];
      // Cap at 20 entries to avoid runaway growth if the client never
      // drains (offline tab, broken poller).
      list.push({ kind, amount, at: Date.now() });
      while (list.length > 20) list.shift();
      await this.redis.client.setex(key, PENDING_TOAST_TTL_SEC, JSON.stringify(list));
    } catch { /* best-effort — toast surface is nice-to-have */ }
  }

  /** Apply the user's current tier + premium multiplier. Rounded down
   *  so we don't accidentally award fractional EXP. */
  private async applyMultiplier(userId: string, amount: number): Promise<number> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { level: true, isPremium: true, premiumUntil: true },
    });
    if (!u) return amount;
    const premium = MembershipService.isPremiumNow(u);
    const perks = MembershipService.perksFor(u.level, premium);
    return Math.floor(amount * perks.expMultiplier);
  }

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
    rawAmount: number,
    dedupeKey: string | null,
  ): Promise<{ awarded: number }> {
    if (rawAmount <= 0) return { awarded: 0 };
    // Apply tier + premium multiplier to ALL awards except the daily
    // login one (which the spec already specifies as the final amount).
    const amount = kind === "daily_login"
      ? rawAmount
      : await this.applyMultiplier(userId, rawAmount);
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
    void this.pushToast(userId, kind, amount);
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
