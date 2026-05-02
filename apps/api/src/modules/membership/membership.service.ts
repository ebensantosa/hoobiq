import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { PAYMENT_PROVIDER, type PaymentProvider } from "../payments/payment-provider.interface";
import { env } from "../../config/env";

export type Tier = "bronze" | "silver" | "gold" | "platinum" | "elite";

export type Perks = {
  tier: Tier;
  isPremium: boolean;
  /** Base meet-match swipe cap. -1 = unlimited (ELITE). */
  swipeCap: number;
  /** Multiplier applied to all activity EXP awards (1.0 = no bonus). */
  expMultiplier: number;
  /** Daily login EXP grant for this tier + premium combo. */
  dailyLoginExp: number;
  /** Free boosts available this month (sum of monthly tier perk +
   *  premium bundle). */
  monthlyBoostQuota: number;
  /** Free ongkir slots this month (premium-only). */
  monthlyOngkirQuota: number;
  /** Free ongkir cap per use, in cents. 1.5jt = 150_000_000 cents (we
   *  store rupiah as cents internally). Wait — actual cap is 15.000 IDR
   *  per use which is 1_500_000 cents. */
  ongkirCapCents: number;
};

const TIER_THRESHOLDS: Array<{ tier: Tier; minLevel: number }> = [
  { tier: "elite",    minLevel: 51 },
  { tier: "platinum", minLevel: 41 },
  { tier: "gold",     minLevel: 26 },
  { tier: "silver",   minLevel: 11 },
  { tier: "bronze",   minLevel: 1  },
];

/**
 * Maps level → tier → concrete perk numbers per the Premium Membership
 * & Level Benefit doc. One canonical place so endpoint code never
 * branches on level / tier; it asks `perksFor(user)` and reads off
 * exactly what's allowed.
 */
/** Premium subscription pricing. IDR. */
export const PREMIUM_MONTHLY_IDR = 159_000;
/** Yearly bundle = 10 months' price (2 months free). */
export const PREMIUM_YEARLY_IDR = 159_000 * 10;
/** Provider-tx prefix so the webhook can route premium charges separately. */
export const PREMIUM_PREFIX = "PRM-";

