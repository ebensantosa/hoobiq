import Link from "next/link";
import { CardArt, pickArt } from "./card-art";
import { ListingOwnerMenu } from "./listing-owner-menu";
import type { ListingSummary } from "@hoobiq/types";

/**
 * Marketplace card. Shared by /marketplace and /kategori/[slug] so visual
 * tweaks land everywhere in one place.
 *
 * Hover state lifts + shadows the card and zooms the cover image — gives
 * the grid an obvious sense of depth without cluttering with metadata.
 */
export function ListingCard({
  l, meUsername,
}: {
  l: ListingSummary;
  meUsername?: string | null;
}) {
  const isOwn = !!meUsername && meUsername === l.seller.username;

  return (
    <div className="group relative">
      {isOwn && <ListingOwnerMenu listingId={l.id} slug={l.slug} />}
      <Link
        href={`/listing/${l.slug}`}
        className="block overflow-hidden rounded-2xl border border-rule bg-panel transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/60 hover:shadow-[0_18px_36px_-18px_rgba(231,85,159,0.45)]"
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-panel-2">
          {l.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={l.cover}
              alt={l.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
              loading="lazy"
            />
          ) : (
            <CardArt variant={pickArt(l.slug)} />
          )}
          {/* Soft gradient at top so the condition pill is always legible. */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 via-black/10 to-transparent" />
          <div className="absolute left-3 top-3 flex gap-1.5">
            <span
              className={
                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm " +
                (l.condition === "MINT"
                  ? "bg-emerald-500/95 text-white"
                  : l.condition === "NEAR_MINT"
                  ? "bg-sky-500/95 text-white"
                  : "bg-fg/85 text-canvas")
              }
            >
              <span className="h-1 w-1 rounded-full bg-white" />
              {l.condition === "MINT" ? "Mint" : l.condition.replace("_", " ")}
            </span>
            {l.boosted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-flame-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                ⚡ Boosted
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-fg transition-colors group-hover:text-brand-500">
            {l.title}
          </p>
          <p className="mt-1.5 flex items-center gap-1 text-xs text-fg-subtle">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
            <span className="truncate">
              @{l.seller.username}{l.seller.city ? ` · ${l.seller.city}` : ""}
            </span>
          </p>
          <div className="mt-3 flex items-end justify-between gap-2">
            <p className="text-base font-extrabold tracking-tight text-fg">
              Rp {l.priceIdr.toLocaleString("id-ID")}
            </p>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100">
              Lihat →
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
