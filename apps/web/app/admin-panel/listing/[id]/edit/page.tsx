import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { serverApi } from "@/lib/server/api";
import { ListingEditForm, type AdminListingDetail, type CategoryOption } from "./form";

export const metadata = { title: "Edit listing · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type CategoryNode = { id: string; slug: string; name: string; level: number; children?: CategoryNode[] };

function flattenCategories(nodes: CategoryNode[], depth = 0, out: CategoryOption[] = []): CategoryOption[] {
  for (const n of nodes) {
    out.push({ id: n.id, label: `${"— ".repeat(depth)}${n.name}`, level: n.level });
    if (n.children?.length) flattenCategories(n.children, depth + 1, out);
  }
  return out;
}

export default async function AdminListingEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [listing, tree] = await Promise.all([
    serverApi<AdminListingDetail>(`/admin/listings/${encodeURIComponent(id)}`),
    serverApi<CategoryNode[]>("/categories", { revalidate: 60 }),
  ]);
  if (!listing) notFound();
  const categories = flattenCategories(tree ?? []);

  return (
    <AdminShell active="Listing">
      <div className="px-8 py-8">
        <div className="flex items-center gap-3 border-b border-rule pb-6">
          <Link
            href="/admin-panel/listing"
            className="text-xs font-semibold text-fg-muted hover:text-brand-400"
          >
            ← Kembali
          </Link>
          <span className="text-fg-subtle">/</span>
          <h1 className="truncate text-2xl font-bold text-fg">Edit: {listing.title}</h1>
        </div>
        <p className="mt-2 text-sm text-fg-muted">
          Edit penuh konten listing — judul, deskripsi, harga, kategori, foto, kondisi, stok.
          Gunakan field <b>Pindahkan ke seller</b> untuk mengalihkan kepemilikan ke user lain.
        </p>

        <ListingEditForm initial={listing} categories={categories} />
      </div>
    </AdminShell>
  );
}
