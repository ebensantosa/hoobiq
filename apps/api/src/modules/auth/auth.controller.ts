import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { z } from "zod";
import { LoginInput, RegisterInput } from "@hoobiq/types";
import { Public } from "../../common/decorators/public.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { env } from "../../config/env";
import { AuthService } from "./auth.service";
import type { SessionUser } from "@hoobiq/types";

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
  constructor(private readonly auth: AuthService) {}

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
  @Public()
  @Post("resend-email")
  @Throttle({ default: { ttl: 60_000, limit: 2 } }) // 2 resends/min/ip
  @HttpCode(200)
  async resendEmail(@Body(new ZodPipe(ResendEmailInput)) body: z.infer<typeof ResendEmailInput>) {
    void body.email;
    return { ok: true, queued: true };
  }
}