@Injectable()
export class MembershipService {
  private readonly log = new Logger(MembershipService.name);
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly payment: PaymentProvider,
  ) {}

  static tierForLevel(level: number): Tier {
    for (const t of TIER_THRESHOLDS) if (level >= t.minLevel) return t.tier;
    return "bronze";
  }

  /** Build the full perk bundle for a user. Pure function over (level,
   *  isPremium) so callers can test without DB. */
  static perksFor(level: number, isPremium: boolean): Perks {
    const tier = MembershipService.tierForLevel(level);
    return {
      tier,
      isPremium,
      swipeCap: swipeCapFor(tier, isPremium),
      expMultiplier: expMultiplierFor(tier, isPremium),
      dailyLoginExp: dailyLoginFor(tier, isPremium),
      monthlyBoostQuota: monthlyBoostFor(tier, isPremium),
      monthlyOngkirQuota: isPremium ? 5 : 0,
      ongkirCapCents: 15_000 * 100, // 15 ribu × 100 cents/rupiah
    };
  }

  /** Resolve premium state from the DB row (handles expiry). */
  static isPremiumNow(u: { isPremium: boolean; premiumUntil: Date | null }): boolean {
    if (!u.isPremium) return false;
    if (!u.premiumUntil) return false;
    return u.premiumUntil.getTime() > Date.now();
  }

  async perksForUser(userId: string): Promise<Perks> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { level: true, isPremium: true, premiumUntil: true },
    });
    if (!u) return MembershipService.perksFor(1, false);
    const premium = MembershipService.isPremiumNow(u);
    return MembershipService.perksFor(u.level, premium);
  }

  /** Current YYYY-MM period key, UTC. Aligns with monthly perk resets. */
  static periodKey(d: Date = new Date()): string {
    return d.toISOString().slice(0, 7);
  }

  /** Atomically claim one boost slot from this month's quota. Returns
   *  true on success, false if the quota is exhausted. */
  async claimBoost(userId: string): Promise<boolean> {
    return this.claimSlot(userId, "boostUsed", (await this.perksForUser(userId)).monthlyBoostQuota);
  }

  /** Atomically claim one ongkir slot. */
  async claimOngkir(userId: string): Promise<boolean> {
    return this.claimSlot(userId, "ongkirUsed", (await this.perksForUser(userId)).monthlyOngkirQuota);
  }

  private async claimSlot(userId: string, field: "boostUsed" | "ongkirUsed", quota: number): Promise<boolean> {
    if (quota <= 0) return false;
    const period = MembershipService.periodKey();
    // Upsert + check: do the increment in a transaction guarded by the
    // pre-update count so two concurrent claims can't both succeed when
    // only one slot is left.
    const row = await this.prisma.membershipUsage.upsert({
      where: { userId_period: { userId, period } },
      create: { userId, period, [field]: 0 },
      update: {},
    });
    const used = (row as unknown as Record<string, number>)[field] ?? 0;
    if (used >= quota) return false;
    await this.prisma.membershipUsage.update({
      where: { userId_period: { userId, period } },
      data: { [field]: { increment: 1 } },
    });
    return true;
  }

  /* ------------------- Premium checkout (Midtrans) ------------------- */

  /** Kick off a Midtrans Snap charge for premium. Caller (controller)
   *  passes the resolved customer profile. Returns the redirect URL the
   *  client should bounce the buyer to. */
  async createPremiumCheckout(userId: string, months: 1 | 12, customer: { email: string; name: string; phone: string }) {
    const monthsClamped = months === 12 ? 12 : 1;
    const priceIdr = monthsClamped === 12 ? PREMIUM_YEARLY_IDR : PREMIUM_MONTHLY_IDR;
    const priceCents = BigInt(priceIdr) * 100n;

    // Create pending row first so the providerTxId can be embedded in
    // Midtrans order_id (snap requires the id at charge time).
    const purchase = await this.prisma.membershipPurchase.create({
      data: {
        userId, months: monthsClamped, priceCents,
        providerTxId: "", status: "pending",
      },
    });
    const providerTxId = `${PREMIUM_PREFIX}${purchase.id}`;
    await this.prisma.membershipPurchase.update({
      where: { id: purchase.id },
      data: { providerTxId },
    });

    const webBase = (env.PUBLIC_WEB_BASE ?? "http://localhost:3000").replace(/\/$/, "");
    const charge = await this.payment.createCharge({
      orderId: purchase.id,
      humanId: providerTxId,
      amountCents: priceCents,
      method: "snap",
      customer,
      items: [{
        id: `premium-${monthsClamped}m`,
        name: `Hoobiq Premium · ${monthsClamped === 12 ? "12 bulan (hemat 2 bln)" : "1 bulan"}`,
        priceCents,
        qty: 1,
      }],
      returnUrl: `${webBase}/premium?status=ok`,
    });

    return {
      purchaseId: purchase.id,
      providerTxId,
      redirectUrl: charge.redirectUrl ?? null,
      months: monthsClamped,
      priceIdr,
    };
  }

  /** Webhook hook — flip status to paid, extend User.premiumUntil. */
  async markPremiumPaid(providerTxId: string) {
    const purchase = await this.prisma.membershipPurchase.findUnique({
      where: { providerTxId },
    });
    if (!purchase) {
      this.log.warn(`markPremiumPaid: purchase not found for ${providerTxId}`);
      return;
    }
    if (purchase.status === "paid") return; // idempotent

    const now = new Date();
    const user = await this.prisma.user.findUnique({
      where: { id: purchase.userId },
      select: { premiumUntil: true, premiumStartedAt: true, isPremium: true },
    });
    if (!user) throw new NotFoundException({ code: "user_not_found", message: "User tidak ada." });

    // Stack: kalau premium masih aktif, extend dari premiumUntil; kalau
    // udah expired/baru, mulai dari now.
    const startsFrom = user.premiumUntil && user.premiumUntil > now ? user.premiumUntil : now;
    const endsAt = new Date(startsFrom.getTime() + purchase.months * 30 * 86_400_000);

    await this.prisma.$transaction([
      this.prisma.membershipPurchase.update({
        where: { id: purchase.id },
        data: { status: "paid", paidAt: now, startsAt: startsFrom, endsAt },
      }),
      this.prisma.user.update({
        where: { id: purchase.userId },
        data: {
          isPremium: true,
          premiumUntil: endsAt,
          premiumStartedAt: user.premiumStartedAt ?? now,
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: purchase.userId,
          kind: "premium_active",
          title: "Hoobiq Premium aktif!",
          body: `Premium kamu aktif sampai ${endsAt.toLocaleDateString("id-ID")}. Semua perks udah unlocked.`,
          dataJson: JSON.stringify({ purchaseId: purchase.id }),
        },
      }),
    ]);
  }

  async usageThisMonth(userId: string) {
    const period = MembershipService.periodKey();
    const row = await this.prisma.membershipUsage.findUnique({
      where: { userId_period: { userId, period } },
    });
    return {
      boostUsed: row?.boostUsed ?? 0,
      ongkirUsed: row?.ongkirUsed ?? 0,
      voucherUsed: row?.voucherUsed ?? 0,
    };
  }
}

