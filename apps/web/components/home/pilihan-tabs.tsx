"use client";
import * as React from "react";
import { ListingCard } from "@/components/listing-card";
import type { ListingSummary } from "@hoobiq/types";

/**
 * Client-side tabs for the home page's "Pilihan Untukmu" grid. The
 * server hands us the full pool of listings once; tabs filter that
 * pool on the client so flipping between Semua/Baru/Terlaris/Rare is
 * instant (no spinner, no re-fetch round trip).
 *
 * Filter rules:
 *   - Semua    = all
 *   - Baru     = sorted by createdAt desc, top 10
 *   - Terlaris = boosted first, then trending pool — the marketplace
 *                already returns trending order so we keep it as-is
 *                (boosted is a heuristic for Terlaris in the absence
 *                of real "sold" data on the listing card row).
 *   - Rare     = condition === BRAND_NEW_SEALED (canonical "rare-grade"
 *                tag for sealed/MIB items in the Hoobiq taxonomy).
 */
type Tab = "all" | "new" | "best" | "rare";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "all",  label: "Semua" },
  { key: "new",  label: "Baru" },
  { key: "best", label: "Terlaris" },
  { key: "rare", label: "Rare" },
];

export function PilihanTabs({
  listings,
  meUsername,
}: {
  listings: ListingSummary[];
  meUsername: string | null;
}) {
  const [tab, setTab] = React.useState<Tab>("all");

  const filtered = React.useMemo(() => {
    switch (tab) {
      case "new":
        return [...listings]
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
          .slice(0, 10);
      case "best":
        // Boosted first, then non-boosted in original order.
        return [
          ...listings.filter((l) => l.boosted),
          ...listings.filter((l) => !l.boosted),
        ].slice(0, 10);
      case "rare":
        return listings.filter((l) => l.condition === "BRAND_NEW_SEALED").slice(0, 10);
      case "all":
      default:
        return listings.slice(0, 10);
    }
  }, [tab, listings]);

  return (
    <>
      <div className="mt-4 flex items-center gap-1 border-b border-rule">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              "border-b-2 px-3 py-2 text-sm font-semibold transition-colors " +
              (tab === t.key
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-fg-muted hover:text-fg")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-lg border border-rule bg-panel/40 p-10 text-center text-sm text-fg-muted">
          Belum ada listing di kategori ini.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((l) => (
            <ListingCard key={l.id} l={l} meUsername={meUsername} />
          ))}
        </div>
      )}
    </>
  );
}
