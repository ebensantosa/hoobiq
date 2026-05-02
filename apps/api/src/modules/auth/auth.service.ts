import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { LoginInput, RegisterInput, SessionUser } from "@hoobiq/types";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { EmailService } from "../email/email.service";
import { env } from "../../config/env";

const BCRYPT_ROUNDS = 12;
const SESSION_CACHE_TTL = 60; // seconds — keep /me fast, revocations take effect within 1 min
const VERIFY_TOKEN_TTL_HOURS = 24;

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly email: EmailService,
  ) {}

  /** Build the verify-email link the user clicks from their inbox. */
  private verifyLink(rawToken: string): string {
    const base = (env.PUBLIC_WEB_BASE ?? "http://localhost:3000").replace(/\/$/, "");
    return `${base}/verifikasi-email?token=${encodeURIComponent(rawToken)}`;
  }

  private verificationEmailHtml(name: string, code: string, link: string): string {
    // The email shows the 6-digit code prominently AND a clickable
    // link that auto-fills the same code in the verify-email page.
    // The two paths converge to the same POST /auth/verify-email,
    // which hashes whatever token came in and looks up the user row.
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #111;">
        <h1 style="font-size: 22px; margin: 0 0 16px;">Halo ${escapeHtml(name)}, selamat datang di Hoobiq! 👋</h1>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
          Yuk konfirmasi email kamu pakai kode 6-digit di bawah. Ketik di halaman verifikasi:
        </p>
        <div style="margin: 24px 0; padding: 24px; background: #faf6fb; border: 1px solid #efd9e7; border-radius: 12px; text-align: center;">
          <p style="font-size: 11px; color: #6b7280; margin: 0 0 8px; letter-spacing: 0.18em; text-transform: uppercase;">Kode verifikasi</p>
          <p style="font-family: ui-monospace, SFMono-Regular, monospace; font-size: 32px; font-weight: 800; letter-spacing: 0.32em; color: #EC4899; margin: 0;">${code}</p>
        </div>
        <p style="font-size: 14px; line-height: 1.6; margin: 16px 0 0;">Atau klik tombol berikut — kami isi kodenya otomatis:</p>
        <p style="margin: 12px 0;">
          <a href="${link}" style="display: inline-block; background: #EC4899; color: #fff; padding: 12px 24px; border-radius: 999px; font-weight: 700; text-decoration: none;">
            Verifikasi email
          </a>
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin: 32px 0 0;">
          Kode berlaku ${VERIFY_TOKEN_TTL_HOURS} jam. Kalau bukan kamu yang daftar, abaikan email ini.
        </p>
      </div>
    `.trim();
  }

  /** Issue a fresh 6-digit verification code, persist its hash, and
   *  email it to the user. Used by both register() and resend-email.
   *  Best-effort email — failures are logged but never thrown (we
   *  don't want a Resend hiccup to fail register). */
  private async issueVerificationEmail(userId: string, email: string, displayName: string) {
    // 6-digit numeric code (000000 – 999999). Easier to read off
    // an email + type into a phone keyboard than a random hex blob.
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const tokenHash = sha256(code);
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 3600 * 1000);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      },
    });
    try {
      await this.email.send(
        email,
        `Hoobiq · Kode verifikasi: ${code}`,
        this.verificationEmailHtml(displayName, code, this.verifyLink(code)),
      );
    } catch (e) {
      this.log.error(`verify email send failed for ${email}: ${(e as Error).message}`);
    }
  }

  /* ------------------------- Registration ------------------------- */

  async register(input: RegisterInput) {
    // Normalize early so unique-checks can't be bypassed with case variants
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim();

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true, email: true, username: true },
    });
    if (existing) {
      const emailTaken = existing.email === email;
      throw new ConflictException({
        code: "account_exists",
        message: emailTaken
          ? "Email sudah terdaftar. Coba masuk atau pakai email lain."
          : "Username sudah dipakai. Coba yang lain.",
        details: emailTaken
          ? [{ path: "email", message: "Email sudah terdaftar." }]
          : [{ path: "username", message: "Username sudah dipakai." }],
      });
    }

    const passwordHash = await bcrypt.hash(input.password + env.PASSWORD_PEPPER, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email, username, passwordHash, phone: input.phone.trim() },
      select: { id: true, username: true, email: true },
    });
    // Fire-and-forget verification email. Register response stays
    // synchronous on the user create; the email lands a moment later.
    void this.issueVerificationEmail(user.id, user.email, user.username);
    return user;
  }

  /* -------------------- Email verification -------------------- */

  /** Validate the raw token from the email link. On success: marks
   *  emailVerified=now() + clears the token columns. */
  async verifyEmail(rawToken: string): Promise<{ ok: true; userId: string }> {
    const tokenHash = sha256(rawToken);
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationTokenHash: tokenHash },
      select: { id: true, emailVerificationExpiresAt: true, emailVerified: true },
    });
    if (!user) {
      throw new BadRequestException({ code: "invalid_token", message: "Link verifikasi tidak valid." });
    }
    if (user.emailVerified) {
      // Already verified — friendly idempotent response so a buyer
      // clicking the link twice doesn't get an error.
      return { ok: true, userId: user.id };
    }
    if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException({ code: "expired_token", message: "Link verifikasi sudah kadaluarsa. Minta kirim ulang." });
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    });
    return { ok: true, userId: user.id };
  }

  /** Re-issue the verification token + email. Always returns ok:true
   *  even when the email isn't on file, to avoid leaking which emails
   *  are registered (timing-safe enumeration guard).  */
  async resendVerificationEmail(emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, username: true, emailVerified: true },
    });
    if (!user || user.emailVerified) {
      // Silent success — never reveal whether the email is registered
      // or already verified.
      return { ok: true };
    }
    await this.issueVerificationEmail(user.id, user.email, user.username);
    return { ok: true };
  }

  /* -------------------- Password reset -------------------- */

  private resetEmailHtml(name: string, link: string): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #111;">
        <h1 style="font-size: 22px; margin: 0 0 16px;">Reset password Hoobiq</h1>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
          Halo ${escapeHtml(name)}, kami terima permintaan reset password untuk akun-mu. Klik tombol di bawah untuk bikin password baru:
        </p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="display: inline-block; background: #EC4899; color: #fff; padding: 12px 24px; border-radius: 999px; font-weight: 700; text-decoration: none;">
            Reset password
          </a>
        </p>
        <p style="font-size: 13px; color: #6b7280; line-height: 1.6; margin: 16px 0 0;">
          Atau copy-paste link ini: <br/>
          <a href="${link}" style="color: #EC4899; word-break: break-all;">${link}</a>
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin: 32px 0 0;">
          Link berlaku 30 menit. Kalau bukan kamu yang minta reset, abaikan email ini — password kamu tetap aman.
        </p>
      </div>
    `.trim();
  }

  /** Issue a password-reset token + email it to the user. Always
   *  returns ok:true (silent for unknown email / inactive account)
   *  to prevent enumeration. 30-min token TTL — short enough to limit
   *  brute force, long enough that the email isn't lost in mobile
   *  notification queues. */
  async forgotPassword(emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, username: true, status: true, deletedAt: true },
    });
    if (!user || user.status !== "active" || user.deletedAt) {
      return { ok: true };
    }
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });
    const base = (env.PUBLIC_WEB_BASE ?? "http://localhost:3000").replace(/\/$/, "");
    const link = `${base}/reset-password/${encodeURIComponent(rawToken)}`;
    try {
      await this.email.send(
        user.email,
        "Reset password Hoobiq",
        this.resetEmailHtml(user.username, link),
      );
    } catch (e) {
      this.log.error(`reset email send failed for ${user.email}: ${(e as Error).message}`);
    }
    return { ok: true };
  }

  /** Validate the reset token + set a new password. Also revokes every
   *  active session for that user so an attacker who triggered the flow
   *  can't keep a stolen session alive past the reset. The fresh
   *  lastPasswordChangeAt prevents the same-minute change-again attack. */
  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = sha256(rawToken);
    const user = await this.prisma.user.findFirst({
      where: { passwordResetTokenHash: tokenHash },
      select: { id: true, passwordResetExpiresAt: true },
    });
    if (!user) {
      throw new BadRequestException({ code: "invalid_token", message: "Link reset tidak valid." });
    }
    if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException({ code: "expired_token", message: "Link reset sudah kadaluarsa. Minta link baru." });
    }
    const passwordHash = await bcrypt.hash(newPassword + env.PASSWORD_PEPPER, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
          lastPasswordChangeAt: new Date(),
        },
      }),
      this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  /* ---------------------------- Login ---------------------------- */

  async login(input: LoginInput, ctx: { userAgent?: string; ip?: string }) {
    const identifier = input.identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: input.identifier.trim() }],
        deletedAt: null,
      },
    });

    // Constant-time behavior even on user-miss to prevent enumeration.
    // We still hash a fake password so response time doesn't leak existence.
    const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalid";
    const ok = await bcrypt.compare(input.password + env.PASSWORD_PEPPER, hash);
    if (!user || !ok) {
      throw new UnauthorizedException({
        code: "bad_credentials",
        message: "Email/username atau password salah.",
      });
    }
    if (user.status !== "active") {
      throw new UnauthorizedException({
        code: "account_not_active",
        message: "Akun kamu sedang dibatasi. Hubungi bantuan@hoobiq.com.",
      });
    }
    // Block login until the email is confirmed. Frontend reads the
    // `email_not_verified` code and bounces to /verifikasi-email so
    // the user can enter the OTP. Skipped for legacy seed accounts
    // that were created before email verification existed (their
    // emailVerified is set during seed).
    if (!user.emailVerified) {
      throw new UnauthorizedException({
        code: "email_not_verified",
        message: "Email kamu belum diverifikasi. Cek inbox dan masukkan kode 6-digit.",
      });
    }

    // Token is 48 random bytes (base64url). We store only sha256(token) —
    // a DB dump alone cannot hijack sessions.
    const rawToken = crypto.randomBytes(48).toString("base64url");
    const tokenHash = sha256(rawToken);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        userAgent: ctx.userAgent?.slice(0, 240),
        ip: ctx.ip?.slice(0, 45),
        expiresAt: new Date(Date.now() + env.SESSION_TTL_DAYS * 86_400_000),
      },
    });

    return { token: rawToken, user: toSessionUser(user) };
  }

  /* --------------------------- Logout --------------------------- */

  /**
   * Drop every cached session entry for a user. Called when something
   * mutates a field surfaced via /me (avatar, name, premium toggle…)
   * so the next page load reflects the change instead of waiting up to
   * 60s for the cache TTL. Cheap: scans `sess:*` and inspects the
   * stored payload — fine for our session volumes.
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { tokenHash: true },
    });
    if (sessions.length === 0) return;
    await Promise.all(
      sessions.map((s) => this.redis.client.del(`sess:${s.tokenHash}`).catch(() => undefined)),
    );
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    const tokenHash = sha256(rawToken);
    await this.prisma.session
      .updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
    await this.redis.client.del(`sess:${tokenHash}`);
  }

  /* --------------------- Session resolution --------------------- */

  /**
   * Called by AuthGuard on every request. Cached in Redis for 60s so normal
   * traffic doesn't hit Postgres per-request; revocation propagates within
   * that TTL which is acceptable for our threat model.
   */
  async resolveSession(rawToken: string): Promise<SessionUser | null> {
    if (!rawToken) return null;
    const tokenHash = sha256(rawToken);
    const cacheKey = `sess:${tokenHash}`;

    const cached = await this.redis.client.get(cacheKey);
    if (cached) return JSON.parse(cached) as SessionUser;

    // Explicit select instead of `include: { user: true }` — adding new
    // columns to User (KTP, password timestamps, etc.) shouldn't break
    // session resolution before `prisma db push` has caught up in prod.
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      select: {
        revokedAt: true, expiresAt: true,
        user: {
          select: {
            id: true, username: true, email: true, name: true,
            avatarUrl: true, role: true, level: true, exp: true,
            trustScore: true, status: true, deletedAt: true,
            isPremium: true, premiumUntil: true,
          },
        },
      },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
    if (session.user.status !== "active" || session.user.deletedAt) return null;

    const u = toSessionUser(session.user);
    await this.redis.client.setex(cacheKey, SESSION_CACHE_TTL, JSON.stringify(u));
    return u;
  }
}

/* ------------------------------- Helpers ------------------------------- */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function toSessionUser(u: {
  id: string; username: string; email: string; name: string | null;
  avatarUrl: string | null; role: string; level: number; exp: number;
  trustScore: unknown;
  isPremium?: boolean; premiumUntil?: Date | null;
}): SessionUser {
  // Premium is "active" when both flag and the until date are in the
  // future. Cache TTL on session resolve is 60s so a freshly expired
  // membership can take up to a minute to drop the badge — acceptable.
  const premiumActive = !!u.isPremium && !!u.premiumUntil && u.premiumUntil.getTime() > Date.now();
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    role: u.role as SessionUser["role"],
    level: u.level,
    exp: u.exp,
    trustScore: Number(u.trustScore),
    isPremium: premiumActive,
  };
}
