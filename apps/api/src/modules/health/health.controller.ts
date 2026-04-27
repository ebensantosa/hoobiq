import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";

/**
 * Liveness + readiness checks. Used by:
 *   - Caddy / reverse proxy upstream healthchecks
 *   - GitHub Actions deploy script (rollback if /healthz fails after deploy)
 *   - Uptime monitoring (UptimeRobot, etc.)
 *
 * `/healthz` — cheap liveness, just confirms process is up. Always 200.
 * `/readyz`  — readiness, pings Postgres + Redis. 503 if either is down.
 */
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get("healthz")
  liveness() {
    return { status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() };
  }

  @Public()
  @Get("readyz")
  async readiness() {
    // Redis has an in-memory fallback, so we only fail readiness on DB.
    // (If Redis is down the app still serves; just slower throttling/caching.)
    let db = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch { /* db down */ }

    let cache = false;
    try {
      await this.redis.setex("__healthz__", 5, "1");
      cache = (await this.redis.get("__healthz__")) === "1";
    } catch { /* fallback or down */ }

    if (!db) {
      const err: Error & { status?: number } = new Error("db unavailable");
      err.status = 503;
      throw err;
    }
    return { status: "ok", db, cache };
  }
}
