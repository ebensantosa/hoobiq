import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@hoobiq/ui";
import { CardArt, pickArt } from "@/components/card-art";
import { serverApi } from "@/lib/server/api";
import { conditionBadge } from "@/lib/condition-badge";
import type { WishlistItem } from "@/lib/api/wishlist";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const data = await serverApi<{ items: WishlistItem[] }>("/wishlist");
  const items = data?.items ?? [];

  return (
    <AppShell active="Feeds">
      <div className="px-6 pb-8 lg:px-10">
        <header className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Wishlist</h1>
          <p className="mt-2 text-sm text-fg-muted">
            {items.length === 0
              ? "Item yang kamu simpan akan muncul di sini."
              : `${items.length} item disimpan. Kami notifikasi kalau harga turun atau stok masuk.`}
          </p>
        </header>

        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-rule bg-panel/40 p-12 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-400/10 text-brand-400">♥</div>
            <p className="mt-4 text-base font-medium text-fg">Wishlist masih kosong</p>
            <p className="mt-1 text-sm text-fg-muted">Tambah item dari halaman listing untuk melacak harga.</p>
            <Link href="/marketplace" className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-brand-400 px-5 text-sm font-semibold text-white hover:bg-brand-500">
              Jelajahi marketplace
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {items.map((w) => (
              <Link
                key={w.id}
                href={`/listing/${w.listing.slug}`}
                className="group block overflow-hidden rounded-2xl border border-rule bg-panel transition-colors hover:border-brand-400/50"
              >
                <div className="relative aspect-square overflow-hidden bg-panel-2">
                  {w.listing.cover ? (
                    <img src={w.listing.cover} alt={w.listing.title} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <CardArt variant={pickArt(w.listing.slug)} />
                  )}
                  {(() => {
                    const c = conditionBadge(w.listing.condition);
                    return (
                      <Badge tone={c.tone} size="xs" className="absolute left-3 top-3">
                        {c.label}
                      </Badge>
                    );
                  })()}
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-fg">{w.listing.title}</p>
                  <p className="mt-1 text-xs text-fg-subtle">{w.listing.seller.city ?? "Lokasi belum diisi"}</p>
                  <p className="mt-3 text-base font-bold text-fg">Rp {w.listing.priceIdr.toLocaleString("id-ID")}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
