import { BadRequestException, Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { MembershipService } from "./membership.service";
import { ExpService } from "../exp/exp.service";

const PREMIUM_MONTHLY_PRICE_IDR = 159_000;

@Controller("membership")
export class MembershipController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly exp: ExpService,
  ) {}

  /** Read perks + usage so the UI can render the dashboard with one
   *  fetch instead of two. */
  @Get("me")
  async me(@CurrentUser() user: SessionUser) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { level: true, exp: true, isPremium: true, premiumUntil: true, lastDailyCheckinAt: true },
    });
    if (!dbUser) throw new BadRequestException({ code: "user_not_found", message: "User tidak ditemukan." });
    const premium = MembershipService.isPremiumNow(dbUser);
    const perks = MembershipService.perksFor(dbUser.level, premium);
    const usage = await this.membership.usageThisMonth(user.id);
    const today = new Date().toISOString().slice(0, 10);
    const lastCheckin = dbUser.lastDailyCheckinAt?.toISOString().slice(0, 10) ?? null;
    return {
      level: dbUser.level,
      exp: dbUser.exp,
      isPremium: premium,
      premiumUntil: dbUser.premiumUntil?.toISOString() ?? null,
      perks,
      usage,
      dailyCheckin: { claimedToday: lastCheckin === today, lastClaimedAt: dbUser.lastDailyCheckinAt?.toISOString() ?? null },
      pricing: { monthlyIdr: PREMIUM_MONTHLY_PRICE_IDR },
    };
  }

  /** Daily login EXP claim. Idempotent per UTC day; returns the awarded
   *  amount (0 if already claimed today). The spec ties the amount to
   *  tier + premium, so we look that up here rather than letting clients
   *  pass an amount. */
  @Post("daily-checkin")
  @HttpCode(200)
  async dailyCheckin(@CurrentUser() user: SessionUser) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { level: true, isPremium: true, premiumUntil: true, lastDailyCheckinAt: true },
    });
    if (!dbUser) throw new BadRequestException({ code: "user_not_found", message: "User tidak ditemukan." });
    const premium = MembershipService.isPremiumNow(dbUser);
    const perks = MembershipService.perksFor(dbUser.level, premium);
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = dbUser.lastDailyCheckinAt?.toISOString().slice(0, 10);
    if (lastDate === today) {
      return { awarded: 0, alreadyClaimed: true, dailyLoginExp: perks.dailyLoginExp };
    }
    // Bypass the activity multiplier (daily login amount is already the
    // final number per spec) — call awardOnceDaily so a parallel double
    // claim on midnight rollover is still safe via the dedupeKey.
    await this.exp.awardOnceDaily(user.id, "daily_login", perks.dailyLoginExp);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastDailyCheckinAt: new Date() },
    });
    return { awarded: perks.dailyLoginExp, alreadyClaimed: false, dailyLoginExp: perks.dailyLoginExp };
  }

  /**
   * Start a Midtrans Snap charge for premium. Returns the redirect URL
   * the client bounces the user to. Premium is NOT activated here —
   * the webhook flips the entitlement once the payment settles.
   */
  @Post("checkout")
  @HttpCode(200)
  async checkout(@CurrentUser() user: SessionUser, @Body() body: { months?: number }) {
    const months = Number(body?.months) === 12 ? 12 : 1;
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true, username: true, phone: true },
    });
    if (!dbUser) throw new BadRequestException({ code: "user_not_found", message: "User tidak ditemukan." });
    return this.membership.createPremiumCheckout(user.id, months as 1 | 12, {
      email: dbUser.email,
      name: dbUser.name ?? dbUser.username,
      phone: dbUser.phone ?? "",
    });
  }

  /** Admin-only / self cancel. Doesn't refund — just stops auto-renew
   *  by clearing the entitlement immediately. UI will gate this behind
   *  a confirm dialog. */
  @Post("cancel")
  @HttpCode(200)
  async cancel(@CurrentUser() user: SessionUser) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isPremium: false, premiumUntil: null },
    });
    return { isPremium: false };
  }
}
