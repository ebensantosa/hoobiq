import Link from "next/link";
import { CardArt, pickArt } from "./card-art";
import { ListingOwnerMenu } from "./listing-owner-menu";
import { CartButton } from "./cart-button";
import { WishlistButton } from "./wishlist-button";
import { conditionBadge } from "@/lib/condition-badge";
import { TierBadge, tierForLevel } from "./tier-badge";
import type { ListingSummary } from "@hoobiq/types";

/**
 * Price line for the card. Renders the live price prominently;
 * when a compareAt price exists (strictly higher than the live
 * price; the API already filters bad data), surfaces a strike-
 * through + percent-off chip on the same line.
 */
function PriceLine({
  priceIdr, compareAtIdr,
}: { priceIdr: number; compareAtIdr: number | null }) {
  const hasDiscount = compareAtIdr != null && compareAtIdr > priceIdr;
  const off = hasDiscount
    ? Math.max(1, Math.round(((compareAtIdr - priceIdr) / compareAtIdr) * 100))
    : 0;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="text-lg font-extrabold leading-none tracking-tight text-brand-600 dark:text-brand-400">
        Rp {priceIdr.toLocaleString("id-ID")}
      </span>
      {hasDiscount && (
        <>
          <span className="inline-flex items-center rounded bg-flame-500/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-flame-600 dark:text-flame-400">
            -{off}%
          </span>
          <span className="text-[11px] font-medium text-fg-subtle line-through">
            Rp {compareAtIdr!.toLocaleString("id-ID")}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Marketplace listing card. Shared by /marketplace, /kategori, /home,
 * and any related-products section so visual tweaks land everywhere
 * in one place.
 *
 * Visual notes per the marketplace redesign:
 *   - Price is the loudest element on the card — large, brand-coloured,
 *     left-aligned. Buyers should be able to scan a grid by price alone.
 *   - Condition pill is small + neutral so it informs without competing.
 *   - The boost badge stays on the cover but gets a subtler treatment
 *     so it doesn't visually shout over the title at scale.
 *   - Action buttons sit in a single bottom row; "Beli" picks up the
 *     primary CTA colour to match the header's Jual button.
 *
 * Pricing data note: there is no oldPrice / discountPercent on
 * ListingSummary today. When that lands, swap the price line below for
 * the strike-through + percent-saved variant; the surrounding spacing
 * is already designed to absorb it.
 */
export function ListingCard({
  l, meUsername,
}: {
  l: ListingSummary;
  meUsername?: string | null;
}) {
  const isOwn = !!meUsername && meUsername === l.seller.username;
  const cond = conditionBadge(l.condition);
  const tonePill =
    cond.tone === "mint" ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    : cond.tone === "near" ? "border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-400"
    : cond.tone === "crim" ? "border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-400"
    : "border-rule bg-panel-2 text-fg-muted";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-rule bg-canvas transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/50 hover:shadow-[0_12px_28px_-16px_rgba(0,0,0,0.18)]">
      {isOwn && <ListingOwnerMenu listingId={l.id} slug={l.slug} />}

      <Link href={`/listing/${l.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-panel-2">
          {l.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={l.cover}
              alt={l.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <CardArt variant={pickArt(l.slug)} />
          )}
          {l.boosted && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-flame-500/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
              ⚡ Boost
            </span>
          )}
          {!isOwn && (
            <div className="absolute right-2 top-2">
              <WishlistButton listingId={l.id} variant="icon" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 px-3 pt-2.5">
          <p className="line-clamp-2 min-h-[2.5rem] text-[13px] font-semibold leading-snug text-fg transition-colors group-hover:text-brand-500">
            {l.title}
          </p>

          {/* Price — the loudest line. brand-500 puts it on the
              same colour as the primary CTA so the buyer's eye
              connects price → buy without effort. When the seller
              has set a compareAt price, the strike-through + "-N%"
              chip render in the same row to keep the card height
              constant across discounted and non-discounted items. */}
          <PriceLine priceIdr={l.priceIdr} compareAtIdr={l.compareAtIdr ?? null} />

          {/* Two-row meta block keeps the tier + condition pills from
              colliding at narrow card widths: row 1 holds the badges
              (wraps to a new line if both don't fit), row 2 is just
              the city in plain text. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <TierBadge tier={tierForLevel(l.seller.level ?? 1)} premium={!!l.seller.isPremium} size="sm" />
            <span
              className={
                "inline-flex h-5 shrink-0 items-center rounded border px-1.5 text-[9px] font-bold uppercase leading-none tracking-wider " +
                tonePill
              }
            >
              {cond.label}
            </span>
          </div>
          {l.seller.city && (
            <p className="truncate text-[11px] text-fg-subtle">{l.seller.city}</p>
          )}
        </div>
      </Link>

      <div className="mt-auto flex items-center gap-2 px-3 pb-3 pt-3">
        <CartButton listingId={l.id} ownListing={isOwn} size="sm" />
        <Link
          href={
            isOwn
              ? `/jual/${encodeURIComponent(l.slug)}/edit`
              : meUsername
              ? `/checkout?listing=${encodeURIComponent(l.slug)}`
              : `/masuk?next=${encodeURIComponent(`/checkout?listing=${l.slug}`)}`
          }
          className={
            "ml-auto inline-flex h-7 items-center justify-center rounded-md px-3 text-[10px] font-bold uppercase tracking-wider transition-colors " +
            (isOwn
              ? "border border-rule bg-panel text-fg-muted hover:border-brand-400/60 hover:text-brand-500"
              : "bg-brand-500 text-white hover:bg-brand-600")
          }
        >
          {isOwn ? "Edit" : "Beli"}
        </Link>
      </div>
    </div>
  );
}