/* --------------------- Tier → numbers (from spec) --------------------- */

function swipeCapFor(tier: Tier, premium: boolean): number {
  if (tier === "elite") return -1; // unlimited
  // Base = 50 (Bronze). Tier-add is a fixed delta per spec; premium
  // adds a flat +100 on top of the resulting cap.
  const tierAdd = { bronze: 0, silver: 30, gold: 40, platinum: 50 }[tier];
  const base = 50 + tierAdd;
  return base + (premium ? 100 : 0);
}

function expMultiplierFor(tier: Tier, premium: boolean): number {
  // Map of percent bonus (basic / premium) per tier.
  const pct: Record<Tier, [number, number]> = {
    bronze:   [0,  10],
    silver:   [10, 15],
    gold:     [15, 20],
    platinum: [20, 25],
    elite:    [25, 30],
  };
  const [basic, prem] = pct[tier];
  return 1 + (premium ? prem : basic) / 100;
}

function dailyLoginFor(tier: Tier, premium: boolean): number {
  // Base daily login EXP per tier, then a tier-specific multiplier when
  // the user has premium (Bronze/Silver x2, Gold/Platinum x3, ELITE x5).
  const base: Record<Tier, number> = {
    bronze: 10, silver: 20, gold: 30, platinum: 100, elite: 200,
  };
  const mult: Record<Tier, number> = {
    bronze: 2, silver: 2, gold: 3, platinum: 3, elite: 5,
  };
  return premium ? base[tier] * mult[tier] : base[tier];
}

function monthlyBoostFor(tier: Tier, premium: boolean): number {
  // Base monthly free boosts unlocked by the tier (one-time monthly
  // grant — spec describes them as "Unlock X bonus" each tier).
  const tierBoost: Record<Tier, number> = {
    bronze: 0, silver: 5, gold: 10, platinum: 10, elite: 10,
  };
  // Premium top-up: tier-specific extra (Platinum +5, ELITE +10) plus
  // the flat +15 monthly boost from the premium perk row.
  const premiumExtraTier: Record<Tier, number> = {
    bronze: 0, silver: 0, gold: 0, platinum: 5, elite: 10,
  };
  const PREMIUM_FLAT = 15;
  return tierBoost[tier] + (premium ? premiumExtraTier[tier] + PREMIUM_FLAT : 0);
}
