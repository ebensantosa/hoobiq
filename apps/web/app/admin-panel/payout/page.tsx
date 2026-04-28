import { AdminShell } from "@/components/admin-shell";
import { Card } from "@hoobiq/ui";

export const metadata = { title: "Payout · Admin Hoobiq", robots: { index: false } };

export default function AdminPayoutPage() {
  return (
    <AdminShell active="Payout">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Payout</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Antrian pencairan dana ke seller setelah order completed.
          </p>
        </div>
        <Card className="mt-8">
          <div className="p-10 text-center">
            <p className="text-base font-medium text-fg">Belum tersedia</p>
            <p className="mt-2 text-sm text-fg-muted">
              Tabel payout request belum di-wire. Untuk sekarang dana otomatis tetap ditahan
              di Hoobiq Pay sampai admin memproses transfer manual ke rekening seller.
            </p>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
