import "reflect-metadata";
import * as Sentry from "@sentry/node";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { env } from "./config/env";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";

// Sentry init runs before NestFactory so any bootstrap-time crash is
// captured. No-op in dev (or when SENTRY_DSN is unset) — the SDK still
// installs but never sends.
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Drop request bodies & cookies by default — we don't want
    // session cookies or payment payloads in the error feed.
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
      }
      return event;
    },
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // Image uploads come in as data URLs (base64) inside the JSON body
    // until the R2 signed-upload pipeline lands. Default Express limit is
    // 100kb which 8 photos easily exceed — bump to 25mb.
    bodyParser: false,
  });
  const express = await import("express");
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Trust proxy — needed for correct client IP behind Vercel/Cloudflare
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // --- Security middleware ---
  app.use(
    helmet({
      // API is JSON; CSP enforced on web side. Keep frame-ancestors 'none'.
      contentSecurityPolicy: { directives: { "frame-ancestors": ["'none'"] } },
      crossOriginResourcePolicy: { policy: "same-site" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );
  app.use(cookieParser(env.SESSION_SECRET));

  // Strict allowlist CORS — only our first-party surfaces, always with credentials.
  const origins = [env.WEB_ORIGIN, env.ADMIN_ORIGIN]
    .flatMap((s) => s.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Requested-With"],
  });

  // Every route validates via a Zod schema (@ZodPipe) — no class-validator needed.
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // API versioning from day 1. Health endpoints stay at the root so reverse
  // proxies can hit /healthz and /readyz without knowing the API prefix.
  app.setGlobalPrefix("api/v1", { exclude: ["healthz", "readyz"] });

  // Static serving for user-uploaded media. Files live in `apps/api/public/`
  // — same convention as Next.js so it's intuitive. We resolve relative to
  // this file (works whether the entry is `src/main.ts` via tsx or
  // `dist/main.js` via node) instead of `process.cwd()`, which is brittle.
  // CORP is set to `cross-origin` so the web app (localhost:3000) can load
  // images served from the API (localhost:4000) — Helmet's default
  // `same-site` would otherwise block them.
  const publicDir = join(__dirname, "..", "public");
  app.useStaticAssets(publicDir, {
    prefix: "/",
    index: false,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    immutable: true,
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  });
  console.log(`📁 Static assets → ${publicDir}`);

  await app.listen(env.PORT);
  console.log(`🚀 Hoobiq API → http://localhost:${env.PORT}/api/v1  (env: ${env.NODE_ENV})`);
}

bootstrap();
