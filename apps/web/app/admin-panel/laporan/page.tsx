import { AdminShell } from "@/components/admin-shell";
import { Card } from "@hoobiq/ui";

export const metadata = { title: "Laporan · Admin Hoobiq", robots: { index: false } };

export default function AdminLaporanPage() {
  return (
    <AdminShell active="Laporan & abuse">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Laporan & abuse</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Laporan dari pengguna terhadap user/listing/post.
          </p>
        </div>
        <Card className="mt-8">
          <div className="p-10 text-center">
            <p className="text-base font-medium text-fg">Belum ada laporan</p>
            <p className="mt-2 text-sm text-fg-muted">
              UI laporan belum di-wire ke tabel <code className="font-mono">Report</code>.
              Endpoint admin akan ditambah saat fitur "report" diaktifkan untuk user.
            </p>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
