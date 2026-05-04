import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Avatar, Card } from "@hoobiq/ui";
import { ListingGallery } from "@/components/listing-gallery";
import { ListingCard } from "@/components/listing-card";
import { ListingReviews } from "@/components/listing-reviews";
import { BoostTrigger } from "@/components/boost-trigger";
import { WishlistButton } from "@/components/wishlist-button";
import { ShareButton } from "@/components/share-button";
import { VariantPicker } from "@/components/variant-picker";
import { conditionBadge } from "@/lib/condition-badge";
import { serverApi } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/session";
import type { ListingDetail, ListingSummary } from "@hoobiq/types";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [listing, me] = await Promise.all([
    serverApi<ListingDetail>(`/listings/${encodeURIComponent(id)}`),
    getSessionUser(),
  ]);
  if (!listing) notFound();
  const isOwn = me?.username === listing.seller.username;
  const ratingAvg = listing.rating?.avg ?? null;
  const ratingCount = listing.rating?.count ?? 0;
  const cond = conditionBadge(listing.condition);

  // "Lihat produk lain" — same category first, then fall back to whatever
  // the marketplace surfaces. Filtered to drop the listing itself + the
  // seller's other items (those have a dedicated section on /u/[username]).
  const relatedRes = await serverApi<{ items: ListingSummary[] }>(
    `/listings?categorySlug=${encodeURIComponent(listing.category.slug)}&limit=12`,
  );
  const related = (relatedRes?.items ?? [])
    .filter((l) => l.id !== listing.id && l.seller.username !== listing.seller.username)
    .slice(0, 8);

  return (
    <AppShell active="Marketplace">
      <div className="px-4 pb-12 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-subtle">
          <Link href="/marketplace" className="hover:text-fg">Marketplace</Link>
          <span>/</span>
          <Link href={`/kategori/${listing.category.slug}`} className="hover:text-fg">
            {listing.category.name}
          </Link>
          <span>/</span>
          <span className="line-clamp-1 max-w-[280px] text-fg-muted">{listing.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* Left — gallery + spec + description */}
          <div>
            <ListingGallery
              images={listing.images}
              title={listing.title}
            />

            {/* Spesifikasi produk — compact table-style block. Each
                row is a label/value pair; visual weight stays low so
                the gallery and price (right column) keep buyer focus.
                Ordered by what shoppers actually scan first: Kategori,
                Kondisi, Stok, Berat, Tradeable. */}
            <section className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
                Spesifikasi produk
              </h2>
              <dl className="mt-3 divide-y divide-rule rounded-lg border border-rule bg-panel/40 text-sm">
                <SpecRow label="Kategori" value={listing.category.name} />
                {listing.brand && <SpecRow label="Brand" value={listing.brand} />}
                <SpecRow
                  label="Kondisi"
                  value={cond.label}
                  valueClass="text-brand-600 dark:text-brand-400"
                />
                {listing.variant && <SpecRow label="Varian" value={listing.variant} />}
                <SpecRow label="Stok" value={`${listing.stock.toLocaleString("id-ID")} pcs`} />
                <SpecRow label="Berat" value={`${listing.weightGrams.toLocaleString("id-ID")} gr`} />
                {listing.warranty && <SpecRow label="Garansi" value={listing.warranty} />}
                <SpecRow
                  label="Bisa ditukar"
                  value={listing.tradeable ? "Ya — terbuka untuk Meet Match" : "Tidak"}
                />
              </dl>
            </section>

            {/* Deskripsi — sits below the spec block per the redesign
                so the at-a-glance facts come first and the long-form
                story comes second. */}
            <section className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
                Deskripsi
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fg">
                {listing.description}
              </p>
            </section>
          </div>

          {/* Right — sticky aside (price + buy + seller + protections) */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
              {listing.category.name}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-fg md:text-3xl">{listing.title}</h1>

            {/* Rating row — real number from reviews, not seller trustScore */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
              {ratingCount > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1 text-amber-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2 14.6 8.4 21.5 9 16.3 13.6 17.9 20.5 12 17 6.1 20.5 7.7 13.6 2.5 9 9.4 8.4Z" />
                    </svg>
                    <span className="font-mono font-semibold text-fg">{ratingAvg?.toFixed(1)}</span>
                  </span>
                  <a href="#reviews" className="text-xs text-fg-muted hover:text-fg">
                    {ratingCount} review
                  </a>
                </>
              ) : (
                <span className="text-xs text-fg-subtle">Belum ada review</span>
              )}
              {(listing.views ?? 0) > 0 && (
                <span className="text-xs text-fg-subtle">· {listing.views} dilihat</span>
              )}
            </div>

            {/* Price block — when a compareAt price is set, the
                live price stays the headline (3xl, brand colour)
                and the strike-through + savings line floats just
                above so the buyer sees BOTH numbers at a glance.
                Without a discount, it collapses back to a single
                price headline. */}
            {listing.compareAtIdr != null && listing.compareAtIdr > listing.priceIdr ? (
              <div className="mt-4">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xs font-medium text-fg-subtle line-through">
                    Rp {listing.compareAtIdr.toLocaleString("id-ID")}
                  </span>
                  <span className="inline-flex items-center rounded bg-flame-500/15 px-1.5 py-0.5 text-[11px] font-bold text-flame-600 dark:text-flame-400">
                    -
                    {Math.max(
                      1,
                      Math.round(
                        ((listing.compareAtIdr - listing.priceIdr) / listing.compareAtIdr) * 100,
                      ),
                    )}
                    %
                  </span>
                </div>
                <p className="text-3xl font-extrabold tracking-tight text-brand-600 dark:text-brand-400">
                  Rp {listing.priceIdr.toLocaleString("id-ID")}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-flame-600 dark:text-flame-400">
                  Hemat Rp {(listing.compareAtIdr - listing.priceIdr).toLocaleString("id-ID")}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-3xl font-extrabold tracking-tight text-brand-600 dark:text-brand-400">
                Rp {listing.priceIdr.toLocaleString("id-ID")}
              </p>
            )}
            <p className="mt-1 text-xs text-fg-subtle">Termasuk proteksi Hoobiq Pay · 2% platform fee</p>

            <div className="mt-5 flex flex-wrap gap-3">
              {isOwn ? (
                <>
                  <Link
                    href={`/jual/${encodeURIComponent(listing.slug)}/edit`}
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-md bg-brand-500 px-6 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    Edit listing
                  </Link>
                  <BoostTrigger listingId={listing.id} />
                </>
              ) : listing.hasVariants && (listing.variants?.length ?? 0) > 0 ? (
                <div className="flex w-full flex-col gap-3">
                  <VariantPicker
                    groupName={listing.variantGroupName ?? "Variasi"}
                    variants={listing.variants ?? []}
                    basePriceIdr={listing.priceIdr}
                    buyHref={`/checkout?listing=${encodeURIComponent(listing.slug)}`}
                    loginHref={`/masuk?next=${encodeURIComponent(`/checkout?listing=${listing.slug}`)}`}
                    isLoggedIn={!!me}
                    ownListing={false}
                  />
                  <div className="flex items-center gap-2">
                    {me && <WishlistButton listingId={listing.id} />}
                    <ShareButton
                      url={`/listing/${listing.slug}`}
                      title={listing.title}
                      meUsername={me?.username ?? null}
                      size="sm"
                    />
                  </div>
                </div>
              ) : listing.stock <= 0 ? (
                <span className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-dashed border-rule px-6 text-sm font-medium text-fg-subtle">
                  Stok habis
                </span>
              ) : (
                <>
                  <Link
                    href={
                      me
                        ? `/checkout?listing=${encodeURIComponent(listing.slug)}`
                        : `/masuk?next=${encodeURIComponent(`/checkout?listing=${listing.slug}`)}`
                    }
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-md bg-brand-500 px-6 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    Beli sekarang
                  </Link>
                  {me && <WishlistButton listingId={listing.id} />}
                  <ShareButton
                    url={`/listing/${listing.slug}`}
                    title={listing.title}
                    meUsername={me?.username ?? null}
                    size="sm"
                    className="self-stretch"
                  />
                </>
              )}
            </div>

            {/* Seller card — richer redesign per mockup. Avatar with
                ring, "Star Seller" tier badge when premium, "Aktif"
                indicator, real rating + sales count, and dual CTA
                row (Lihat Profil + Ikuti). */}
            <Card className="mt-6">
              <div className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">Informasi Seller</p>
                <div className="mt-3 flex items-start gap-3">
                  <Avatar
                    letter={listing.seller.username[0]?.toUpperCase() ?? "U"}
                    size="lg"
                    ring
                    src={listing.seller.avatarUrl ?? null}
                    alt={`Avatar @${listing.seller.username}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-base font-bold text-fg">
                        {listing.seller.name ?? `@${listing.seller.username}`}
                      </span>
                      {listing.seller.isPremium && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>
                          Star Seller
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fg-muted">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
                        <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      Aktif baru saja
                    </p>
                    {ratingCount > 0 && (
                      <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-fg">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500">
                          <path d="M12 2 14.6 8.4 21.5 9 16.3 13.6 17.9 20.5 12 17 6.1 20.5 7.7 13.6 2.5 9 9.4 8.4Z" />
                        </svg>
                        {ratingAvg?.toFixed(1)}
                        <span className="font-normal text-fg-muted">({ratingCount} ulasan)</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/u/${encodeURIComponent(listing.seller.username)}`}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-rule bg-canvas px-3 text-xs font-semibold text-fg transition-colors hover:border-brand-400/60"
                  >
                    Lihat Profil Seller
                  </Link>
                  {!isOwn && (
                    <Link
                      href={
                        me
                          ? `/dm?to=${encodeURIComponent(listing.seller.username)}&listing=${encodeURIComponent(listing.slug)}`
                          : `/masuk?next=${encodeURIComponent(`/dm?to=${listing.seller.username}&listing=${listing.slug}`)}`
                      }
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      Chat Seller
                    </Link>
                  )}
                </div>
              </div>
            </Card>

            {/* Informasi Pengiriman */}
            <Card className="mt-4">
              <div className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">Informasi Pengiriman</p>
                <dl className="mt-3 flex flex-col gap-2 text-sm">
                  <ShipRow label="Lokasi" value={listing.seller.city ?? "—"} icon="pin" />
                  <ShipRow label="Berat paket" value={`${listing.weightGrams.toLocaleString("id-ID")} gr`} icon="weight" />
                  {(listing.couriers?.length ?? 0) > 0 && (
                    <ShipRow label="Kurir tersedia" value={listing.couriers!.map((c) => c.toUpperCase()).join(", ")} icon="truck" />
                  )}
                </dl>
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/>
                  </svg>
                  <span><b className="font-semibold">Bisa request packing aman</b> — bubble wrap + dus tebal</span>
                </div>
              </div>
            </Card>

            {/* Jaminan Hoobiq */}
            <Card className="mt-4">
              <div className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">Jaminan Hoobiq</p>
                <ul className="mt-3 flex flex-col gap-2.5 text-sm">
                  <Guarantee text="Produk 100% Original" />
                  <Guarantee text="Uang aman hingga barang diterima" />
                  <Guarantee text="Bantuan CS 24/7" />
                </ul>
                <Link
                  href="/bantuan"
                  className="mt-3 inline-block text-xs font-semibold text-brand-500 hover:text-brand-600"
                >
                  Pelajari lebih lanjut →
                </Link>
              </div>
            </Card>

          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-14 border-t border-rule pt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-flame-500">
                  Eksplor lebih
                </span>
                <h2 className="mt-1 text-2xl font-bold text-fg">Lihat produk lain</h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Item lain di kategori {listing.category.name} dari kolektor berbeda.
                </p>
              </div>
              <Link
                href={`/kategori/${encodeURIComponent(listing.category.slug)}`}
                className="text-sm font-semibold text-brand-500"
              >
                Lihat semua
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
              {related.map((l) => (
                <ListingCard key={l.id} l={l} meUsername={me?.username ?? null} />
              ))}
            </div>
          </section>
        )}

        {/* Reviews — pushed to the very bottom on both mobile and desktop
            so the product details (gallery, price, seller, protections)
            stay above the fold. The `#reviews` anchor in the aside still
            scrolls here. `scroll-mt-28` keeps the heading clear of the
            fixed header when the user jumps from the anchor. */}
        <div id="reviews" className="scroll-mt-28">
          <ListingReviews
            listingId={listing.id}
            slug={listing.slug}
            isLoggedIn={!!me}
            isOwn={isOwn}
          />
        </div>
      </div>
    </AppShell>
  );
}

/** Single label/value row inside the Spesifikasi block. Compact dl
 *  pattern (definition list) keeps semantics correct for screen
 *  readers and dual-column row alignment without a real <table>. */
function SpecRow({
  label, value, valueClass,
}: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex gap-4 px-4 py-2.5">
      <dt className="w-32 shrink-0 text-fg-subtle">{label}</dt>
      <dd className={"flex-1 font-medium text-fg " + (valueClass ?? "")}>{value}</dd>
    </div>
  );
}

function ShipRow({ label, value, icon }: { label: string; value: string; icon: "pin" | "weight" | "truck" }) {
  const ic = icon === "pin"
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    : icon === "weight"
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><path d="M6.5 8h11l1.5 12.5a2 2 0 0 1-2 2.5H7a2 2 0 0 1-2-2.5z"/></svg>
    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-panel-2 text-fg-muted">{ic}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-fg-subtle">{label}</p>
        <p className="font-medium text-fg">{value}</p>
      </div>
    </div>
  );
}

function Guarantee({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </span>
      <span className="text-fg">{text}</span>
    </li>
  );
}
