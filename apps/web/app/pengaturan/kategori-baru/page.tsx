import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@hoobiq/ui";
import { CategoryRequestForm } from "@/components/category-request-form";
import { serverApi } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Request kategori · Pengaturan · Hoobiq" };

type Node = {
  id: string;
  slug: string;
  name: string;
  level: number;
  children?: Node[];
};

type RequestRow = {
  id: string;
  name: string;
  slugHint: string | null;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  rejectNote: string | null;
  parent: { slug: string; name: string };
  categoryId: string | null;
  createdAt: string;
  decidedAt: string | null;
};

const STATUS_TONE: Record<string, string> = {
  pending:  "bg-amber-400/15 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-flame-400/15 text-flame-600 dark:text-flame-400",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu review",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export default async function KategoriBaruPage() {
  const session = await getSessionUser();
  if (!session) redirect("/masuk?next=/pengaturan/kategori-baru");

  const [tree, mine] = await Promise.all([
    serverApi<Node[]>("/categories", { revalidate: 60 }),
    serverApi<{ items: RequestRow[] }>("/categories/requests/mine"),
  ]);
  const items = mine?.items ?? [];

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold text-fg">Request kategori baru</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Belum ada series/anime/brand yang kamu cari di tree kategori? Ajukan
          di sini — admin review dan kalau di-approve langsung muncul untuk
          semua kolektor.
        </p>
      </div>

      <CategoryRequestForm tree={tree ?? []} />

      <div>
        <h3 className="text-base font-semibold text-fg">Request kamu</h3>
        {items.length === 0 ? (
          <p className="mt-3 rounded-md border border-rule bg-panel/40 p-6 text-center text-sm text-fg-muted">
            Belum ada request. Kirim yang pertama di atas.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {items.map((r) => (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={"inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider " + (STATUS_TONE[r.status] ?? "")}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
                        {new Date(r.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-fg">{r.name}</p>
                    <p className="text-xs text-fg-muted">
                      Diajukan di bawah {" "}
                      <Link href={`/kategori/${r.parent.slug}`} className="text-brand-500">
                        {r.parent.name}
                      </Link>
                    </p>
                    {r.description && (
                      <p className="mt-2 text-sm text-fg-muted">“{r.description}”</p>
                    )}
                    {r.status === "rejected" && r.rejectNote && (
                      <p className="mt-2 text-xs text-flame-600">
                        <span className="font-semibold">Catatan admin:</span> {r.rejectNote}
                      </p>
                    )}
                    {r.status === "approved" && r.categoryId && (
                      <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                        ✓ Sudah masuk tree — bisa langsung dipakai saat listing.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
