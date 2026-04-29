import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ListingCard } from "@/components/listing-card";
import { conditionLabel } from "@/lib/condition-badge";
import type { ListingSummary } from "@hoobiq/types";

/** Shape of the category data we surface in the top strip. */
export type HomeCategory = {
  id: string;
  slug: string;
  name: string;
  level: number;
  listingCount: number;
  children: HomeCategory[];
};

/**
 * The logged-in home page — purposely distinct from /marketplace (the
 * filterable grid) and /feeds (the social timeline). Spec says clicking
 * the Hoobiq logo lands here, with viral/popular/boosted/general grids.
 *
 * Sections, top to bottom:
 *   1. Boosted now — paid placements, large cards
 *   2. Viral / trending — top by recent views
 *   3. Populer — top by all-time views
 *   4. Grid — most recent across the marketplace
 *
 * Each section reuses ListingCard so condition pills, location, and
 * boost badges stay consistent. If a section is empty (e.g. no boosts
 * active right now), it just doesn't render.
 */
export function HomeFeed({
  username,
  categories,
  boosted,
  trending,
  popular,
  fresh,
}: {
  username: string;
  /** Top-level categories rendered as a horizontal pill strip directly
   *  beneath the welcome header. Profile-page placement was easy to miss;
   *  this puts the entry-points in the buyer's primary line of sight. */
  categories: HomeCategory[];
  boosted: ListingSummary[];
  trending: ListingSummary[];
  popular: ListingSummary[];
  fresh: ListingSummary[];
}) {
  return (
    <AppShell active="Home">
      <div className="px-6 pb-12 lg:px-10">
        <header className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg md:text-4xl">
            Halo, {username}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">
            Etalase Hoobiq hari ini — yang lagi viral, paling dicari, dan
            listing baru langsung dari kolektor.
          </p>
        </header>

        {categories.length > 0 && <CategoryStrip categories={categories} />}

        {boosted.length > 0 && (
          <Section
            kicker="Sponsored · Boost aktif"
            title="Lagi disorot"
            href="/marketplace?sort=trending"
            ctaLabel="Lihat semua trending →"
          >
            <BoostStrip items={boosted.slice(0, 6)} />
          </Section>
        )}

        {trending.length > 0 && (
          <Section
            kicker="Trending"
            title="Viral minggu ini"
            href="/marketplace?sort=trending"
            ctaLabel="Lihat semua →"
          >
            <Grid items={trending.slice(0, 8)} />
          </Section>
        )}

        {popular.length > 0 && (
          <Section
            kicker="Most viewed"
            title="Paling populer"
            href="/marketplace?sort=trending"
            ctaLabel="Lihat lebih banyak →"
          >
            <Grid items={popular.slice(0, 8)} />
          </Section>
        )}

        {fresh.length > 0 && (
          <Section
            kicker="Baru di Hoobiq"
            title="Listing terbaru"
            href="/marketplace"
            ctaLabel="Buka marketplace →"
          >
            <Grid items={fresh.slice(0, 12)} />
          </Section>
        )}

        {boosted.length === 0 && trending.length === 0 && popular.length === 0 && fresh.length === 0 && (
          <div className="mt-10 rounded-2xl border border-rule bg-panel/40 p-10 text-center text-fg-muted">
            Belum ada listing untuk ditampilkan.{" "}
            <Link href="/upload" className="font-semibold text-brand-500 hover:underline">
              Pasang listing pertama →
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/**
 * Top-of-home category strip. Per-category quick-jump card with an
 * accent gradient + listing count, plus a "Lihat semua" rail link to
 * the full /kategori page. Sits right after the welcome header so
 * buyers see entry-points before any listings load.
 *
 * Each card links to /kategori/<slug>: for level-1 categories with
 * children that page renders the next-level kotak picker; for
 * leaf-level it redirects straight to /marketplace?cat=<slug>. Either
 * way, this strip is the spec-aligned "klik kategori" entry point.
 */
function CategoryStrip({ categories }: { categories: HomeCategory[] }) {
  // Tone palette keyed by slug — each card gets a distinct gradient so
  // the strip reads as five visually-different entry points instead of
  // a row of identical pills. Falls back to a neutral mix for slugs
  // we don't recognize (legacy or future categories).
  const TONES: Record<string, string> = {
    "collection-cards": "from-emerald-100 to-emerald-50 dark:from-emerald-400/15 dark:to-emerald-400/5",
    "trading-cards":    "from-brand-100 to-brand-50 dark:from-brand-400/15 dark:to-brand-400/5",
    "merchandise":      "from-sky-100 to-sky-50 dark:from-sky-400/15 dark:to-sky-400/5",
    "toys":             "from-ultra-100 to-ultra-50 dark:from-ultra-400/15 dark:to-ultra-400/5",
    "others":           "from-flame-100 to-flame-50 dark:from-flame-400/15 dark:to-flame-400/5",
  };
  const fallback = "from-brand-50 to-ultra-50 dark:from-brand-400/10 dark:to-ultra-400/10";

  return (
    <section className="mt-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-500">
            Jelajah kategori
          </span>
          <h2 className="mt-1 text-base font-bold text-fg">Pilih dari mana mau mulai</h2>
        </div>
        <Link href="/kategori" className="text-xs font-semibold text-brand-500 hover:underline">
          Lihat semua →
        </Link>
      </div>
      <div className="-mx-6 mt-3 flex gap-3 overflow-x-auto px-6 pb-1 lg:-mx-10 lg:px-10">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/kategori/${c.slug}`}
            className={
              "group relative flex w-40 shrink-0 flex-col gap-2 overflow-hidden rounded-2xl border border-rule p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400/60 hover:shadow-[0_8px_24px_-12px] hover:shadow-brand-400/40 bg-gradient-to-br " +
              (TONES[c.slug] ?? fallback)
            }
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/85 text-fg shadow-sm backdrop-blur dark:bg-canvas/60">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </span>
            <p className="text-sm font-bold leading-tight text-fg">{c.name}</p>
            <p className="font-mono text-[10px] text-fg-muted">
              {c.listingCount.toLocaleString("id-ID")} listing
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Section({
  kicker, title, href, ctaLabel, children,
}: {
  kicker: string;
  title: string;
  href: string;
  ctaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-flame-500">{kicker}</span>
          <h2 className="mt-1 text-2xl font-bold text-fg">{title}</h2>
        </div>
        <Link href={href} className="text-sm font-semibold text-brand-500 transition-colors hover:text-brand-400">
          {ctaLabel}
        </Link>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Grid({ items }: { items: ListingSummary[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((l) => (
        <ListingCard key={l.id} l={l} meUsername={null} />
      ))}
    </div>
  );
}

/**
 * Boost strip — featured cards in a horizontal scroller. Slightly larger
 * than the normal grid card so paid placements are visually distinct.
 */
function BoostStrip({ items }: { items: ListingSummary[] }) {
  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
      {items.map((l) => (
        <Link
          key={l.id}
          href={`/listing/${l.slug}`}
          className="snap-start group relative w-64 shrink-0 overflow-hidden rounded-2xl border border-flame-400/40 bg-panel transition-all hover:-translate-y-0.5 hover:border-flame-400 hover:shadow-[0_8px_24px_-12px] hover:shadow-flame-400/40"
        >
          <div className="relative aspect-[4/5] bg-panel-2">
            {l.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.cover} alt={l.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-flame-400/20 via-brand-400/10 to-ultra-400/20" />
            )}
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-flame-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
              ⚡ Boosted
            </span>
            <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
              {conditionLabel(l.condition)}
            </span>
          </div>
          <div className="p-3">
            <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-fg group-hover:text-brand-500">
              {l.title}
            </p>
            <p className="mt-1 text-xs text-fg-subtle">
              {l.seller.city ?? "Lokasi belum diisi"}
            </p>
            <p className="mt-2 text-base font-extrabold text-fg">
              Rp {l.priceIdr.toLocaleString("id-ID")}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
