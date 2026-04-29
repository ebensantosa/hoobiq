import Link from "next/link";
import { Avatar } from "@hoobiq/ui";
import { CartButton } from "./cart-button";
import { conditionBadge } from "@/lib/condition-badge";
import type { ListingSummary } from "@hoobiq/types";

/**
 * Full-width listing card shaped to live inline in the feed stream.
 * Same visual rhythm as FeedCard — avatar + name + relative time at
 * the top, big square image in the middle, price + actions at the
 * bottom — but the body is a marketplace listing instead of a post.
 *
 * The mixed feed interleaves these with FeedCards by timestamp so the
 * timeline reads as one stream of "what's happening on Hoobiq right
 * now" rather than two stacked silos.
 */
export function ListingFeedCard({
  listing,
  meUsername,
}: {
  listing: ListingSummary;
  meUsername?: string | null;
}) {
  const isOwn = !!meUsername && meUsername === listing.seller.username;
  const cond = conditionBadge(listing.condition);

  return (
    <article className="overflow-hidden rounded-2xl border border-rule bg-panel">
      <header className="flex items-center gap-3 px-4 py-3">
        <Link href={`/u/${encodeURIComponent(listing.seller.username)}`} className="shrink-0">
          <Avatar
            letter={listing.seller.username[0]?.toUpperCase() ?? "U"}
            size="md"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">
            {listing.seller.username}
          </p>
          <p className="text-xs text-fg-subtle">
            {listing.seller.city ?? "Lokasi belum diisi"} · {relTime(listing.createdAt)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-flame-400/40 bg-flame-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-flame-600">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m2 7 1.5-4h17L22 7" />
            <path d="M4 12v9h16v-9" />
          </svg>
          For Sale
        </span>
      </header>

      <Link href={`/listing/${listing.slug}`} className="block">
        <div className="relative aspect-square w-full bg-panel-2">
          {listing.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.cover}
              alt={listing.title}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-400/15 via-transparent to-flame-400/10" />
          )}
          {listing.boosted && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-sm bg-flame-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
              ⚡ Boost
            </span>
          )}
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-white/30 bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
            {cond.label}
          </span>
        </div>
      </Link>

      <div className="flex flex-col gap-2 px-4 py-3">
        <Link href={`/listing/${listing.slug}`} className="text-base font-bold leading-tight text-fg hover:text-brand-500">
          {listing.title}
        </Link>
        <p className="text-lg font-extrabold text-fg">
          Rp {listing.priceIdr.toLocaleString("id-ID")}
        </p>
      </div>

      <div className="flex items-center gap-2 border-t border-rule px-4 py-3">
        <CartButton listingId={listing.id} ownListing={isOwn} size="sm" />
        <Link
          href={isOwn ? `/jual/${encodeURIComponent(listing.slug)}/edit` : `/checkout?listing=${encodeURIComponent(listing.slug)}`}
          className={
            "ml-auto inline-flex h-9 items-center justify-center rounded-md px-4 text-xs font-bold uppercase tracking-wider transition-colors " +
            (isOwn
              ? "border border-rule bg-panel text-fg-muted hover:border-brand-400/60 hover:text-brand-500"
              : "bg-brand-500 text-white hover:bg-brand-600")
          }
        >
          {isOwn ? "Edit" : "Beli sekarang"}
        </Link>
      </div>
    </article>
  );
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60)        return `${sec}d`;
  const min = Math.floor(sec / 60);
  if (min < 60)        return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24)         return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7)         return `${day}h`;
  const week = Math.floor(day / 7);
  if (week < 4)        return `${week}mg`;
  const month = Math.floor(day / 30);
  return `${month}bln`;
}
