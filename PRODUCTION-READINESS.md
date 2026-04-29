# Hoobiq — Production Readiness Status

Updated after the second hardening pass (Midtrans Snap + Email + KYC + Sentry + Boost).

## What's been hardened

| Area | Change |
|---|---|
| **Midtrans Snap (real integration)** | `MidtransProvider.createCharge` POSTs to Snap with proper item_details reconciliation, returns real `redirect_url`. `refund()` POSTs to `/v2/{order_id}/refund` with idempotency key. Webhook signature verification stays. New `MIDTRANS_ENV` env (sandbox/production). |
| **Checkout flow** | Order created → Snap charge fired → Payment row written → buyer bounces straight to Snap hosted page. Bypassed the old wait-page round-trip entirely. |
| **Email (Gmail SMTP)** | New `EmailService` via nodemailer + Gmail App Password. `OrdersService.notify()` now sends an HTML email alongside the in-app notification. Best-effort (SMTP failures log, never throw). |
| **Admin KTP review** | `/admin-panel/kyc` queue page with status tabs, side-by-side photo viewer, click-to-zoom, inline approve/reject flow. Three new endpoints on UsersController, all admin-gated, both decisions write `audit_entries`. |
| **Sentry** | `@sentry/node` (apps/api) + `@sentry/nextjs` (apps/web) with `beforeSend` redaction (no cookies, no payment payloads in error feed). Gated by `SENTRY_DSN` — no-op when unset. |
| **Boost listing** | Schema: `BoostPurchase` model. Three tiers (Rp 50k/7d, 90k/14d, 150k/30d). Owner-only "⚡ Boost listing" button on detail page → modal → Midtrans Snap. Webhook routes `BST-*` order_ids to `BoostService.markPaid`. |
| **Refunds** *(prior pass)* | Cancel / return / auto-cancel / dispute call `paymentProvider.refund()`. Failures audited + buyer notified `refund_failed`. |
| **Bank encryption** *(prior pass)* | AES-256-GCM keyed off `BANK_ENCRYPTION_KEY`. |
| **Rate limits** *(prior pass)* | Checkout, cancel, return, dispute, bank, boost throttled per IP. |
| **Stalled-payment sweep** *(prior pass)* | Orders pending_payment >24h auto-flip to `expired`. |
| **Auth guard** *(prior pass)* | Suspended/deleted users denied. |

## Env vars to set in prod (`apps/api/.env`)

```bash
# Database
DATABASE_URL=postgresql://...

# Auth & encryption
SESSION_SECRET=<openssl rand -hex 32>
CSRF_SECRET=<openssl rand -hex 32>
PASSWORD_PEPPER=<openssl rand -hex 24>
BANK_ENCRYPTION_KEY=<openssl rand -hex 32>

# Midtrans
MIDTRANS_ENV=sandbox              # flip to "production" on launch day
MIDTRANS_SERVER_KEY=Mid-server-...
MIDTRANS_CLIENT_KEY=Mid-client-...
MIDTRANS_SIGNATURE_KEY=<dashboard>

# Email (Gmail App Password — myaccount.google.com → Security → App passwords)
SMTP_USER=notif@hoobiq.id
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
EMAIL_FROM=Hoobiq <notif@hoobiq.id>

# Web base for return URLs + email CTAs
PUBLIC_API_BASE=https://api.hoobiq.com
PUBLIC_WEB_BASE=https://hoobiq.com

# Sentry
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# R2 storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=hoobiq-prod
R2_PUBLIC_URL=https://cdn.hoobiq.com
```

`apps/web/.env` should add `NEXT_PUBLIC_SENTRY_DSN=<same as SENTRY_DSN>`.

## Komerce status

The Komerce Payment integration code is still in the codebase but **no longer in the
critical path** — order checkout now hits Midtrans Snap directly. Komerce-related routes
(`/checkout/[humanId]/wait`, `/webhooks/komerce`, `/payments/komerce/*`) are dormant; safe
to delete in a follow-up commit once Midtrans is smoke-tested.

## Action items still requiring your input

### 1. Payout / withdrawal — manual ops review
**Need to know before I build:**
- Min withdrawal amount? (suggest Rp 50k or Rp 100k)
- Daily / weekly cap? (suggest Rp 5jt/day, Rp 30jt/week)
- Hard requirement: KTP `verified` before first payout? (recommend yes)
- Cooldown after rejection? (suggest 24h)

Tell me your numbers and I'll add `PayoutRequest` table + `/saldo` "tarik dana" form +
`/admin-panel/payout` queue.

### 2. Drops calendar
Skipped — needs editorial decisions:
- Who curates? Internal Hoobiq vs seller-self-serve with admin approval?
- Frequency? Weekly editorial drop or rolling?
- Reminder delivery? Push notif at H-1? Email?

### 3. CSRF
You said skip. Re-enable before public launch — important once payouts are live.

## Smoke tests before launch

1. **Sandbox happy path**: checkout → Snap pay → webhook fires → order = paid → email lands.
2. **Sandbox refund**: cancel-request → seller accepts → `audit_entries.action = order.refund.cancel` → check Midtrans dashboard.
3. **Sandbox boost**: buy a tier → Snap pay → webhook fires → `Listing.boostedUntil` updates → notification appears.
4. **KYC happy path**: submit KTP → admin approves → user can reach `/pengaturan/rekening` form.
5. **Sentry smoke**: throw `new Error("sentry-test")` in a server component → confirm Sentry issue stream catches it.

## Items shipping as-is

| Feature | State |
|---|---|
| Auth (signup, login, password change with cooldown, 2FA schema) | ✓ |
| Marketplace + multi-level checkbox filter | ✓ |
| Checkout → Midtrans Snap → /checkout/sukses | ✓ |
| Cart with real-time badge + add-to-cart modal | ✓ |
| Listing CRUD with min 3 photos | ✓ |
| Categories 3-level + request workflow | ✓ |
| Feed (mixed posts + listings) + IG-style composer | ✓ |
| Trade swipe deck | ✓ |
| DM with WhatsApp-style mobile layout + in-DM offer/negotiation | ✓ |
| Order detail + status timeline + cancel/return/dispute with real refund | ✓ |
| KTP submission + admin review | ✓ |
| Profile rating + reviews | ✓ |
| Boost listing (3 tiers, Snap-paid, stacks on top of existing) | ✓ |
| Toast system + loading states | ✓ |
| Mobile responsive | ✓ |
| Email notifications via Gmail SMTP | ✓ |
| Sentry error capture | ✓ |

## Suggested launch sequence

1. Set all env vars in prod (generate fresh secrets).
2. Smoke test 5 paths on sandbox for one full day.
3. Flip `MIDTRANS_ENV=production`, restart API.
4. Soft launch to closed group (50 collectors, invite-only) for 1 week.
5. Monitor Sentry; fix what breaks.
6. Re-enable CSRF.
7. Build payout flow once you decide rate-card / cap policies.
8. Decide drops curation model + build UI.
9. Public launch.
