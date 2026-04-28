import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { LoginInput, RegisterInput, SessionUser } from "@hoobiq/types";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { env } from "../../config/env";

const BCRYPT_ROUNDS = 12;
const SESSION_CACHE_TTL = 60; // seconds — keep /me fast, revocations take effect within 1 min

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

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
      throw new ConflictException({
        code: "account_exists",
        message:
          existing.email === email
            ? "Email sudah terdaftar. Coba masuk atau pakai email lain."
            : "Username sudah dipakai. Coba yang lain.",
      });
    }

    const passwordHash = await bcrypt.hash(input.password + env.PASSWORD_PEPPER, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email, username, passwordHash, phone: input.phone.trim() },
      select: { id: true, username: true, email: true },
    });
    return user;
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
        message: "Akun kamu sedang dibatasi. Hubungi bantuan@hoobiq.id.",
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

    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
    if (session.user.status !== "active" || session.user.deletedAt) return null;

    const u = toSessionUser(session.user);
    await this.redis.client.setex(cacheKey, SESSION_CACHE_TTL, JSON.stringify(u));
    return u;
  }
}

/* ------------------------------- Helpers ------------------------------- */

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function toSessionUser(u: {
  id: string; username: string; email: string; name: string | null;
  avatarUrl: string | null; role: string; level: number; exp: number;
  trustScore: unknown;
}): SessionUser {
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
  };
}
