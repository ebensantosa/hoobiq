import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { env } from "../../config/env";

/**
 * Redis with automatic in-memory fallback for dev. If we can't connect to
 * Redis within 1.5s, we transparently switch to an LRU-ish Map with TTL so
 * the rest of the app (throttling, caching) keeps working without Redis
 * running locally.
 *
 * In production REDIS_URL points to a real Redis and the fallback never kicks in.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly log = new Logger(RedisService.name);
  private redis: Redis | null = null;
  private readonly mem = new Map<string, { value: string; expiresAt: number }>();
  private readonly FALLBACK_MAX = 5000;

  constructor() {
    const redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      retryStrategy: () => null, // give up after first failure — fallback is fine
    });
    redis.connect()
      .then(() => {
        this.redis = redis;
        this.log.log(`Redis connected (${env.REDIS_URL})`);
      })
      .catch((err) => {
        this.log.warn(`Redis unavailable (${err.message}) — using in-memory fallback.`);
        redis.disconnect();
      });

    // Sweep expired entries from the memory fallback every 30s
    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.mem) if (v.expiresAt < now) this.mem.delete(k);
    }, 30_000).unref();
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
  }

  /* --------- Public API mirrors the subset of ioredis we actually use --------- */

  readonly client = {
    get:    (key: string) => this.get(key),
    setex:  (key: string, ttl: number, value: string) => this.setex(key, ttl, value),
    del:    (key: string) => this.del(key),
  };

  async get(key: string): Promise<string | null> {
    if (this.redis) return this.redis.get(key);
    const hit = this.mem.get(key);
    if (!hit) return null;
    if (hit.expiresAt < Date.now()) { this.mem.delete(key); return null; }
    return hit.value;
  }

  async setex(key: string, ttlSec: number, value: string) {
    if (this.redis) { await this.redis.setex(key, ttlSec, value); return; }
    // Evict oldest if over cap — cheap bound on memory
    if (this.mem.size >= this.FALLBACK_MAX) {
      const firstKey = this.mem.keys().next().value;
      if (firstKey) this.mem.delete(firstKey);
    }
    this.mem.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
  }

  async del(key: string) {
    if (this.redis) { await this.redis.del(key); return; }
    this.mem.delete(key);
  }

  async cached<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
    const cached = await this.get(key);
    if (cached) {
      try { return JSON.parse(cached) as T; } catch { /* fall through */ }
    }
    const fresh = await fn();
    await this.setex(key, ttlSec, JSON.stringify(fresh, (_k, v) => typeof v === "bigint" ? v.toString() : v));
    return fresh;
  }

  async invalidate(pattern: string) {
    if (this.redis) {
      const stream = this.redis.scanStream({ match: pattern, count: 200 });
      for await (const keys of stream as AsyncIterable<string[]>) {
        if (keys.length) await this.redis.unlink(...keys);
      }
      return;
    }
    // Glob-ish match for memory store
    const re = new RegExp("^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    for (const k of this.mem.keys()) if (re.test(k)) this.mem.delete(k);
  }
}
