# Hoobiq — Production Readiness Status

Updated after the production-readiness sweep.

## What's been hardened

| Area | Change |
|---|---|
| **Checkout success page** | Reads real order from `?o=<humanId>`, redirects to `/pesanan` if no id, refuses to render dummy data. |
| **Refunds** | Cancel, return-completion, auto-cancel-on-no-shipment, and dispute-decided-against-seller now all call `paymentProvider.refund()`. Failures land in `audit_entries` and notify the buyer with `refund_failed` so ops can manually reconcile. |
| **Bank account at-rest encryption** | New `apps/api/src/modules/banks/encryption.ts` — AES-256-GCM keyed off `BANK_ENCRYPTION_KEY` (env). Legacy `enc:<plain>` rows still readable; re-encrypted on first update. |
| **Rate limits** | Added `@Throttle` to checkout (5/min), cancel (3/min), return (3/min), dispute (2/min), bank create (5/min). |
| **Stalled-payment sweep** | `OrdersScheduler` gains `sweepStalledPayment` — orders in `pending_payment` >24h → `expired`, with audit row. |
| **Auth guard hardening** | `resolveSession` rejects users with `status !== "active"` or `deletedAt` set, even with a valid cookie. |
| **Webhook idempotency** | De-facto idempotent already: both Midtrans and Komerce webhook handlers guard on `order.status === "pending_payment"` before calling `markPaid`. Re-fired webhooks are no-ops. |

## Action required before production launch

These need **business decisions** or **third-party credentials** — I can wire the code once you decide.

### 1. Payment provider — pick one

`MidtransProvider` is currently a stub (returns fake redirect URLs, no real refund). Decisions needed:

- **Komerce as primary**: it's already wired live (you've tested sandbox). Drop Midtrans entirely or keep as fallback?
- **Sub-merchant aggregator vs direct**: are you onboarding via Komerce as your aggregator, or going direct to BCA / Mandiri APIs? This affects fee structure and KYC.
- **Live API keys**: replace `KOMERCE_PAYMENT_API_KEY` and `KOMERCE_QRISLY_API_KEY` env values with prod keys.

**Until decided:** any code path that hits Midtrans (checkout default flow if ever picked, refund) will silently no-op or 500.

### 2. Email/SMS provider

`OrdersService.notify()` writes to the `notifications` table only. There's no email or SMS delivery yet. Decisions needed:

- **Provider**: Resend (cheapest, Next.js-friendly), SendGrid, AWS SES, or Mailgun?
- **From-domain**: probably `notif@hoobiq.id` — needs DNS records (SPF, DKIM, DMARC) at Cloudflare.
- **SMS for OTP / shipping updates**: needed at all? Twilio Indonesia has decent coverage but pricey.

**Until decided:** buyers/sellers only see in-app notifications — they won't get pinged when stuck order is auto-cancelled or trade offer fires.

### 3. Payout / withdrawal flow

`WalletController` computes balance but has no withdrawal endpoint. Sellers cannot cash out. Decisions needed:

- **Manual review by ops** vs **auto-disburse via aggregator** (Xendit, Komerce, Flip)?
- **Frequency**: instant, T+1, T+3, weekly?
- **Fee model**: fixed Rp X per withdrawal? Percentage? Free above threshold?
- **Min withdrawal amount**: Rp 50.000? 100.000?
- **KYC tier**: must `ktpStatus="verified"` before first payout? After Rp X cumulative volume?

**Until decided:** sellers see balance accumulate but can't move it. Will churn after 2-3 unfulfilled cycles.

### 4. KTP review queue

`/pengaturan/verifikasi-ktp` writes the rows; the schema fields exist (`ktpStatus`, `ktpFrontUrl`, `ktpSelfieUrl`, etc.) but **no admin UI to approve/reject yet**. Decisions needed:

- **Who reviews** — internal ops, outsourced to a KYC vendor (Privy, Tanda, Vida)?
- **Auto-OCR + face-match** vs full manual?
- **SLA**: 1×24h promised in the buyer-facing UI; staffing to honour?

**Until decided:** sellers submit KTP and it sits in `pending` forever — blocking payout-rekening creation.

### 5. CSRF

Currently disabled (see `apps/api/src/common/csrf/csrf.module.ts`). Defence is `SameSite=Lax` cookie + strict CORS allowlist. That covers most cases but not edge ones (e.g., a browser bug that allows Lax on POST from a top-level navigation).

**Recommendation**: re-enable double-submit CSRF before public launch. The csrf-csrf v3 lib was broken at the time it was disabled — alternative is hand-rolled middleware (~30 lines).

### 6. Observability

- **No error tracking** (Sentry / Honeybadger / etc).
- **No structured logs** beyond pm2's stdout.
- **No alerting** when scheduler crashes, webhook signature fails repeatedly, refund fails.

**Recommendation**: add Sentry SDK to both `apps/web` and `apps/api`. Free tier covers low-volume.

### 7. Boost / Drops UI

Schema and API exist. Frontend doesn't surface them. Decisions needed:

- **Boost pricing model** — fixed Rp X per N days? Auction? Position-based?
- **Drops curation** — manually editorialised by Hoobiq team or self-serve from sellers?
- **Visibility** — calendar view only, or mixed into Home page strip?

**Until decided:** these features will quietly miss launch.

## Items that ship as-is

| Feature | State |
|---|---|
| Auth (signup, login, password change, 2FA-ready schema) | ✓ |
| Marketplace browsing + filters | ✓ |
| Checkout via Komerce sandbox | ✓ working sandbox flow |
| Cart persistence + real-time badge | ✓ |
| Listing CRUD with min 3 photos | ✓ |
| Categories with 3-level tree + request workflow | ✓ |
| Feed (posts + listings interleaved) | ✓ |
| Trade swipe deck | ✓ |
| DM with WhatsApp-style mobile layout | ✓ |
| In-DM offer/negotiation flow → checkout | ✓ |
| Order detail + status timeline | ✓ |
| Cancel / return / dispute flows | ✓ now with refund call |
| KTP submission (admin review pending) | ⚠ submission works, no admin queue |
| Profile rating + reviews | ✓ |
| Toast system + loading states | ✓ |
| Mobile responsive (header, nav, padding, DM) | ✓ |

## Suggested launch sequence

1. **Pick payment provider** (Komerce-only is fastest) → set live keys → smoke test 3 real transactions.
2. **Pick email provider** → wire `OrdersService.notify()` to send email (1-day work).
3. **Build admin KTP review page** (1-day work) so the verification queue clears.
4. **Re-enable CSRF** (1-day work).
5. **Add Sentry** (½ day).
6. Soft launch to a closed group (50 collectors invited) for 2 weeks.
7. Monitor + fix what breaks.
8. Public launch.

Skipping any of #1–4 means real users will hit broken paths in production.
