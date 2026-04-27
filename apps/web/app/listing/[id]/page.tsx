import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Avatar, Badge, Card } from "@hoobiq/ui";
import { ListingGallery } from "@/components/listing-gallery";
import { ListingReviews } from "@/components/listing-reviews";
import { serverApi } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/session";
import type { ListingDetail } from "@hoobiq/types";

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
              condition={listing.condition}
            />

            {/* Description */}
            <section className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">Deskripsi</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fg">
                {listing.description}
              </p>
            </section>

            {/* Specs */}
            <section className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 rounded-2xl border border-rule bg-panel p-5 sm:grid-cols-4">
              <Spec label="Kondisi"  value={listing.condition.replace("_", " ")} />
              <Spec label="Stok"     value={String(listing.stock)} />
              <Spec label="Berat"    value={`${listing.weightGrams} gr`} />
              <Spec label="Kategori" value={listing.category.name} />
            </section>

            {/* Reviews — anchored for the "review →" link in the aside.
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
                    {ratingCount} review →
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
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-brand-400 px-6 text-sm font-semibold text-white hover:bg-brand-500"
                  >
                    Edit listing
                  </Link>
                  <Link
                    href="/jual"
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-rule px-6 text-sm font-medium text-fg hover:border-brand-400/60"
                  >
                    Dashboard
                  </Link>
                </>
              ) : listing.stock <= 0 ? (
                <span className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-dashed border-rule px-6 text-sm font-medium text-fg-subtle">
                  Stok habis
                </span>
              ) : (
                <>
                  <Link
                    href={`/checkout?listing=${encodeURIComponent(listing.slug)}`}
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-brand-400 px-6 text-sm font-semibold text-white hover:bg-brand-500"
                  >
                    Beli sekarang
                  </Link>
                  <Link
                    href={`/dm?to=${encodeURIComponent(listing.seller.username)}`}
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-rule px-6 text-sm font-medium text-fg hover:border-brand-400/60"
                  >
                    Pesan seller
                  </Link>
                </>
              )}
            </div>

            {/* Seller card — uses real avatar, separates trustScore label so
                it's not confused with listing's own review rating. */}
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
                    {listing.seller.name ?? `@${listing.seller.username}`}
                  </p>
                  <p className="truncate text-xs text-fg-subtle">@{listing.seller.username}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-muted">
                    <span>Trust {listing.seller.trustScore.toFixed(1)}</span>
                    {listing.seller.city && <span>· {listing.seller.city}</span>}
                  </p>
                </div>
                <Link
                  href={`/u/${encodeURIComponent(listing.seller.username)}`}
                  className="text-xs font-semibold text-brand-500 hover:underline"
                >
                  Profil →
                </Link>
              </div>
            </Card>

            {/* Protection */}
            <div className="mt-6 rounded-2xl border border-brand-400/30 bg-brand-400/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                <span className="text-brand-400">◆</span> Proteksi Hoobiq Pay
              </p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-fg-muted">
                <li>Dana ditahan 72 jam setelah barang diterima</li>
                <li>Refund otomatis kalau tidak sesuai deskripsi</li>
                <li>Asuransi paket opsional saat checkout</li>
              </ul>
            </div>

            {/* Quick reassurance: trade-in option */}
            <div className="mt-4 rounded-2xl border border-rule p-4 text-xs text-fg-muted">
              Mau tukar daripada beli?{" "}
              <Link
                href={`/trades?to=${encodeURIComponent(listing.seller.username)}`}
                className="font-semibold text-brand-500 hover:underline"
              >
                Coba trade dengan @{listing.seller.username}
              </Link>
            </div>
          </aside>
        </div>

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
