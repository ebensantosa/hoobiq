import { AdminShell } from "@/components/admin-shell";
import { CategoryRequestsModerator } from "./moderator";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Request Kategori · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type RequestItem = {
  id: string;
  name: string;
  slugHint: string | null;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  rejectNote: string | null;
  parent: { slug: string; name: string; level: number };
  user:   { username: string; name: string | null; avatarUrl: string | null };
  createdAt: string;
  decidedAt: string | null;
};

export default async function AdminKategoriRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status === "approved" || sp.status === "rejected" ? sp.status : "pending";
  const data = await serverApi<{ items: RequestItem[] }>(`/categories/requests?status=${status}`);
  const items = data?.items ?? [];

  return (
    <AdminShell active="Kategori">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Request Kategori</h1>
          <p className="mt-2 text-sm text-fg-muted">
            User-submitted sub-categories awaiting moderation. Approve to insert
            into the catalog, reject with a short note. Slug is editable on
            approve — must be unique and URL-safe.
          </p>
        </div>
        <CategoryRequestsModerator initial={items} status={status} />
      </div>
    </AdminShell>
  );
}
