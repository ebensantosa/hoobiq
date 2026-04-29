import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Avatar, Card } from "@hoobiq/ui";
import { ListingGallery } from "@/components/listing-gallery";
import { ListingCard } from "@/components/listing-card";
import { ListingReviews } from "@/components/listing-reviews";
import { BoostTrigger } from "@/components/boost-trigger";
import { WishlistButton } from "@/components/wishlist-button";
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
      <div className="mx-auto max-w-[1200px] px-6 pb-12 lg:px-10">
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

        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          {/* Left — gallery + description */}
          <div>
            <ListingGallery
              images={listing.images}
              title={listing.title}
            />

            {/* Description */}
            <section className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">Deskripsi</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fg">
                {listing.description}
              </p>
            </section>

            {/* Specs — radius 4 (rounded-md) per spec, no oversized lozenges.
                Each cell has a defined card-style border + bg so the
                "Brand New / kondisi" info is visually distinct from the
                surrounding text. */}
            <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SpecCard label="Kondisi"  value={cond.label} accent />
              <SpecCard label="Stok"     value={String(listing.stock)} />
              <SpecCard label="Berat"    value={`${listing.weightGrams} gr`} />
              <SpecCard label="Kategori" value={listing.category.name} />
            </section>

            {/* Reviews — anchored for the "review" link in the aside.
                `scroll-mt-28` keeps the heading clear of the fixed header
                when the user lands here from the anchor. */}
            <div id="reviews" className="scroll-mt-28">
              <ListingReviews
                listingId={listing.id}
                slug={listing.slug}
                isLoggedIn={!!me}
                isOwn={isOwn}
              />
            </div>
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

            <p className="mt-4 text-3xl font-bold text-fg">Rp {listing.priceIdr.toLocaleString("id-ID")}</p>
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
                </>
              )}
            </div>

            {/* Seller card with a "Pesan sekarang" CTA per spec — buyer
                can ping the seller directly from the listing detail
                without round-tripping through the seller's profile. */}
            <Card className="mt-6">
              <div className="flex items-center gap-3 p-5">
                <Avatar
                  letter={listing.seller.username[0]?.toUpperCase() ?? "U"}
                  size="lg"
                  ring
                  src={listing.seller.avatarUrl ?? null}
                  alt={`Avatar @${listing.seller.username}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-fg">
                    {listing.seller.name ?? listing.seller.username}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-muted">
                    <span>Trust {listing.seller.trustScore.toFixed(1)}</span>
                    {listing.seller.city && <span>· {listing.seller.city}</span>}
                  </p>
                </div>
                <Link
                  href={`/u/${encodeURIComponent(listing.seller.username)}`}
                  className="text-xs font-semibold text-brand-500"
                >
                  Profil
                </Link>
              </div>
              {!isOwn && (
                <div className="border-t border-rule px-5 py-3">
                  <Link
                    href={
                      me
                        ? `/dm?to=${encodeURIComponent(listing.seller.username)}&listing=${encodeURIComponent(listing.slug)}`
                        : `/masuk?next=${encodeURIComponent(`/dm?to=${listing.seller.username}&listing=${listing.slug}`)}`
                    }
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-fg text-canvas text-sm font-semibold transition-colors hover:bg-fg/90"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Pesan sekarang
                  </Link>
                </div>
              )}
            </Card>

            {/* Protection */}
            <div className="mt-6 rounded-2xl border border-brand-400/30 bg-brand-400/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                <span className="text-brand-400">◆</span> Proteksi Hoobiq Pay
              </p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-fg-muted">
                <li>Pembayaran aman sampai barang diterima dengan baik</li>
                <li>Refund dijamin kalau barang tidak sesuai deskripsi</li>
                <li>Asuransi paket opsional saat checkout</li>
              </ul>
            </div>

            {/* Trade hint — hidden when the buyer is the seller (you
                can't trade with yourself), and when the listing has
                explicitly opted out of trade. The `tradeable` flag now
                defaults to true at upload time so this surfaces on most
                listings; sellers can disable per item. */}
            {!isOwn && listing.tradeable && (
            <div className="mt-4 rounded-md border border-rule p-4 text-xs text-fg-muted">
              Mau tukar daripada beli?{" "}
              <Link
                href={`/trades?to=${encodeURIComponent(listing.seller.username)}`}
                className="font-semibold text-brand-500"
              >
                Coba trade dengan {listing.seller.name ?? listing.seller.username}
              </Link>
            </div>
            )}
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
      </div>
    </AppShell>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">{label}</p>
      <p className="mt-1 text-sm font-medium text-fg">{value}</p>
    </div>
  );
}

/**
 * Spec cell rendered as its own little card. Per spec: radius 4 (Tailwind
 * `rounded-md` ≈ 6px is the closest scale token; `rounded` is 4px). The
 * "Kondisi" cell uses `accent=true` so brand-new / used info reads
 * unmistakably even at a glance.
 */
function SpecCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={
        "rounded p-3 " +
        (accent
          ? "border border-brand-400/50 bg-brand-400/10"
          : "border border-rule bg-panel")
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">{label}</p>
      <p className={"mt-1 text-sm font-semibold " + (accent ? "text-brand-500" : "text-fg")}>
        {value}
      </p>
    </div>
  );
}
