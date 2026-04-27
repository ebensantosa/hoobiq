# Hoobiq

Marketplace & komunitas kolektor hobi Indonesia. Trading cards, action figure, blind box, merchandise, komik.

## Stack

- **Monorepo** — npm workspaces
- **Web** — Next.js 15 (App Router) + React 19 + Tailwind + shadcn-style UI
- **API** — NestJS 10 + Prisma + Postgres + Redis + Zod
- **Auth** — httpOnly signed cookie + bcrypt + pepper + CSRF (double-submit)
- **Payment** — Midtrans Snap (sandbox) via a provider interface
- **Shipping** — Komerce (sandbox, stub)

## Workspace

```
apps/
  web/     Next.js — port 3000
  api/     NestJS  — port 4000
packages/
  db/      Prisma schema + client
  types/   Zod schemas shared web ↔ api
  ui/      React component library
  config/  Tailwind preset
```

## Prerequisites

- Node.js 20+
- Postgres 16+ running locally (or Supabase/Neon URL)
- Redis 7+ running locally

## First-time setup

```bash
# 1. install deps
npm install

# 2. generate .env files from examples
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. fill in SECRETS in apps/api/.env
#    - SESSION_SECRET, PASSWORD_PEPPER, CSRF_SECRET
#      generate: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
#    - DATABASE_URL pointing to your local postgres

# 4. generate Prisma client + push schema + seed
npm --workspace @hoobiq/db run db:generate
npm --workspace @hoobiq/db run db:migrate -- --name init
npm --workspace @hoobiq/db run db:seed
```

## Running

```bash
# two terminals, or use `npm run dev` with a process manager
npm --workspace @hoobiq/api run dev   # http://localhost:4000/api/v1
npm --workspace @hoobiq/web run dev   # http://localhost:3000
```

## Security posture

- **Session tokens** — 384-bit random, stored as `sha256(token)` in DB, sent as httpOnly signed cookie. DB breach ≠ active sessions.
- **Passwords** — bcrypt cost 12 + server-side `PASSWORD_PEPPER`. Constant-time verify even on user-miss to prevent enumeration.
- **CSRF** — double-submit cookie pattern. State-changing routes require `X-CSRF-Token` header matching `hbq_csrf` cookie.
- **CORS** — strict allowlist (`WEB_ORIGIN`, `ADMIN_ORIGIN`), credentials required.
- **Rate limiting** — global 100/min/ip; login 10/min, register 5/min; Redis-backed in prod.
- **Input validation** — every endpoint body/query/params goes through a Zod schema from `@hoobiq/types`.
- **Webhooks** — CSRF-exempt but each handler MUST verify the provider signature before trusting payload. Midtrans verification is implemented; Komerce is stubbed.
- **Secrets** — `.env` never committed (`.gitignore` set); `.env.example` has placeholders only.
- **Helmet** — default secure headers on API responses; `frame-ancestors 'none'` prevents clickjacking.

## Performance posture

- Prisma connection pool (default 10) + PgBouncer in prod.
- Redis `cache-aside` helper on listing search (30s) and category tree (5m). Write paths invalidate via SCAN + UNLINK.
- Cursor-based pagination (take + 1 pattern) — no OFFSET scans.
- Proper indexes on all hot filter combinations (seller+created, category+created, status+autoRelease, etc).
- `dynamic = "force-dynamic"` only where truly dynamic; landing + static docs are cacheable at edge.

## What's implemented end-to-end

- ✅ Auth: register, login, logout, `/me`, session resolution, rate limits, constant-time compare
- ✅ Users: public profile by username, update self
- ✅ Listings: search (cached, cursor pagination), detail by slug, create, update, soft-delete
- ✅ Categories: cached tree
- ✅ Orders: checkout flow with atomic tx + payment creation; list/detail
- ✅ Payments: Midtrans provider with signature verification (webhook-safe)
- ✅ Webhooks: Midtrans handler that verifies sig, logs every call, promotes order to `paid`
- ✅ Admin: overview + audit endpoints (role-gated)
- ⏳ Shipping (Komerce), DM realtime (Socket.IO), EXP/badges, notifications — schemas in Prisma, modules to add

## Migration next steps from dummy → API

Web pages currently still use mock arrays are labeled in-line. To switch them to real data, follow the pattern used in `apps/web/app/marketplace/page.tsx`:

```ts
import { listingsApi } from "@/lib/api/listings";
const res = await listingsApi.search({ categorySlug: "pokemon", limit: 24 });
```

Add new endpoints by: (1) Zod schema in `packages/types/src/schemas`, (2) NestJS controller in `apps/api/src/modules/<x>/`, (3) fetch helper in `apps/web/lib/api/<x>.ts`.
