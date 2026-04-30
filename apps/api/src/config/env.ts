import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// Load .env as early as possible — before any env access below.
// override:true so the on-disk .env is the source of truth even when the
// process inherits stale values from pm2's saved dump (otherwise updating
// .env + `pm2 reload` silently keeps the old value).
loadDotenv({ override: true });

/**
 * All env vars validated at boot. Missing or invalid → crash with a helpful
 * error instead of failing later at the point of use.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),

  // Auth
  SESSION_COOKIE_NAME: z.string().default("hbq_session"),
  // Optional cookie domain — set to ".hoobiq.com" in production so the session
  // cookie set by api.hoobiq.com is also visible to the web app at hoobiq.com
  // (Next.js SSR reads it via next/headers cookies()). Leave unset in local
  // dev — host-only cookie on localhost is correct.
  SESSION_COOKIE_DOMAIN: z.string().optional(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be ≥ 32 chars"),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  PASSWORD_PEPPER: z.string().min(16, "PASSWORD_PEPPER must be ≥ 16 chars"),
  CSRF_SECRET: z.string().min(32),

  // CORS (comma-separated)
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  ADMIN_ORIGIN: z.string().default("http://localhost:3001"),

  // External providers — sandbox by default
  MIDTRANS_SERVER_KEY: z.string().optional(),
  MIDTRANS_CLIENT_KEY: z.string().optional(),
  MIDTRANS_SIGNATURE_KEY: z.string().optional(),
  // "sandbox" (default) or "production" — picks Snap + API base URLs.
  MIDTRANS_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  KOMERCE_API_KEY: z.string().optional(),
  KOMERCE_WEBHOOK_SECRET: z.string().optional(),
  // Komerce Payment + QRISLY — separate keys per Komerce dashboard product.
  // Both optional; checkout falls back to Midtrans if unset.
  KOMERCE_PAYMENT_API_KEY: z.string().optional(),
  KOMERCE_QRISLY_API_KEY: z.string().optional(),
  // Override hosts in case Komerce changes them or sandbox/prod differ.
  // Defaults try the most common pattern; check your Komerce dashboard
  // → Developer → API Documentation for the exact base URL.
  // Sandbox by default — flip to api.collaborator.komerce.id (no -sandbox)
  // for production. Per Komerce docs: https://rajaongkir.com/docs/payment-api
  KOMERCE_PAYMENT_BASE_URL: z.string().url().default("https://api-sandbox.collaborator.komerce.id/user/api/v1"),
  KOMERCE_QRISLY_BASE_URL:  z.string().url().default("https://api-sandbox.collaborator.komerce.id/user/api/v1"),

  // Public base URL the API uses to construct absolute URLs for uploaded
  // files. Defaults to http://localhost:<port>; set in production to the
  // CDN or reverse-proxy URL.
  PUBLIC_API_BASE: z.string().url().optional(),

  // At-rest encryption KEK for sensitive scalars (bank account numbers).
  // SHA-256 hashed before use, so any string ≥ 32 chars works. Falls
  // back to SESSION_SECRET in dev — set explicitly in prod.
  BANK_ENCRYPTION_KEY: z.string().min(32).optional(),

  // Resend — transactional email provider. Free tier is ~3k/month so
  // EmailService is selective: only fires for milestone events
  // (paid, shipped, refunded, KTP decision, dispute resolved, password
  // changed, payout decision). Generate API key at resend.com/api-keys
  // after verifying the sender domain (notif@hoobiq.com).
  RESEND_API_KEY: z.string().min(8).optional(),
  EMAIL_FROM: z.string().optional(), // "Hoobiq <notif@hoobiq.com>"

  // Sentry DSN for both apps. If unset, Sentry init is a no-op.
  SENTRY_DSN: z.string().url().optional(),

  // Public base URL of the web app — used to build the `return_url` we
  // hand to Komerce so the buyer auto-bounces back to /pesanan/:id after
  // paying on the hosted Payment Page.
  PUBLIC_WEB_BASE: z.string().url().optional(),

  // R2 storage (production — see UploadsController for swap point)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY: z.string().optional(),
  R2_SECRET_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid env:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
