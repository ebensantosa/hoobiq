import Link from "next/link";
import { TrustBadges } from "./trust-badges";
import { deriveTrustBadges } from "./trust-badges-derive";

export type Badge = {
  key: string;
  label: string;
  glyph: string;
  tone: "tcg" | "popmart" | "manga" | "figure" | "merch" | "trader" | "creator" | "veteran";
};

export type ProfileReview = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  buyer: { username: string; name: string | null; avatarUrl: string | null };
  listing: { slug: string; title: string };
};

export type Passport = {
  collectionValueIdr: number;
  collectionCount: number;
  postsCount: number;
  tradesCompleted: number;
  tradeRating: number;
  /** Total reviews used to compute tradeRating. 0 means rating is the
   *  legacy trustScore proxy and should be marked as "belum direview". */
  reviewCount?: number;
  reviews?: ProfileReview[];
  badges: Badge[];
};

export type PassportUser = {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  role: string;
  level: number;
  trustScore: number;
  createdAt: string;
};

const fmtIdrCompact = (n: number): string => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}jt`;
  if (n >= 1_000)         return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
};

/**
 * Editorial profile header — clean white/dark surface with bold typography,
 * inline stat ticker (no card-per-stat noise), and a discreet gradient ring
 * around the avatar as the only "decorative" element.
 */
export function PassportHero({
  user,
  passport,
  isOwn = false,
}: {
  user: PassportUser;
  passport: Passport;
  isOwn?: boolean;
}) {
  const joined = new Date(user.createdAt).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const isVerified = user.role === "verified" || user.role === "admin";
  // Rating tile shows when there's any signal worth showing — either real
  // buyer reviews on this seller's listings, or completed trades (legacy
  // trustScore proxy). Otherwise the third tile falls back to "Postingan".
  const showRating = (passport.reviewCount ?? 0) > 0 || passport.tradesCompleted > 0;

  return (
    <section
      aria-label="Profil"
      className="
        relative overflow-hidden rounded-3xl border border-rule bg-panel
        shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_20px_50px_-30px_rgba(0,0,0,0.15)]
      "
    >
      {/* Soft gradient corner accent — the only chrome */}
      <span
        aria-hidden
        className="
          pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full
          bg-[radial-gradient(closest-side,rgba(231,85,159,0.18),transparent)]
        "
      />
      <span
        aria-hidden
        className="
          pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full
          bg-[radial-gradient(closest-side,rgba(127,119,221,0.14),transparent)]
        "
      />

      <div className="relative px-6 pt-8 pb-6 md:px-10 md:pt-10">
        {/* Top row — avatar + name/handle/bio + actions */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-10">
          {/* LEFT — avatar + identity */}
          <div className="flex items-start gap-5 md:gap-6">
            {/* Avatar with gradient ring */}
            <div className="relative shrink-0">
              <span
                aria-hidden
                className="
                  absolute -inset-1 rounded-full
                  bg-[conic-gradient(from_180deg_at_50%_50%,#E7559F,#FAA74A,#7F77DD,#E7559F)]
                  opacity-90 blur-[1px]
                "
              />
              <div
                className="
                  relative grid h-24 w-24 place-items-center overflow-hidden rounded-full
                  bg-canvas ring-[3px] ring-canvas md:h-28 md:w-28
                "
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="
                      grid h-full w-full place-items-center
                      bg-gradient-to-br from-brand-500 via-flame-500 to-ultra-500
                    "
                  >
                    <span className="font-mono text-3xl font-extrabold text-white md:text-4xl">
                      {(user.name ?? user.username)[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              {/* Level chip pinned bottom-right of avatar */}
              <span
                className="
                  absolute -bottom-1 right-0 inline-flex items-center gap-1
                  rounded-full bg-fg px-2 py-0.5 font-mono text-[10px] font-bold text-canvas
                  ring-2 ring-canvas
                "
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                LV {user.level}
              </span>
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-fg md:text-[32px]">
                  {user.name ?? user.username}
                </h1>
              </div>
              <p className="mt-0.5 text-sm font-medium text-fg-subtle">{user.username}</p>

              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
                {user.city && (
                  <Meta icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}>
                    {user.city}
                  </Meta>
                )}
                <Meta icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>}>
                  Anggota sejak {joined}
                </Meta>
                <TrustInline user={user} verified={isVerified} />
              </p>

              {user.bio && (
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg">
                  {user.bio}
                </p>
              )}
            </div>
          </div>

          {/* RIGHT — actions */}
          <div className="flex items-center gap-2 md:pt-1">
            {isOwn ? (
              <>
                <Link
                  href="/pengaturan"
                  className="
                    inline-flex items-center gap-1.5 rounded-xl border border-rule
                    bg-canvas px-3.5 py-2 text-xs font-semibold text-fg transition-colors
                    hover:border-brand-400/50 hover:text-brand-500
                  "
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                  Edit profil
                </Link>
                <Link
                  href="/upload"
                  className="
                    inline-flex items-center gap-1.5 rounded-xl
                    bg-gradient-to-r from-brand-500 to-flame-500 px-4 py-2
                    text-xs font-bold text-white shadow-[0_8px_20px_-8px_rgba(231,85,159,0.55)]
                    transition-transform hover:-translate-y-0.5
                  "
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Pasang listing
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={`/dm?to=${user.username}`}
                  className="
                    inline-flex items-center gap-1.5 rounded-xl border border-rule
                    bg-canvas px-3.5 py-2 text-xs font-semibold text-fg transition-colors
                    hover:border-brand-400/50 hover:text-brand-500
                  "
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Pesan
                </Link>
                <Link
                  href={`/trades?to=${user.username}`}
                  className="
                    inline-flex items-center gap-1.5 rounded-xl
                    bg-gradient-to-r from-brand-500 to-flame-500 px-4 py-2
                    text-xs font-bold text-white shadow-[0_8px_20px_-8px_rgba(231,85,159,0.55)]
                    transition-transform hover:-translate-y-0.5
                  "
                >
                  Ajak trade
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Inline stat ticker — no individual cards, divided by hairlines */}
        <dl
          className="
            mt-7 grid grid-cols-3 divide-x divide-rule rounded-2xl border border-rule bg-canvas/60
            overflow-hidden
          "
        >
          {showRating ? (
            <>
              <StatCell label="Rating"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Stars value={passport.tradeRating} size={14} />
                    <span>{passport.tradeRating.toFixed(1)}</span>
                  </span>
                }
                hint={
                  (passport.reviewCount ?? 0) > 0
                    ? `${passport.reviewCount} review`
                    : `${passport.tradesCompleted} trade selesai`
                }
              />
              <StatCell label="Koleksi" value={passport.collectionCount.toLocaleString("id-ID")} hint="item aktif" />
              <StatCell label="Total nilai" value={fmtIdrCompact(passport.collectionValueIdr)} hint="harga listing" />
            </>
          ) : (
            <>
              <StatCell label="Koleksi" value={passport.collectionCount.toLocaleString("id-ID")} hint="item aktif" />
              <StatCell label="Postingan" value={passport.postsCount.toLocaleString("id-ID")} hint="total post" />
              <StatCell label="Total nilai" value={fmtIdrCompact(passport.collectionValueIdr)} hint="harga listing" />
            </>
          )}
        </dl>

        {passport.badges.length > 0 && <BadgeStrip badges={passport.badges} username={user.username} />}

        {(passport.reviews?.length ?? 0) > 0 && (
          <ReviewsStrip reviews={passport.reviews ?? []} />
        )}
      </div>
    </section>
  );
}

/** Star row, half-stars rounded to nearest .5. Pure presentational. */
function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="inline-flex" aria-label={`${value.toFixed(1)} dari 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = i < full || (i === full && half);
        return (
          <svg
            key={i}
            width={size} height={size} viewBox="0 0 24 24"
            fill={fill ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.6"
            className="text-amber-500"
          >
            <path d="M12 .587l3.668 7.568L24 9.75l-6 5.91L19.336 24 12 19.897 4.664 24 6 15.66 0 9.75l8.332-1.595z"/>
          </svg>
        );
      })}
    </span>
  );
}

