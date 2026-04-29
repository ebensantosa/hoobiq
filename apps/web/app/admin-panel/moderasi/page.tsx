import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Moderasi · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type AdminListing = {
  id: string;
  title: string;
  moderation: string;
  seller: string;
};

export default async function AdminModerasiPage() {
  // Pull listings tagged for moderation review. The /admin/listings endpoint
  // already supports a status filter; "pending" maps to brand-new uploads
  // awaiting first-look approval.
  const data = await serverApi<{ items: AdminListing[] }>("/admin/listings?status=pending");
  const items = data?.items ?? [];

  return (
    <AdminShell active="Moderasi feed">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Moderasi</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Listing baru menunggu review. Approve atau hapus dari halaman <Link href="/admin-panel/listing" className="text-brand-400">Listing</Link>.
          </p>
        </div>

        {items.length === 0 ? (
          <Card className="mt-8">
            <div className="p-10 text-center text-sm text-fg-muted">
              Tidak ada listing yang menunggu moderasi.
            </div>
          </Card>
        ) : (
          <Card className="mt-8">
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <span>Judul</span>
              <span>Seller</span>
              <span className="text-right">Status</span>
            </div>
            {items.map((l, i) => (
              <div
                key={l.id}
                className={"grid grid-cols-[2fr_1fr_1fr] items-center gap-4 px-5 py-3 text-sm " + (i < items.length - 1 ? "border-b border-rule/60" : "")}
              >
                <p className="truncate text-fg">{l.title}</p>
                <span className="truncate text-fg-muted">@{l.seller}</span>
                <span className="text-right text-flame-500">{l.moderation}</span>
              </div>
            ))}
          </Card>
        )}

        <Card className="mt-8 border-rule">
          <div className="p-5 text-sm">
            <p className="font-medium text-fg">Moderasi feed/post</p>
            <p className="mt-1 text-xs text-fg-muted">
              Untuk laporan dari pengguna terhadap post atau komentar, lihat halaman{" "}
              <Link href="/admin-panel/laporan" className="text-brand-400">Laporan & abuse</Link>.
            </p>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
