import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ListingCard } from "@/components/listing-card";
import { PilihanTabs } from "@/components/home/pilihan-tabs";
import { HeroSlider, type HeroBanner as HeroBannerData } from "@/components/home/hero-slider";
import { CardArt, pickArt } from "@/components/card-art";
import type { ListingSummary } from "@hoobiq/types";

/** Shape of the category data we surface on the home page. */
export type HomeCategory = {
  id: string;
  slug: string;
  name: string;
  level: number;
  imageUrl: string | null;
  listingCount: number;
  children: HomeCategory[];
};

export type HomeStats = {
  collection: number;
  wishlist: number;
  orders: number;
  rating: number;
  verified: boolean;
};

/**
 * Logged-in marketplace home — V1 of the redesigned layout per the
 * mockup. Top-down structure:
 *
 *   1. Hero banner — full-width gradient + CTA. Static for V1; an
 *      admin CMS pass will let ops swap image/title/CTA without code
 *      edits, but the layout below is built so that only the inner
 *      <HeroBanner> needs to swap to a CMS-driven variant later.
 *   2. Quick stats — Koleksimu / Wishlist / Transaksi / Rating + a
 *      Verified Seller trust card.
 *   3. Category grid — visual circle cards driven by the live category
 *      tree (with imageUrl when admin set one, gradient fallback otherwise).
 *   4. "Pilihan Untukmu" — tabbed product grid (Semua / Baru / Terlaris
 *      / Rare). Tabs are client-side; the server hands the full pool.
 *   5. Trending Minggu Ini — small horizontal scroller.
 *   6. Rare / Premium Collection — dark-gradient standout cards.
 *   7. Trust / Benefit — five static promise cards.
 *
 * The previous "Halo, {username}" greeting + dashboard tone is gone —
 * the page now leads with product, not personalisation, matching the
 * mockup's marketplace-first feel.
 */
