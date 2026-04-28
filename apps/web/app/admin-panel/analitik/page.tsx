import { AdminShell } from "@/components/admin-shell";
import { Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Analitik · Admin Hoobiq", robots: { index: false } };
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
  };
};

type AdminCategory = {
  id: string;
  name: string;
  level: number;
  listingCount: number;
};

export default async function AdminAnalitikPage() {
  const [overview, cats] = await Promise.all([
    serverApi<Overview>("/admin/overview"),
    serverApi<{ items: AdminCategory[] }>("/admin/categories"),
  ]);

  const k = overview?.kpi;
  // Show top 5 categories by direct listing count. Tree-rolled-up counts
  // would need an additional aggregate; for the admin panel the direct
  // count is informative enough.
  const topCats = (cats?.items ?? [])
    .filter((c) => c.listingCount > 0)
    .sort((a, b) => b.listingCount - a.listingCount)
    .slice(0, 8);

  return (
    <AdminShell active="Analitik">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Analitik</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Snapshot real dari database. Detail growth (DAU/funnel/cohort) belum di-track —
            akan muncul di sini saat instrumentasi event landing.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Tile label="Pengguna aktif"    value={fmt(k?.userCount)} />
          <Tile label="Aktif 7 hari"      value={fmt(k?.activeWeek)} />
          <Tile label="Listing live"      value={fmt(k?.listingCount)} />
          <Tile label="Dispute terbuka"   value={fmt(k?.openDisputes)} accent={(k?.openDisputes ?? 0) > 0} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Tile label="GMV 24 jam"        value={k ? rp(k.gmv24hIdr) : "—"} />
          <Tile label="Order 24 jam"      value={fmt(k?.orders24h)} />
          <Tile label="Dana di escrow"    value={k ? rp(k.escrowIdr) : "—"} />
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-fg">Top kategori (per jumlah listing)</h2>
          {topCats.length === 0 ? (
            <Card className="mt-4">
              <div className="p-8 text-center text-sm text-fg-muted">Belum ada kategori dengan listing.</div>
            </Card>
          ) : (
            <Card className="mt-4">
              <div className="grid grid-cols-[1fr_100px] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                <span>Kategori</span>
                <span className="text-right">Listing</span>
              </div>
              {topCats.map((c, i) => (
                <div
                  key={c.id}
                  className={
                    "grid grid-cols-[1fr_100px] items-center gap-4 px-5 py-3 text-sm " +
                    (i < topCats.length - 1 ? "border-b border-rule/60" : "")
                  }
                >
                  <span className="text-fg" style={{ paddingLeft: (c.level - 1) * 16 }}>{c.name}</span>
                  <span className="text-right font-mono font-medium text-fg">{c.listingCount.toLocaleString("id-ID")}</span>
                </div>
              ))}
            </Card>
          )}
        </section>

        <Card className="mt-10 border-rule">
          <div className="p-5 text-sm">
            <p className="font-medium text-fg">Butuh analitik lebih dalam?</p>
            <p className="mt-1 text-xs text-fg-muted">
              Funnel, cohort, retention, dan distribusi kota perlu instrumentasi event tracking
              terpisah (PostHog / Mixpanel / Plausible). Belum di-wire — kasih tahu kalau mau di-pasang.
            </p>
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

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">{label}</p>
        <p className={"mt-3 text-3xl font-bold " + (accent ? "text-flame-500" : "text-fg")}>{value}</p>
      </div>
    </Card>
  );
}
