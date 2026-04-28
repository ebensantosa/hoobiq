import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Keuangan · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type Overview = {
  kpi: {
    gmv24hIdr: number;
    orders24h: number;
    escrowIdr: number;
  };
};

export default async function AdminKeuanganPage() {
  const data = await serverApi<Overview>("/admin/overview");
  const k = data?.kpi;

  return (
    <AdminShell active="Keuangan">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Keuangan</h1>
          <p className="mt-2 text-sm text-fg-muted">
            GMV, escrow, dan reconciliation. Detail revenue per fee + payout antrean
            akan tampil di sini setelah modul payout di-wire.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Tile label="GMV 24 jam"      value={k ? rp(k.gmv24hIdr) : "—"} />
          <Tile label="Order 24 jam"    value={fmt(k?.orders24h)} />
          <Tile label="Dana di escrow"  value={k ? rp(k.escrowIdr) : "—"} />
        </div>

        <Card className="mt-10 border-rule">
          <div className="p-5 text-sm">
            <p className="font-medium text-fg">Akses cepat</p>
            <ul className="mt-3 space-y-1.5 text-fg-muted">
              <li>· <Link href="/admin-panel/audit" className="text-brand-400 hover:underline">Audit transaksi finansial</Link></li>
              <li>· <Link href="/admin-panel/webhook" className="text-brand-400 hover:underline">Log webhook Midtrans</Link></li>
              <li>· <Link href="/admin-panel/payout" className="text-brand-400 hover:underline">Antrian payout</Link></li>
              <li>· <Link href="/admin-panel/transaksi" className="text-brand-400 hover:underline">Riwayat transaksi</Link></li>
            </ul>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}

function fmt(n: number | undefined) {
  return n == null ? "—" : n.toLocaleString("id-ID");
}
function rp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">{label}</p>
        <p className="mt-3 text-3xl font-bold text-fg">{value}</p>
      </div>
    </Card>
  );
}
