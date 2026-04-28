import { AdminShell } from "@/components/admin-shell";
import { Card } from "@hoobiq/ui";

export const metadata = { title: "Promo & kupon · Admin Hoobiq", robots: { index: false } };

export default function AdminPromoPage() {
  return (
    <AdminShell active="Promo & kupon">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Promo & kupon</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Kode promo dengan kuota dan masa berlaku.
          </p>
        </div>
        <Card className="mt-8">
          <div className="p-10 text-center">
            <p className="text-base font-medium text-fg">Belum tersedia</p>
            <p className="mt-2 text-sm text-fg-muted">
              UI manajemen promo belum di-wire ke tabel <code className="font-mono">PromoCode</code>.
              Schema sudah ada — endpoint admin CRUD bisa ditambah saat kamu siap pakai.
            </p>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
