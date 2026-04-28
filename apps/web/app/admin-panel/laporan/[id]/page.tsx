import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@hoobiq/ui";

export const metadata = { title: "Detail laporan · Admin Hoobiq", robots: { index: false } };

export default async function AdminLaporanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminShell active="Laporan & abuse">
      <div className="px-8 py-8">
        <nav className="mb-6 text-xs text-fg-subtle">
          <Link href="/admin-panel/laporan" className="hover:text-fg">Laporan</Link>
          <span className="mx-2">/</span>
          <span className="font-mono">{id}</span>
        </nav>
        <Card>
          <div className="p-10 text-center">
            <p className="text-base font-medium text-fg">Belum tersedia</p>
            <p className="mt-2 text-sm text-fg-muted">
              Detail laporan akan muncul di sini saat modul Report di-wire (lihat halaman Laporan).
            </p>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
