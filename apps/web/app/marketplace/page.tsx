import { AppShell } from "@/components/app-shell";
import { ListingCard } from "@/components/listing-card";
import { MarketplaceFilterBar } from "@/components/marketplace-filter-bar";
import { PageHero } from "@/components/page-hero";
import { serverApi } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/session";
import { copyFor } from "@/lib/copy/server";
import type { ListingSummary } from "@hoobiq/types";

type Category = { slug: string; name: string; level: number; children?: Category[] };


export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string; cat?: string; cats?: string; sort?: string;
    minPrice?: string; maxPrice?: string;
    condition?: string; grade?: string;
    city?: string; distance?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.q)        q.set("q", sp.q);
  if (sp.cat)      q.set("categorySlug", sp.cat);
  // `cats` is the new multi-select filter — comma-separated slugs from
  // the checkbox tree. The single `cat` param still works for /kategori
  // → marketplace deep links and for backward-compat shareable URLs.
  if (sp.cats)     q.set("cats", sp.cats);
  if (sp.sort)     q.set("sort", sp.sort);
  if (sp.minPrice) q.set("minPrice", sp.minPrice);
  if (sp.maxPrice) q.set("maxPrice", sp.maxPrice);
  if (sp.condition && /^(BRAND_NEW_SEALED|LIKE_NEW|EXCELLENT|GOOD|FAIR|POOR)$/.test(sp.condition)) {
    q.set("condition", sp.condition);
  }
  q.set("limit", "24");

  const [data, tree, me, t] = await Promise.all([
    serverApi<{ items: ListingSummary[]; nextCursor: string | null }>(`/listings?${q}`),
    serverApi<Category[]>("/categories", { revalidate: 60 }),
    getSessionUser(),
    copyFor(),
  ]);
  const items = data?.items ?? [];

  // Client-side narrowing for filters the backend doesn't yet support
  // (city, distance, grade). Keeps the UI honest until those land server-side.
  const filtered = items.filter((l) => {
    if (sp.city && l.seller.city !== sp.city) return false;
    return true;
  });

  return (
    <AppShell active="Marketplace">
      <div className="px-4 pb-8 sm:px-6 lg:px-10">
        <PageHero
          eyebrow="Marketplace"
          title={sp.q ? `Hasil untuk "${sp.q}"` : t("marketplace.hero.title")}
          subtitle={sp.q
            ? `${filtered.length} listing ditemukan. Semua proteksi Hoobiq Pay.`
            : t("marketplace.hero.subtitle")}
          tone="flame"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 1.5-4h17L22 7"/><path d="M2 7v3a2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2V7"/><path d="M4 12v9h16v-9"/></svg>}
        />

        <MarketplaceFilterBar series={tree ?? []} />

        {data === null && (
          <div className="rounded-xl border border-flame-400/30 bg-flame-400/5 p-4 text-sm">
            <p className="font-medium text-fg">Gagal memuat listing</p>
            <p className="mt-1 text-fg-muted">Pastikan API jalan di <code>http://localhost:4000</code>.</p>
          </div>
        )}

        {data && filtered.length === 0 && (
          <div className="rounded-xl border border-rule bg-panel/40 p-10 text-center">
            <p className="text-fg-muted">Tidak ada listing yang cocok dengan filter.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((l) => <ListingCard key={l.id} l={l} meUsername={me?.username ?? null} />)}
        </div>
      </div>
    </AppShell>
  );
}