export function HomeFeed({
  username,
  categories,
  boosted,
  trending,
  popular,
  fresh,
  stats,
  banners,
}: {
  username: string;
  categories: HomeCategory[];
  boosted: ListingSummary[];
  trending: ListingSummary[];
  popular: ListingSummary[];
  fresh: ListingSummary[];
  stats: HomeStats;
  banners: HeroBannerData[];
}) {
  // Pool for the "Pilihan Untukmu" tabs — boosted on top so Terlaris's
  // boosted-first heuristic surfaces them, then dedupe.
  const seen = new Set<string>();
  const pool = [...boosted, ...trending, ...popular, ...fresh].filter((l) => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });

  return (
    <AppShell active="Home">
      <div className="px-4 pb-16 sm:px-6 lg:px-10">
        <HeroSlider banners={banners} />

        {/* Quick stats are dashboard-y — hide on mobile per the latest
            UX feedback. Mobile home flows hero → kategori → produk
            so the buyer sees products as fast as possible. */}
        <div className="hidden md:block">
          <QuickStats stats={stats} />
        </div>

        {categories.length > 0 && (
          <SectionHeader
            title="Jelajahi Kategori"
            href="/kategori"
            ctaLabel="Lihat semua"
          />
        )}
        {categories.length > 0 && (
          <CategoryRow categories={categories} />
        )}

        <div className="mt-12">
          <SectionHeader title="Pilihan Untukmu" />
          <PilihanTabs listings={pool} meUsername={username} />
        </div>

        {trending.length > 0 && (
          <div className="mt-12">
            <SectionHeader
              title="Trending Minggu Ini"
              href="/marketplace?sort=trending"
              ctaLabel="Lihat semua"
            />
            <TrendingStrip items={trending.slice(0, 5)} />
          </div>
        )}

        {popular.length > 0 && (
          <div className="mt-12">
            <SectionHeader
              title="Rare Collection"
              href="/marketplace?sort=trending"
              ctaLabel="Lihat semua"
            />
            <PremiumGrid items={popular.slice(0, 5)} />
          </div>
        )}

        <TrustSection />

        {pool.length === 0 && (
          <div className="mt-10 rounded-2xl border border-rule bg-panel/40 p-10 text-center text-fg-muted">
            Belum ada listing untuk ditampilkan.{" "}
            <Link href="/upload" className="font-semibold text-brand-500">
              Pasang listing pertama
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------- */
/*  Hero banner — V1 static. CMS-driven variant lives behind the same    */
/*  visual contract so the swap later is a single component change.      */
/* -------------------------------------------------------------------- */

function HeroBanner() {
  return (
    <section className="relative mt-2 overflow-hidden rounded-2xl border border-rule bg-gradient-to-br from-brand-100 via-ultra-100 to-flame-100 dark:from-brand-500/10 dark:via-ultra-500/10 dark:to-flame-500/10">
      <div className="grid items-center gap-6 p-6 sm:p-10 md:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="inline-block rounded-full bg-brand-500/15 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
            Featured Collection
          </span>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-fg sm:text-4xl md:text-5xl">
            Temukan Koleksi{" "}
            <span className="bg-gradient-to-r from-brand-500 via-ultra-500 to-flame-500 bg-clip-text text-transparent">
              Premium &amp; Langka
            </span>
          </h1>
          <p className="mt-3 max-w-md text-sm text-fg-muted sm:text-base">
            Dari kartu langka hingga figure eksklusif, semua ada di Hoobiq.
          </p>
          <Link
            href="/marketplace"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-brand-500 px-6 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/30"
          >
            Jelajahi Sekarang
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        {/* Visual side — deliberately abstract until CMS hero ships;
            the gradient + floating cards read as "premium collection"
            without needing a real photo asset. */}
        <div className="relative hidden h-56 md:block">
          <div className="absolute right-8 top-2 h-44 w-32 rotate-[-8deg] rounded-xl border-2 border-amber-300/60 bg-gradient-to-br from-amber-200 to-amber-400 shadow-xl">
            <div className="m-2 h-20 rounded-md bg-amber-50/80" />
            <div className="mx-2 mt-2 h-2 rounded-full bg-amber-700/40" />
            <div className="mx-2 mt-1 h-2 w-2/3 rounded-full bg-amber-700/30" />
          </div>
          <div className="absolute right-32 top-8 h-44 w-32 rotate-[4deg] rounded-xl border-2 border-rose-300/60 bg-gradient-to-br from-rose-200 to-rose-400 shadow-xl">
            <div className="m-2 h-20 rounded-md bg-rose-50/80" />
            <div className="mx-2 mt-2 h-2 rounded-full bg-rose-700/40" />
            <div className="mx-2 mt-1 h-2 w-2/3 rounded-full bg-rose-700/30" />
          </div>
          <div className="absolute right-56 top-12 h-44 w-32 rotate-[-3deg] rounded-xl border-2 border-violet-300/60 bg-gradient-to-br from-violet-200 to-violet-400 shadow-xl">
            <div className="m-2 h-20 rounded-md bg-violet-50/80" />
            <div className="mx-2 mt-2 h-2 rounded-full bg-violet-700/40" />
            <div className="mx-2 mt-1 h-2 w-2/3 rounded-full bg-violet-700/30" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- */
/*  Quick Stats — Koleksimu / Wishlist / Transaksi / Rating + Verified    */
/* -------------------------------------------------------------------- */

function QuickStats({ stats }: { stats: HomeStats }) {
  return (
    <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      <StatCard
        href="/jual"
        label="Koleksimu"
        value={stats.collection}
        suffix="Item"
        sub="Lihat koleksi"
        accent="brand"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.5 9.4 7.5 4.21" />
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <path d="M3.27 6.96 12 12.01l8.73-5.05" />
            <path d="M12 22.08V12" />
          </svg>
        }
      />
      <StatCard
        href="/wishlist"
        label="Wishlist"
        value={stats.wishlist}
        suffix="Item"
        sub="Lihat wishlist"
        accent="rose"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        }
      />
      <StatCard
        href="/pesanan"
        label="Transaksi"
        value={stats.orders}
        suffix="Deal"
        sub="Riwayat transaksi"
        accent="emerald"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        }
      />
      <StatCard
        href={`/u/${encodeURIComponent("")}`}
        label="Rating"
        value={stats.rating.toFixed(1)}
        suffix=""
        sub="Trust score"
        accent="amber"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2 14.6 8.4 21.5 9 16.3 13.6 17.9 20.5 12 17 6.1 20.5 7.7 13.6 2.5 9 9.4 8.4Z" />
          </svg>
        }
      />

      {/* Verified Seller — promo card spanning 2 cols on tablet, 1 on
          desktop's 5-col grid. Click goes to KYC settings if user
          isn't verified, profile otherwise. */}
      <Link
        href={stats.verified ? "/pengaturan" : "/pengaturan/verifikasi-ktp"}
        className="col-span-2 flex items-center gap-3 rounded-2xl border border-brand-400/30 bg-gradient-to-br from-brand-500/10 to-ultra-500/10 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400/60 hover:shadow-lg sm:col-span-2 lg:col-span-1"
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500/20 text-brand-600 dark:text-brand-400">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">Verified Seller</p>
          <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">
            {stats.verified
              ? "Akun kamu sudah terverifikasi untuk transaksi yang aman."
              : "Verifikasi KTP buat dapet badge & trust ekstra."}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-brand-500">Selengkapnya →</p>
        </div>
      </Link>
    </section>
  );
}

function StatCard({
  href, label, value, suffix, sub, accent, icon,
}: {
  href: string;
  label: string;
  value: number | string;
  suffix: string;
  sub: string;
  accent: "brand" | "rose" | "emerald" | "amber";
  icon: React.ReactNode;
}) {
  const tone = {
    brand:   "bg-brand-500/15 text-brand-600 dark:text-brand-400",
    rose:    "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    amber:   "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  }[accent];
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-rule bg-panel p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400/40 hover:shadow-md"
    >
      <div className={"grid h-11 w-11 shrink-0 place-items-center rounded-xl " + tone}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-fg-subtle">{label}</p>
        <p className="mt-0.5 text-xl font-extrabold text-fg">
          {value}
          {suffix && <span className="ml-1 text-xs font-semibold text-fg-muted">{suffix}</span>}
        </p>
        <p className="mt-0.5 text-[11px] text-fg-muted">{sub}</p>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------- */
/*  Section header reused across the home page                           */
/* -------------------------------------------------------------------- */

function SectionHeader({
  title, href, ctaLabel,
}: {
  title: string;
  href?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="mt-10 flex items-end justify-between gap-3">
      <h2 className="text-xl font-bold text-fg sm:text-2xl">{title}</h2>
      {href && ctaLabel && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500 hover:text-brand-600">
          {ctaLabel} <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/*  Categories — visual circle cards, horizontal scroll on overflow      */
/* -------------------------------------------------------------------- */

function CategoryRow({ categories }: { categories: HomeCategory[] }) {
  // Tone palette per primary slug — gives each card a distinct
  // pastel background when the admin hasn't uploaded an image yet.
  const tones: Record<string, string> = {
    "collection-cards": "from-emerald-200 to-emerald-100 dark:from-emerald-400/25 dark:to-emerald-500/10",
    "trading-cards":    "from-rose-200 to-rose-100 dark:from-rose-400/25 dark:to-rose-500/10",
    "merchandise":      "from-amber-200 to-amber-100 dark:from-amber-400/25 dark:to-amber-500/10",
    "toys":             "from-orange-200 to-orange-100 dark:from-orange-400/25 dark:to-orange-500/10",
    "others":           "from-sky-200 to-sky-100 dark:from-sky-400/25 dark:to-sky-500/10",
  };
  return (
    <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-visible px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((c) => {
        const tone = tones[c.slug] ?? "from-brand-200 to-brand-100 dark:from-brand-400/25 dark:to-brand-500/10";
        return (
          <Link
            key={c.id}
            href={`/kategori/${c.slug}`}
            className="group relative flex h-28 w-32 shrink-0 snap-start flex-col justify-end overflow-hidden rounded-2xl border border-rule transition-all hover:-translate-y-0.5 hover:border-brand-400/60 hover:shadow-md sm:h-32 sm:w-36"
          >
            {c.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
              </>
            ) : (
              <span className={"absolute inset-0 bg-gradient-to-br " + tone} />
            )}
            <p
              className={
                "relative z-10 px-3 pb-3 text-xs font-bold leading-tight " +
                (c.imageUrl ? "text-white drop-shadow-sm" : "text-fg")
              }
            >
              {c.name}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

function categoryIcon(slug: string): React.ReactNode {
  const props = { width: 38, height: 38, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (slug) {
    case "collection-cards":
    case "trading-cards":
      return (
        <svg {...props}>
          <rect x="2" y="6" width="14" height="16" rx="2"/>
          <path d="M6 6V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2"/>
        </svg>
      );
    case "merchandise":
      return (
        <svg {...props}>
          <path d="M20.4 7.5 16 4l-2 2-2-2-2 2-2-2-4.4 3.5L5 12h2v8h10v-8h2z"/>
        </svg>
      );
    case "toys":
      return (
        <svg {...props}>
          <path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4z"/>
          <path d="M5 22h14l-1.5-9h-11z"/>
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      );
  }
}

/* -------------------------------------------------------------------- */
/*  Trending strip — small horizontal cards with HOT/RARE/NEW labels    */
/* -------------------------------------------------------------------- */

function TrendingStrip({ items }: { items: ListingSummary[] }) {
  function badge(l: ListingSummary): { label: string; tone: string } | null {
    if (l.boosted) return { label: "HOT", tone: "bg-flame-500 text-white" };
    if (l.condition === "BRAND_NEW_SEALED") return { label: "RARE", tone: "bg-amber-500 text-white" };
    const ageDays = (Date.now() - +new Date(l.createdAt)) / 86_400_000;
    if (ageDays < 3) return { label: "NEW", tone: "bg-brand-500 text-white" };
    return null;
  }
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {items.map((l) => {
        const b = badge(l);
        return (
          <Link
            key={l.id}
            href={`/listing/${l.slug}`}
            className="flex items-center gap-3 rounded-xl border border-rule bg-panel p-3 transition-all hover:-translate-y-0.5 hover:border-brand-400/50 hover:shadow-md"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-panel-2">
              {l.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.cover} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              ) : (
                <CardArt variant={pickArt(l.slug)} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-xs font-semibold text-fg">{l.title}</p>
              <p className="mt-0.5 text-[11px] font-extrabold text-brand-600 dark:text-brand-400">
                Rp {l.priceIdr.toLocaleString("id-ID")}
              </p>
              {b && (
                <span className={"mt-1 inline-block rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider " + b.tone}>
                  {b.label}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/*  Premium grid — dark-gradient cards with rare-collection labels      */
/* -------------------------------------------------------------------- */

function PremiumGrid({ items }: { items: ListingSummary[] }) {
  const labels = ["ULTRA RARE", "LEGENDARY", "GEM MINT", "ICONIC", "PREMIUM"];
  const tones = [
    "from-violet-600 to-fuchsia-600",
    "from-amber-500 to-rose-500",
    "from-emerald-500 to-teal-500",
    "from-rose-500 to-flame-500",
    "from-brand-500 to-ultra-500",
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((l, i) => (
        <Link
          key={l.id}
          href={`/listing/${l.slug}`}
          className={
            "group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl " +
            (tones[i % tones.length] ?? tones[0])
          }
        >
          {l.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={l.cover}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-overlay transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
          )}
          <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-fg shadow">
            {labels[i % labels.length]}
          </span>
          <div className="relative z-10">
            <p className="line-clamp-2 text-sm font-bold drop-shadow-md">{l.title}</p>
            <p className="mt-1 text-base font-extrabold drop-shadow-md">
              Rp {l.priceIdr.toLocaleString("id-ID")}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/*  Trust / Benefit row                                                 */
/* -------------------------------------------------------------------- */

function TrustSection() {
  const items = [
    { title: "100% Original",   sub: "Semua produk dijamin 100% original.",         color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg> },
    { title: "Transaksi Aman",  sub: "Sistem escrow melindungi setiap transaksi.",  color: "bg-brand-500/15 text-brand-600 dark:text-brand-400",       icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
    { title: "Seller Terpercaya", sub: "Diverifikasi dengan rating & reputasi.",     color: "bg-amber-500/15 text-amber-600 dark:text-amber-400",       icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 14.6 8.4 21.5 9 16.3 13.6 17.9 20.5 12 17 6.1 20.5 7.7 13.6 2.5 9 9.4 8.4Z"/></svg> },
    { title: "Pengiriman Aman", sub: "Packing rapi & asuransi pengiriman.",         color: "bg-sky-500/15 text-sky-600 dark:text-sky-400",             icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg> },
    { title: "Komunitas Aktif", sub: "Bergabung dengan ribuan kolektor Indonesia.", color: "bg-ultra-500/15 text-ultra-600 dark:text-ultra-400",       icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  ];
  return (
    <section className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((it) => (
        <div key={it.title} className="flex items-center gap-3 rounded-2xl border border-rule bg-panel p-4">
          <div className={"grid h-10 w-10 shrink-0 place-items-center rounded-xl " + it.color}>
            {it.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-fg">{it.title}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">{it.sub}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