/**
 * Recent buyer reviews shown under the badge strip on the seller's
 * profile. Up to 5 most recent — anything older lives on the listing
 * detail page itself.
 */
function ReviewsStrip({ reviews }: { reviews: ProfileReview[] }) {
  return (
    <div className="mt-6 rounded-2xl border border-rule bg-panel">
      <header className="flex items-center justify-between border-b border-rule px-5 py-3">
        <h3 className="text-sm font-bold text-fg">Review terbaru dari pembeli</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          {reviews.length} terakhir
        </span>
      </header>
      <ul className="divide-y divide-rule">
        {reviews.map((r) => (
          <li key={r.id} className="px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-panel-2 font-bold text-fg-muted">
                {r.buyer.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.buyer.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (r.buyer.name ?? r.buyer.username)[0]?.toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{r.buyer.name ?? r.buyer.username}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <Stars value={r.rating} size={12} />
                  <Link href={`/listing/${r.listing.slug}`} className="truncate text-[11px] text-fg-subtle hover:underline">
                    {r.listing.title}
                  </Link>
                </div>
              </div>
              <span className="font-mono text-[10px] text-fg-subtle">
                {new Date(r.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
              </span>
            </div>
            {r.body && (
              <p className="mt-2 line-clamp-3 text-sm text-fg-muted">{r.body}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Prominent badge row at the bottom of the passport. Per spec: "pas
 * dapat badge, UI nya yang keliatan banget" — bigger glyphs, named
 * label, soft tinted card, with a clear "Lihat koleksi badge" CTA so
 * the visitor can land on the full collection page.
 */
function BadgeStrip({ badges, username }: { badges: Badge[]; username: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-rule bg-gradient-to-br from-brand-50 to-ultra-50 p-4 dark:from-brand-400/10 dark:to-ultra-400/10">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">
          Achievements
        </h3>
        <a
          href={`/u/${encodeURIComponent(username)}/badges`}
          className="text-xs font-semibold text-brand-500 hover:underline"
        >
          Lihat koleksi badge →
        </a>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        {badges.map((b) => (
          <div
            key={b.key}
            className="flex items-center gap-2 rounded-xl border border-rule bg-panel/85 px-3 py-2 shadow-sm backdrop-blur transition-transform hover:-translate-y-0.5"
            title={b.label}
          >
            <span className="text-2xl leading-none">{b.glyph}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight text-fg">{b.label}</p>
              <p className="text-[10px] uppercase tracking-wider text-fg-subtle">{b.tone}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      {children}
    </span>
  );
}

function TrustInline({ user, verified }: { user: PassportUser; verified: boolean }) {
  const u = user as PassportUser & { tradesCompleted?: number; avgShipHours?: number | null };
  const badges = deriveTrustBadges({
    kycVerified: verified,
    trustScore: user.trustScore,
    tradesCompleted: u.tradesCompleted,
    avgShipHours: u.avgShipHours ?? null,
  }).filter((b) => b.key !== "verified");
  if (badges.length === 0) return null;
  return <TrustBadges badges={badges} size="xs" />;
}

function StatCell({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="px-4 py-3.5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle">{label}</p>
      <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-fg">{value}</p>
      {hint && <p className="text-[11px] text-fg-subtle">{hint}</p>}
    </div>
  );
}
