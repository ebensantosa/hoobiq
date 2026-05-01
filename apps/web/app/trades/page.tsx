import { AppShell } from "@/components/app-shell";
import { TradeDeck, type TradeCard } from "@/components/trade-deck";
import { PageHero } from "@/components/page-hero";
import { serverApi } from "@/lib/server/api";

export const dynamic = "force-dynamic";

type DeckResponse = {
  items: TradeCard[];
  used: number;
  remaining: number;
  cap: number;
};

export default async function MeetMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const sp = await searchParams;
  // Optional ?to=<username> filters the deck to a single seller (kept for
  // back-compat with profile CTAs that linked here as "trade dengan @x").
  const to = sp.to?.trim() || null;

  const data = await serverApi<DeckResponse>("/trades/matches");
  const all = data?.items ?? [];
  const items = to ? all.filter((c) => c.owner.username === to) : all;
  const used = data?.used ?? 0;
  const cap  = data?.cap ?? 50;

  return (
    <AppShell active="Meet Match">
      <div className="mx-auto max-w-[640px] px-6 pb-12">
        <PageHero
          eyebrow="Meet Match"
          title={to ? `Lihat listing @${to}` : "Meet Match"}
          subtitle={to
            ? `Listing dari @${to}. Swipe kanan untuk simpan ke wishlist, kiri untuk lewat.`
            : `Swipe ${cap} kartu per hari. Kanan = simpan ke wishlist, kiri = lewat.`}
          tone="brand"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
        />

        <div className="mx-auto mt-6 max-w-[480px]">
          <TradeDeck initial={items} used={used} cap={cap} targetUsername={to} />
        </div>
      </div>
    </AppShell>
  );
}
