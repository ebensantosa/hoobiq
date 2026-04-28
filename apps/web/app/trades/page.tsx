import { AppShell } from "@/components/app-shell";
import { TradeDeck, type TradeCard } from "@/components/trade-deck";
import { PageHero } from "@/components/page-hero";
import { serverApi } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const sp = await searchParams;
  // Optional ?to=<username> filters the deck to one user's tradeable listings
  // (used when arriving from a profile's "Trade dengan @x" CTA).
  const to = sp.to?.trim() || null;

  const data = await serverApi<{ items: TradeCard[] }>("/trades/matches");
  const all = data?.items ?? [];
  const items = to ? all.filter((c) => c.owner.username === to) : all;

  return (
    <AppShell active="Trade">
      <div className="mx-auto max-w-[640px] px-6 pb-12">
        <PageHero
          eyebrow="Trade"
          title={to ? `Tukar dengan @${to}` : "Tukar koleksi"}
          subtitle={to
            ? `Listing tradeable dari @${to}. Swipe kanan kalau mau, kiri kalau lewat.`
            : "Swipe listing yang kamu mau. Kalau pemiliknya juga swipe kanan barang kamu, langsung match."}
          tone="ultra"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10l5-5 5 5M7 14l5 5 5-5"/></svg>}
        />

        <div className="mx-auto mt-6 max-w-[480px]">
          <TradeDeck initial={items} targetUsername={to} />
        </div>
      </div>
    </AppShell>
  );
}
