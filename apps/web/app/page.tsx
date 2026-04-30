import Link from "next/link";
import { Card } from "@hoobiq/ui";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { ListingCard } from "@/components/listing-card";
import { HomeFeed, type HomeCategory } from "@/components/home-feed";
import { CardArt, pickArt } from "@/components/card-art";
import { getSessionUser } from "@/lib/server/session";
import { serverApi } from "@/lib/server/api";
import { pickPrimaryCategories } from "@/lib/primary-categories";
import { conditionLabel } from "@/lib/condition-badge";
import { copyFor } from "@/lib/copy/server";
import type { ListingSummary } from "@hoobiq/types";

type Post = {
  id: string;
  body: string;
  cover: string | null;
  likes: number;
  author: { username: string; level: number };
};


export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getSessionUser();

  // Logged-in users land on the new HOME page (different from /marketplace
  // and /feeds per spec). Anonymous visitors still see the marketing
  // landing below.
  if (user) {
    // Marketplace-style home — hero, quick stats, category cards, tab
    // grids. Pulls every counter in parallel so the whole page lays out
    // in one render pass; failures degrade gracefully (counter just
    // shows 0 instead of blocking the whole page).
    const [trendingRes, freshRes, treeRes, wishlistRes, ordersRes, mineRes, bannersRes] =
      await Promise.all([
        serverApi<{ items: ListingSummary[] }>("/listings?sort=trending&limit=24"),
        serverApi<{ items: ListingSummary[] }>("/listings?sort=newest&limit=12"),
        serverApi<HomeCategory[]>("/categories", { revalidate: 60 }),
        serverApi<{ items: unknown[] }>("/wishlist").catch(() => null),
        serverApi<{ items: unknown[] }>("/orders?role=buyer").catch(() => null),
        serverApi<{ items: unknown[] }>("/listings/mine").catch(() => null),
        serverApi<{ items: import("@/components/home/hero-slider").HeroBanner[] }>("/banners", { revalidate: 60 })
          .catch(() => null),
      ]);
    const trendingAll = trendingRes?.items ?? [];
    const fresh = freshRes?.items ?? [];
    // Home rail shows the 5 canonical buckets only — legacy level-1
    // rows (action-figure, blind-box, etc.) belong as children, not
    // top-level cards.
    const categories = pickPrimaryCategories(
      (treeRes ?? []).filter((c) => c.level === 1),
    );
    const boosted = trendingAll.filter((l) => l.boosted);
    const trending = trendingAll.filter((l) => !l.boosted).slice(0, 8);
    const popular = trendingAll.slice(8, 16);
    const stats = {
      collection: mineRes?.items.length ?? 0,
      wishlist:   wishlistRes?.items.length ?? 0,
      orders:     ordersRes?.items.length ?? 0,
      rating:     user.trustScore,
      verified:   user.role === "verified" || user.role === "admin" || user.role === "superadmin",
    };

    return (
      <HomeFeed
        username={user.username}
        categories={categories}
        boosted={boosted}
        trending={trending}
        popular={popular}
        fresh={fresh}
        stats={stats}
        banners={bannersRes?.items ?? []}
      />
    );
  }

  // All marketing data is real — no hardcoded listings/posts/counts. If a
  // fetch fails the section just renders empty/skipped rather than crash.
  const [listingsRes, postsRes, t] = await Promise.all([
    serverApi<{ items: ListingSummary[] }>("/listings?sort=trending&limit=12"),
    serverApi<{ items: Post[] }>("/posts?limit=3"),
    copyFor(),
  ]);
  const listings = listingsRes?.items ?? [];
  const posts    = postsRes?.items ?? [];
  const heroPicks = listings.slice(0, 4);
  const trending  = listings.slice(0, 8);

  return (
    <main className="min-h-screen pt-14 sm:pt-16">
      <MarketingNav />
      <Hero picks={heroPicks} t={t} />
      <LatestStrip items={listings.slice(0, 12)} />
      <Trending items={trending} />
      <BottomCTA />
      <MarketingFooter />
    </main>
  );
}

/* ---------------- Hero ---------------- */

