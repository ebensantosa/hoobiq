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
    omsetMonthIdr: number;
    omsetLifetimeIdr: number;
    keuntungan24hIdr: number;
    keuntunganMonthIdr: number;
    keuntunganLifetimeIdr: number;
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
            Omset (gross transaksi) + keuntungan platform (1% buyer fee + 5% seller fee).
            Detail audit transaksi + antrian payout di link bawah.
          </p>
        </div>

        {/* Omset = total transaksi pembeli yang sudah dibayar. */}
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-fg-subtle">Omset (GMV)</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Tile label="Omset 24 jam"     value={k ? rp(k.gmv24hIdr) : "—"} />
            <Tile label="Omset bulan ini"  value={k ? rp(k.omsetMonthIdr) : "—"} />
            <Tile label="Omset all-time"   value={k ? rp(k.omsetLifetimeIdr) : "—"} accent="brand" />
          </div>
        </div>

        {/* Keuntungan = revenue platform dari fee, hanya order yg sudah completed. */}
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-fg-subtle">
            Keuntungan platform <span className="ml-1 normal-case text-fg-subtle">(buyer 1% + seller 5%)</span>
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Tile label="Keuntungan 24 jam"     value={k ? rp(k.keuntungan24hIdr) : "—"} />
            <Tile label="Keuntungan bulan ini"  value={k ? rp(k.keuntunganMonthIdr) : "—"} />
            <Tile label="Keuntungan all-time"   value={k ? rp(k.keuntunganLifetimeIdr) : "—"} accent="emerald" />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Tile label="Order 24 jam"    value={fmt(k?.orders24h)} />
          <Tile label="Dana di escrow"  value={k ? rp(k.escrowIdr) : "—"} />
        </div>

        <Card className="mt-10 border-rule">
          <div className="p-5 text-sm">
            <p className="font-medium text-fg">Akses cepat</p>
            <ul className="mt-3 space-y-1.5 text-fg-muted">
              <li>· <Link href="/admin-panel/audit" className="text-brand-400">Audit transaksi finansial</Link></li>
              <li>· <Link href="/admin-panel/webhook" className="text-brand-400">Log webhook Midtrans</Link></li>
              <li>· <Link href="/admin-panel/payout" className="text-brand-400">Antrian payout</Link></li>
              <li>· <Link href="/admin-panel/transaksi" className="text-brand-400">Riwayat transaksi</Link></li>
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

function Tile({ label, value, accent }: { label: string; value: string; accent?: "brand" | "emerald" }) {
  const tone = accent === "brand"
    ? "border-brand-400/40 bg-brand-500/5"
    : accent === "emerald"
    ? "border-emerald-400/40 bg-emerald-500/5"
    : "";
  return (
    <Card className={tone}>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">{label}</p>
        <p className="mt-3 text-3xl font-bold text-fg">{value}</p>
      </div>
    </Card>
  );
}
