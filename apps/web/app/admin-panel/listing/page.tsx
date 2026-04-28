import { AdminShell } from "@/components/admin-shell";
import { Badge, Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";
import { ListingActions } from "./listing-actions";

export const metadata = { title: "Listing · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type AdminListing = {
  id: string;
  title: string;
  priceIdr: number;
  condition: string;
  moderation: string;
  isPublished: boolean;
  seller: string;
  category: string;
  views: number;
  createdAt: string;
};

const modTone: Record<string, "mint" | "crim" | "ghost"> = {
  active: "mint",
  pending: "crim",
  review: "crim",
  rejected: "ghost",
};

export default async function AdminListingPage() {
  const data = await serverApi<{ items: AdminListing[] }>("/admin/listings");
  const items = data?.items ?? [];

  return (
    <AdminShell active="Listing">
      <div className="px-8 py-8">
        <header className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Listing</h1>
          <p className="mt-2 text-sm text-fg-muted">{items.length} listing total</p>
        </header>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-rule bg-panel/40 p-10 text-center text-sm text-fg-muted">
            Belum ada listing.
          </div>
        ) : (
          <Card className="mt-6">
            <div className="grid grid-cols-[2fr_1fr_1fr_120px_60px_180px] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <span>Judul</span>
              <span>Seller</span>
              <span>Status</span>
              <span className="text-right">Harga</span>
              <span className="text-right">Views</span>
              <span className="text-right">Aksi</span>
            </div>
            {items.map((l, i) => (
              <div key={l.id} className={"grid grid-cols-[2fr_1fr_1fr_120px_60px_180px] items-center gap-4 px-5 py-3 text-sm " + (i < items.length - 1 ? "border-b border-rule/60" : "")}>
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{l.title}</p>
                  <p className="mt-0.5 text-xs text-fg-subtle">{l.category} · {l.condition.replace("_", " ")}</p>
                </div>
                <span className="truncate text-fg-muted">@{l.seller}</span>
                <span><Badge tone={modTone[l.moderation] ?? "ghost"} size="xs">{l.moderation}</Badge></span>
                <span className="text-right font-mono text-fg">Rp {l.priceIdr.toLocaleString("id-ID")}</span>
                <span className="text-right font-mono text-xs text-fg-muted">{l.views}</span>
                <ListingActions id={l.id} moderation={l.moderation} />
              </div>
            ))}
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
