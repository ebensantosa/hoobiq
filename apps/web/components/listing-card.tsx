import Link from "next/link";
import { CardArt, pickArt } from "./card-art";
import { ListingOwnerMenu } from "./listing-owner-menu";
import { CartButton } from "./cart-button";
import { WishlistButton } from "./wishlist-button";
import { conditionBadge } from "@/lib/condition-badge";
import type { ListingSummary } from "@hoobiq/types";

/**
 * Premium marketplace card. Shared by /marketplace, /kategori/[slug],
 * /home, and any related-products section so visual tweaks land
 * everywhere in one place.
 *
 * Visual notes (per spec):
 *   - Border radius `rounded-md` (≈6px) instead of the previous
 *     `rounded-2xl` lozenge — feels more grown-up, less playful.
 *   - All metadata sits BELOW the image, never overlaid. The condition
 *     badge that used to float on the cover photo now lives in the
 *     body block as a neutral pill so the photo can breathe.
 *   - Two compact action buttons at the foot of the card: "+ Keranjang"
 *     and "Beli langsung". Buying still deep-links to /checkout?listing=
 *     for the bypass-cart fast path; cart fires POST /cart from the
 *     existing card without a route change.
 *
 * Owner-of-listing case stays click-through — they see the owner menu
 * (edit/hide) and the action buttons render disabled with a tooltip.
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
    <div className="group relative overflow-hidden rounded-md border border-rule bg-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/50 hover:shadow-[0_12px_28px_-16px_rgba(0,0,0,0.18)]">
      {isOwn && <ListingOwnerMenu listingId={l.id} slug={l.slug} />}

      <Link href={`/listing/${l.slug}`} className="block">
        {/* Image — clean, no overlays. Lets the photograph sell the piece. */}
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
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-sm bg-flame-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
              ⚡ Boost
            </span>
          )}
          {!isOwn && (
            <div className="absolute right-2 top-2">
              <WishlistButton listingId={l.id} variant="icon" />
            </div>
          )}
        </div>

        {/* Body — all info lives here, nothing overlaid on the image. */}
        <div className="px-3 pt-3">
          <span
            className={
              "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider " +
              tonePill
            }
          >
            {cond.label}
          </span>
          <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-fg transition-colors group-hover:text-brand-500">
            {l.title}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-fg-subtle">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s7-7.58 7-12a7 7 0 1 0-14 0c0 4.42 7 12 7 12z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span className="truncate">{l.seller.city ?? "Lokasi belum diisi"}</span>
          </p>
          <p className="mt-2 text-base font-extrabold tracking-tight text-fg">
            Rp {l.priceIdr.toLocaleString("id-ID")}
          </p>
        </div>
      </Link>

      {/* Action row — sits outside the card-cover Link so clicking a
          button doesn't navigate to the detail page. We don't need to
          stop click propagation here (and can't, from a Server
          Component anyway — passing onClick to Link errors at SSR). */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-3">
        <CartButton listingId={l.id} ownListing={isOwn} size="sm" />
        <Link
          href={isOwn ? `/jual/${encodeURIComponent(l.slug)}/edit` : `/checkout?listing=${encodeURIComponent(l.slug)}`}
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
