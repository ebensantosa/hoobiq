import { AppShell } from "@/components/app-shell";
import { TradeDeck, type TradeMatch } from "@/components/trade-deck";
import { PageHero } from "@/components/page-hero";
import { serverApi } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const sp = await searchParams;
  const to = sp.to?.trim() || null;

  const data = await serverApi<{ items: TradeMatch[] }>("/trades/matches");
  const all = data?.items ?? [];
  const items = to ? all.filter((m) => m.counterparty.username === to) : all;

  return (
    <AppShell active="Trade">
      <div className="mx-auto max-w-[640px] px-6 pb-12">
        <PageHero
          eyebrow="Trade Match"
          title={to ? `Trade dengan @${to}` : "Tukar dua arah"}
          subtitle={to
            ? `Match yang cocok antara koleksi kamu dan @${to}. Geser kanan untuk propose, kiri untuk lewati.`
            : "Match berdasarkan wishlist dan koleksi kamu. Geser kanan untuk propose, kiri untuk lewati."}
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
