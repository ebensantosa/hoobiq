import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { LoginInput, PasswordSchema, RegisterInput } from "@hoobiq/types";
import { Public } from "../../common/decorators/public.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { env } from "../../config/env";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuthService } from "./auth.service";
import type { SessionUser } from "@hoobiq/types";

const ChangePasswordInput = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: PasswordSchema,
});

/** Soft cooldown between password changes — protects against accidental
 *  double-submits, casual snooping ("change every refresh"), and gives
 *  the support team a reasonable window to investigate compromised
 *  accounts before another rotation. */
const PASSWORD_COOLDOWN_MS = 60 * 1000; // 1 minute

const ResendEmailInput = z.object({
  email: z.string().email().toLowerCase(),
});

const COOKIE_OPTIONS = {
  httpOnly: true,                // No JS access — defeats XSS token theft
  signed: true,                  // Tamper detection via SESSION_SECRET
  sameSite: "lax" as const,      // Safe default for first-party nav
  secure: env.NODE_ENV === "production",
  path: "/",
  maxAge: env.SESSION_TTL_DAYS * 86_400_000,
  // In prod, web (hoobiq.com) and api (api.hoobiq.com) are different hosts;
  // setting domain to ".hoobiq.com" makes the cookie visible to both so
  // Next SSR can read the session via next/headers.
  ...(env.SESSION_COOKIE_DOMAIN ? { domain: env.SESSION_COOKIE_DOMAIN } : {}),
};

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post("register")
  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // 5 new registrations / minute / ip
  @HttpCode(201)
  async register(@Body(new ZodPipe(RegisterInput)) body: RegisterInput) {
    const user = await this.auth.register(body);
    return { user };
  }

  @Public()
  @Post("login")
  @Throttle({ default: { ttl: 60_000, limit: 10 } }) // 10 attempts / minute / ip
  @HttpCode(200)
  async login(
    @Body(new ZodPipe(LoginInput)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const { token, user } = await this.auth.login(body, {
      userAgent: req.get("user-agent") ?? undefined,
      ip: req.ip,
    });
    res.cookie(env.SESSION_COOKIE_NAME, token, COOKIE_OPTIONS);
    return { user };
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.signedCookies?.[env.SESSION_COOKIE_NAME];
    await this.auth.logout(raw);
    res.clearCookie(env.SESSION_COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: 0 });
  }

  @Get("me")
  me(@CurrentUser() user: SessionUser) {
    return { user };
  }

  /**
   * Stub resend endpoint — the real email service (SMTP/SES) is not yet
   * wired. We accept the request, throttle aggressively, and return OK so
   * the UI button behaves correctly. When email delivery lands, swap this
   * for a real call to the mailer service.
   */
  /**
   * Change password for the authenticated user.
   *
   * Defence-in-depth: Throttle (5/min/IP) + the per-user `lastPasswordChangeAt`
   * cooldown (1 min between successful changes). Old password is verified
   * against the current hash before we accept the new one — no implicit
   * trust in the session alone, since session reuse can survive a user
   * walking away from a public machine.
   */
  @Post("me/password")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(200)
  async changePassword(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(ChangePasswordInput)) body: z.infer<typeof ChangePasswordInput>,
  ) {
    const u = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, lastPasswordChangeAt: true },
    });
    if (!u) throw new UnauthorizedException({ code: "no_user", message: "Sesi tidak valid." });

    if (u.lastPasswordChangeAt) {
      const elapsed = Date.now() - u.lastPasswordChangeAt.getTime();
      if (elapsed < PASSWORD_COOLDOWN_MS) {
        const wait = Math.ceil((PASSWORD_COOLDOWN_MS - elapsed) / 1000);
        throw new BadRequestException({
          code: "rate_limit_password",
          message: `Tunggu ${wait} detik sebelum mengganti password lagi.`,
        });
      }
    }

    const ok = await bcrypt.compare(body.currentPassword + env.PASSWORD_PEPPER, u.passwordHash);
    if (!ok) {
      throw new BadRequestException({
        code: "wrong_password",
        message: "Password lama tidak cocok.",
      });
    }

    if (body.currentPassword === body.newPassword) {
      throw new BadRequestException({
        code: "same_password",
        message: "Password baru harus berbeda dari yang lama.",
      });
    }

    const newHash = await bcrypt.hash(body.newPassword + env.PASSWORD_PEPPER, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        lastPasswordChangeAt: new Date(),
      },
    });
    return { ok: true };
  }

  @Public()
  @Post("resend-email")
  @Throttle({ default: { ttl: 60_000, limit: 2 } }) // 2 resends/min/ip
  @HttpCode(200)
  async resendEmail(@Body(new ZodPipe(ResendEmailInput)) body: z.infer<typeof ResendEmailInput>) {
    void body.email;
    return { ok: true, queued: true };
  }
}
