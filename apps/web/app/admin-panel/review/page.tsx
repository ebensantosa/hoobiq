import { AdminShell } from "@/components/admin-shell";
import { ReviewsModerator } from "./moderator";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Review · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type AdminReview = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  listing: { id: string; slug: string; title: string };
  buyer: { id: string; username: string; name: string | null };
};

export default async function AdminReviewPage() {
  const data = await serverApi<{ items: AdminReview[] }>("/admin/reviews");
  const items = data?.items ?? [];

  return (
    <AdminShell active="Review">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Review</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Edit rating + body atau hapus review yang melanggar. Perubahan langsung tercermin di halaman listing.
          </p>
        </div>
        <ReviewsModerator initial={items} />
      </div>
    </AdminShell>
  );
}
