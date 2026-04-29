import { AdminShell } from "@/components/admin-shell";
import { CategoriesEditor } from "./categories-editor";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Kategori · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  level: number;
  order: number;
  parentId: string | null;
  parentName: string | null;
  imageUrl: string | null;
  listingCount: number;
  childCount: number;
};

export default async function AdminKategoriPage() {
  const data = await serverApi<{ items: AdminCategory[] }>("/admin/categories");
  const items = data?.items ?? [];

  return (
    <AdminShell active="Kategori">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Kategori</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Tambah, edit, atau hapus kategori marketplace. Kategori dengan listing/sub-kategori tidak bisa dihapus.
          </p>
        </div>
        <CategoriesEditor initial={items} />
      </div>
    </AdminShell>
  );
}
