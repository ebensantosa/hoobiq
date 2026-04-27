# HOOBIQ — Project Context

> Baca file ini SEBELUM menjawab prompt apapun di project ini.
> Ini adalah source of truth untuk semua keputusan arsitektur.

## Apa itu Hoobiq

Marketplace + social media untuk kolektor hobi Indonesia (trading cards, action figures, blind box, merchandise, komik). Hybrid Tokopedia × Instagram × Discord untuk niche kolektor.

**USP**: escrow aman + komunitas terkurasi + sistem reputasi (badge/EXP).

## Stage Saat Ini

🚧 **LOCAL DEVELOPMENT ONLY** — belum ada deployment, belum ada CI/CD, belum ada Docker.
Fokus: bikin foundation yang jalan di laptop developer dulu. Infra belakangan.

## Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Web**: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- **API**: NestJS + TypeScript
- **DB**: PostgreSQL (install lokal) + Prisma
- **Cache/Queue**: Redis (install lokal) + BullMQ
- **Realtime**: Socket.IO via NestJS WebSocket Gateway
- **Auth**: Better Auth (httpOnly cookie + Google)
- **Storage**: Cloudflare R2 (sandbox bucket)
- **Search**: Meilisearch (install lokal)
- **Payment**: Midtrans Snap (sandbox mode) — abstracted via PaymentService interface
- **Shipping**: Komerce (sandbox mode) — abstracted via ShippingService interface
- **Admin**: Refine.dev
- **Notif**: Novu + Resend + FCM
- **Observability**: Sentry + PostHog (opsional di local, bisa di-skip dulu)

## Struktur Monorepo

```
hoobiq/
├── apps/
│   ├── web/        # Next.js user-facing (port 3000)
│   ├── api/        # NestJS (port 4000)
│   └── admin/      # Refine.dev (port 3001)
└── packages/
    ├── types/      # Zod schemas + types
    ├── ui/         # shadcn-based components
    ├── config/     # eslint, tsconfig, tailwind preset
    └── db/         # Prisma schema & client
```

## Domain Modules (NestJS)

auth, users, feeds, marketplace, categories, dm, exp, badges, orders, payments, shipping, notifications, admin, webhooks

## Design System (WAJIB dipakai)

Design tokens dari file `Kolektora_Designs_-_standalone.html` (di folder yang sama).

**Color palette**:
- `--ink-*`: dark surfaces (primary mode, ink-900 = app bg)
- `--gold-*`: reputation/EXP accent (gold-400 primary)
- `--crim-*`: commerce CTA (crim-400 primary, buy button)
- `--parch-*`: cream light surfaces (reading-heavy views)

**Typography**: Inter (body), Instrument Serif (display), JetBrains Mono (code)

**Vibe**: premium "display case" — dark gallery feel, gold = rare/reputation, crimson = action/commerce.

## Aturan Kode (NON-NEGOTIABLE)

1. TypeScript strict mode ON semua workspace
2. Env vars divalidasi pakai Zod (jangan akses `process.env` langsung)
3. API versioning `/api/v1/...` dari hari pertama
4. Module NestJS: folder terpisah (controller, service, dto/, entity/, interfaces/)
5. Payment & Shipping WAJIB abstracted via interface — jangan hardcode Midtrans/Komerce di business logic
6. Upload foto → R2; DB simpan URL saja
7. Rate limiting default ON (Throttler + Redis)
8. Webhook WAJIB verify signature
9. Secrets handling:
    - `.env.example` berisi placeholder
    - `.env` kosong (user isi manual)
    - Siapkan `.gitignore` untuk saat nanti init git

## Flow Transaksi (State Machine)

```
pending_payment → paid → awaiting_pickup → shipped → delivered → completed
     ↓              ↓           ↓              ↓           ↓
  expired       refunded    cancelled      disputed    disputed
```

1. Buyer checkout → hit Komerce shipping cost API → pilih kurir
2. Bayar via Midtrans Snap → webhook verify → status `paid` → dana di escrow ledger
3. Seller kirim → Hoobiq call Komerce pickup API → resi auto-generate → status `shipped`
4. Cron tiap 6 jam update tracking via Komerce
5. Buyer konfirmasi → status `completed` → payout ke seller (dikurangi platform fee)
6. Auto-release dana jika buyer diam >7 hari setelah `delivered`
7. Dispute → admin review chat + foto → refund/release manual

## Prerequisites Lokal (yang harus install di laptop)

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+ (install lokal)
- Redis 7+ (install lokal)
- Meilisearch (install lokal, ringan)

## Env Variables

Lihat `.env.example` lengkap.

Credentials yang perlu disiapkan manual:
- Midtrans Sandbox: Merchant ID, Client Key, Server Key, Webhook Signature Key
- Komerce Sandbox: Shipping API Key, Webhook Secret
- Cloudflare R2: Account ID, Access Keys, Bucket, Public URL
- Google OAuth: Client ID, Client Secret

## YANG DITUNDA (Jangan dikerjakan sekarang)

❌ Docker / docker-compose
❌ GitHub Actions / CI/CD
❌ Deploy workflow (Vercel, Railway)
❌ Git setup (belum dulu, fokus coding)
❌ Branch protection, Dependabot
❌ Turborepo remote cache

Semua di atas akan dikerjakan di fase berikutnya setelah MVP lokal jalan.
