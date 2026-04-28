import { AdminShell } from "@/components/admin-shell";
import { Card } from "@hoobiq/ui";

export const metadata = { title: "Broadcast · Admin Hoobiq", robots: { index: false } };

export default function AdminBroadcastPage() {
  return (
    <AdminShell active="Broadcast">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Broadcast</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Kirim pengumuman ke pengguna lewat email, push, atau in-app banner.
          </p>
        </div>
        <Card className="mt-8">
          <div className="p-10 text-center">
            <p className="text-base font-medium text-fg">Belum tersedia</p>
            <p className="mt-2 text-sm text-fg-muted">
              Sistem broadcast belum di-wire (butuh integrasi mailer + push provider).
              Untuk sekarang, kontak pengguna lewat <a className="text-brand-400 hover:underline" href="mailto:halo@hoobiq.id">email manual</a>.
            </p>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
