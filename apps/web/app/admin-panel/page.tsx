import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Dashboard · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type Overview = {
  kpi: {
    userCount: number;
    activeWeek: number;
    listingCount: number;
    openDisputes: number;
    gmv24hIdr: number;
    orders24h: number;
    escrowIdr: number;
    omsetMonthIdr: number;
    omsetLifetimeIdr: number;
    keuntungan24hIdr: number;
    keuntunganMonthIdr: number;
    keuntunganLifetimeIdr: number;
  };
  recentActivity: Array<{ id: string; actor: string; action: string; target: string; at: string }>;
};

export default async function AdminDashboard() {
  const data = await serverApi<Overview>("/admin/overview");

  if (!data) {
    return (
      <AdminShell active="Dashboard">
        <div className="px-8 py-12 text-center text-fg-muted">
          Tidak bisa memuat dashboard. Pastikan kamu masuk sebagai akun dengan role admin/ops.
        </div>
      </AdminShell>
    );
  }

  const k = data.kpi;
  const tiles = [
    { label: "Pengguna aktif",  value: k.userCount.toLocaleString("id-ID") },
    { label: "Aktif 7 hari",    value: k.activeWeek.toLocaleString("id-ID") },
    { label: "Listing live",    value: k.listingCount.toLocaleString("id-ID") },
    { label: "Dispute terbuka", value: String(k.openDisputes), accent: k.openDisputes > 0 },
  ];
  const money = [
    { label: "Omset 24 jam",        value: `Rp ${k.gmv24hIdr.toLocaleString("id-ID")}` },
    { label: "Omset bulan ini",     value: `Rp ${k.omsetMonthIdr.toLocaleString("id-ID")}` },
    { label: "Omset all-time",      value: `Rp ${k.omsetLifetimeIdr.toLocaleString("id-ID")}` },
    { label: "Keuntungan 24 jam",   value: `Rp ${k.keuntungan24hIdr.toLocaleString("id-ID")}` },
    { label: "Keuntungan bulan ini", value: `Rp ${k.keuntunganMonthIdr.toLocaleString("id-ID")}` },
    { label: "Keuntungan all-time", value: `Rp ${k.keuntunganLifetimeIdr.toLocaleString("id-ID")}` },
    { label: "Order 24 jam",        value: String(k.orders24h) },
    { label: "Dana di escrow",      value: `Rp ${k.escrowIdr.toLocaleString("id-ID")}` },
  ];

  return (
    <AdminShell active="Dashboard">
      <div className="px-8 py-8">
        <header className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Dashboard</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Kesehatan platform real-time — semua angka berasal langsung dari database.
          </p>
        </header>

        <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {tiles.map((t) => (
            <Card key={t.label}>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">{t.label}</p>
                <p className={"mt-3 text-3xl font-bold " + (t.accent ? "text-flame-500" : "text-fg")}>{t.value}</p>
              </div>
            </Card>
          ))}
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {money.map((t) => (
            <Card key={t.label}>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">{t.label}</p>
                <p className="mt-3 text-2xl font-bold text-fg">{t.value}</p>
              </div>
            </Card>
          ))}
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="text-xl font-semibold text-fg">Akses cepat</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Pengguna", href: "/admin-panel/pengguna" },
                { label: "Listing", href: "/admin-panel/listing" },
                { label: "Transaksi", href: "/admin-panel/transaksi" },
                { label: "Dispute", href: "/admin-panel/dispute" },
                { label: "Audit log", href: "/admin/audit" },
                { label: "Webhook", href: "/admin-panel/webhook" },
              ].map((q) => (
                <Link key={q.href} href={q.href} className="rounded-lg border border-rule bg-panel p-4 text-sm text-fg transition-colors hover:border-brand-400/50">
                  {q.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-fg">Aktivitas admin terakhir</h2>
            <Card className="mt-4">
              {data.recentActivity.length === 0 ? (
                <div className="p-6 text-center text-sm text-fg-muted">Belum ada aktivitas.</div>
              ) : (
                data.recentActivity.map((a, i, arr) => (
                  <div key={a.id} className={"flex items-start gap-3 px-5 py-3 text-sm " + (i < arr.length - 1 ? "border-b border-rule/60" : "")}>
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-fg"><b>{a.actor}</b> <span className="text-fg-muted">{a.action}</span></p>
                      <p className="mt-0.5 truncate text-xs text-fg-subtle">{a.target} · {new Date(a.at).toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