function Hero({ picks, t }: { picks: ListingSummary[]; t: (k: import("@/lib/copy/keys").CopyKey) => string }) {
  // Top 3 popular search seeds — keeps the hero compact on mobile.
  const chips = ["Charizard", "Luffy", "Labubu"];
  return (
    <section className="mx-auto grid max-w-[1280px] items-start gap-10 px-4 pb-8 pt-10 sm:px-6 md:grid-cols-[1.05fr_1fr] md:gap-14 md:pb-12 md:pt-14 lg:px-10">
      <div>
        <h1 className="text-3xl font-bold leading-[1.1] tracking-tight text-fg md:text-[44px] md:leading-[1.08]">
          Tempat jual-beli &amp; pamer
          <br className="hidden md:block" />
          koleksi hobi kamu, <span className="text-brand-400">aman.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm text-fg-muted md:text-base">
          Cari kartu langka, trade figure, pamer blind box. Pembayaran aman lewat
          Hoobiq&nbsp;Pay.
        </p>

        <div className="mt-6">
          <SearchBar placeholder={t("nav.search.placeholder")} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-fg-subtle">Populer:</span>
            {chips.map((c) => (
              <Link
                key={c}
                href={`/marketplace?q=${encodeURIComponent(c)}`}
                className="rounded-full border border-rule bg-panel px-2.5 py-0.5 text-xs text-fg-muted transition-colors hover:border-brand-400/50 hover:text-fg"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg-muted">
          <Trust icon="shield">Pembayaran aman lewat Hoobiq Pay</Trust>
          <Trust icon="check">Seller terverifikasi</Trust>
          <Trust icon="refund">Refund dijamin Hoobiq</Trust>
        </div>
      </div>

      <HeroShowcase picks={picks} />
    </section>
  );
}

function HeroShowcase({ picks }: { picks: ListingSummary[] }) {
  if (picks.length === 0) return <div />;
  const floats = ["animate-float", "animate-float-3", "animate-float-2", "animate-float-4"];
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="pointer-events-none absolute inset-6 rounded-[48px] bg-brand-soft blur-3xl opacity-70" />
      <div className="relative grid grid-cols-2 gap-3">
        <div className="relative z-10 flex flex-col gap-3">
          {picks[0] && <ShowcaseCard l={picks[0]} float={floats[0]} />}
          {picks[1] && <ShowcaseCard l={picks[1]} float={floats[1]} />}
        </div>
        <div className="relative z-20 mt-6 flex -translate-x-5 flex-col gap-3">
          {picks[2] && <ShowcaseCard l={picks[2]} float={floats[2]} />}
          {picks[3] && <ShowcaseCard l={picks[3]} float={floats[3]} />}
        </div>
      </div>
    </div>
  );
}

function ShowcaseCard({ l, float }: { l: ListingSummary; float: string }) {
  return (
    <Link
      href={`/listing/${l.slug}`}
      className={"overflow-hidden rounded-xl border border-rule bg-panel shadow-gallery " + float}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {l.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.cover} alt={l.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <CardArt variant={pickArt(l.slug)} />
        )}
        <span className="absolute left-1.5 top-1.5 rounded-full border border-rule bg-white/85 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-fg-muted backdrop-blur">
          {conditionLabel(l.condition)}
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white/30 to-transparent mix-blend-overlay" />
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate text-[11px] font-semibold text-fg">{l.title}</p>
        <p className="mt-0.5 text-[11px] font-bold text-brand-500">Rp {l.priceIdr.toLocaleString("id-ID")}</p>
      </div>
    </Link>
  );
}

/* ---------------- Latest strip ---------------- */

function LatestStrip({ items }: { items: ListingSummary[] }) {
  // Loop the array once so the marquee animation has continuous content.
  const loop = [...items, ...items];
  return (
    <section className="border-y border-rule bg-panel/40 py-8">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-brand-400" />
            </span>
            <span className="font-semibold text-fg">Listing terbaru</span>
            <span className="text-fg-subtle">langsung dari seller</span>
          </div>
          <Link href="/marketplace" className="hidden text-sm text-fg-muted hover:text-fg md:inline">
            Semua listing
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-rule bg-panel/30 px-6 py-8 text-center text-sm text-fg-muted">
            Belum ada listing aktif. <Link href="/daftar" className="text-brand-400">Daftar gratis</Link> untuk mulai jualan.
          </div>
        ) : (
          <div className="mask-fade-x relative overflow-hidden">
            <div className="flex w-max gap-3 animate-marquee">
              {loop.map((it, i) => (
                <Link
                  key={`${it.id}-${i}`}
                  href={`/listing/${it.slug}`}
                  className="flex w-60 shrink-0 items-center gap-3 rounded-xl border border-rule bg-panel px-3 py-2.5 transition-colors hover:border-brand-400/60"
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-panel-2">
                    {it.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.cover} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <CardArt variant={pickArt(it.slug)} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{it.title}</p>
                    <p className="text-xs font-semibold text-brand-400">Rp {it.priceIdr.toLocaleString("id-ID")}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Trust({ icon, children }: { icon: "shield" | "check" | "refund"; children: React.ReactNode }) {
  const paths: Record<typeof icon, React.ReactNode> = {
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    check: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    refund: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </>
    ),
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-brand-400"
      >
        {paths[icon]}
      </svg>
      <span>{children}</span>
    </span>
  );
}

/**
 * Plain HTML form action="/marketplace" with input name="q" — the browser
 * handles submit, navigates to /marketplace?q=… which the server-rendered
 * marketplace page reads via searchParams.q. No client JS required.
 */
function SearchBar({ placeholder }: { placeholder: string }) {
  return (
    <form action="/marketplace" method="get" className="flex h-14 items-center gap-2 rounded-2xl border border-rule bg-panel px-3 shadow-gallery">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-2 text-fg-subtle"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        name="q"
        placeholder={placeholder}
        className="flex-1 bg-transparent px-2 text-base text-fg placeholder:text-fg-subtle focus:outline-none"
      />
      <button
        type="submit"
        className="h-10 rounded-lg bg-brand-400 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
      >
        Cari
      </button>
    </form>
  );
}


/* ---------------- Trending listings ---------------- */

function Trending({ items }: { items: ListingSummary[] }) {
  return (
    <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-20 md:px-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-fg md:text-3xl">Lagi dicari minggu ini</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Listing aktif paling sering dilihat. Bebas lihat-lihat — buat
            beli tinggal daftar.
          </p>
        </div>
        <Link
          href="/marketplace"
          className="hidden text-sm font-medium text-brand-400 md:inline"
        >
          Lihat semua
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rule bg-panel/30 px-6 py-10 text-center text-sm text-fg-muted">
          Belum ada listing aktif. Section ini akan otomatis terisi begitu seller publish listing.
        </div>
      ) : (
        // Reuse the same ListingCard the logged-in marketplace uses, so the
        // design stays in sync (cover, condition badge, seller, price).
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((l) => (
            <ListingCard key={l.id} l={l} />
          ))}
        </div>
      )}

      <div className="mt-6 text-center md:hidden">
        <Link href="/marketplace" className="text-sm font-medium text-brand-400">
          Lihat semua
        </Link>
      </div>
    </section>
  );
}

/* ---------------- Community preview ---------------- */

function CommunityPreview({ posts }: { posts: Post[] }) {
  return (
    <section className="border-t border-rule bg-panel/30">
      <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <div>
            <h2 className="text-2xl font-bold text-fg md:text-3xl">
              Jelajahi koleksi terbaru dari kolektor terverifikasi.
            </h2>
            <p className="mt-3 text-fg-muted">
              Pamer pull rate, review grading, diskusi sub-seri — semua dari
              kolektor yang aktif setiap minggu.
            </p>
            <div className="mt-6 space-y-4 text-sm">
              <Perk title="Aman via Hoobiq Pay" body="Pembayaran aman sampai barang diterima dengan baik." />
              <Perk title="Display case" body="Badge dari trade & kontribusi. Reputasi kamu ikut ke mana aja." />
              <Perk title="Feeds terkurasi" body="Post terorganisir sampai level sub-seri, bukan timeline acak." />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <div className="relative aspect-[4/3] overflow-hidden bg-panel-2">
                  {p.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <CardArt variant={pickArt(p.author.username)} />
                  )}
                </div>
                <div className="p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-fg">
                    @{p.author.username}
                    <span className="rounded-full bg-flame-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-flame-400">
                      LV {p.author.level}
                    </span>
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-fg-muted">
                    {p.body}
                  </p>
                  <p className="mt-3 text-xs text-fg-subtle">♥ {p.likes}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Perk({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
      <div>
        <p className="font-semibold text-fg">{title}</p>
        <p className="text-fg-muted">{body}</p>
      </div>
    </div>
  );
}

/* ---------------- Bottom CTA ---------------- */

function BottomCTA() {
  return (
    <section className="mx-auto max-w-[1280px] px-6 py-20 md:px-10">
      <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-rule bg-panel p-8 md:flex-row md:items-center md:p-12">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold text-fg md:text-3xl">
            Gabung gratis, mulai hari ini.
          </h2>
          <p className="mt-2 text-fg-muted">
            Daftar dalam 30 detik. Tidak ada biaya untuk lihat-lihat atau bikin akun.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/daftar"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-brand-400 px-6 text-base font-semibold text-white transition-colors hover:bg-brand-500"
          >
            Daftar gratis
          </Link>
          <Link
            href="/masuk"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-rule bg-transparent px-6 text-base font-medium text-fg transition-colors hover:border-brand-400/60"
          >
            Masuk
          </Link>
        </div>
      </div>
    </section>
  );
}
