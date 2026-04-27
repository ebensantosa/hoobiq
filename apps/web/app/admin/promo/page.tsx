import { AdminShell } from "@/components/admin-shell";
import { Badge, Button, Card, TextTabs } from "@hoobiq/ui";

export const metadata = { title: "Promo & kupon · Admin Hoobiq", robots: { index: false } };

type Promo = {
  code: string;
  name: string;
  type: "%" | "Rp" | "ongkir";
  value: string;
  used: number;
  limit: number;
  min: string;
  endsIn: string;
  status: "active" | "scheduled" | "expired";
};

const promos: Promo[] = [
  { code: "EARLYBIRD",   name: "Early Member · 10% off",        type: "%",     value: "10%",   used: 742,  limit: 1000, min: "Rp 150rb", endsIn: "stok", status: "active" },
  { code: "KOLEKTOR50",  name: "Kolektor aktif · Rp 50rb off",   type: "Rp",    value: "50.000", used: 284, limit: 500, min: "Rp 500rb", endsIn: "12 hari", status: "active" },
  { code: "POKEMONTCG",  name: "Kategori Pokémon · gratis ongkir", type: "ongkir", value: "Ongkir", used: 98, limit: 200, min: "Rp 300rb", endsIn: "5 hari", status: "active" },
  { code: "RAMADAN2026", name: "Ramadan · 15% off (jadwal)",     type: "%",     value: "15%",   used: 0,    limit: 2000, min: "Rp 200rb", endsIn: "Mulai 1 Mar", status: "scheduled" },
  { code: "LAUNCHDAY",   name: "Launch day · Rp 25rb off",       type: "Rp",    value: "25.000", used: 412, limit: 412, min: "—",         endsIn: "Habis", status: "expired" },
];

const statusMap = {
  active:    { label: "Aktif",     tone: "mint"  as const },
  scheduled: { label: "Terjadwal", tone: "crim"  as const },
  expired:   { label: "Kadaluarsa",tone: "ghost" as const },
};

export default function AdminPromoPage() {
  return (
    <AdminShell active="Promo & kupon">
      <div className="px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
          <div>
            <h1 className="text-3xl font-bold text-fg">Promo & kupon</h1>
            <p className="mt-2 text-sm text-fg-muted">
              Kelola kode promo, cashback, dan campaign ongkir. Budget bulan ini: Rp 45 juta.
            </p>
          </div>
          <Button variant="primary" size="sm">+ Buat kampanye</Button>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          <Tile label="Kampanye aktif" value="3" />
          <Tile label="Redemption 30 hari" value="1.124" />
          <Tile label="Budget terpakai" value="Rp 28.4jt" sub="dari Rp 45jt" />
          <Tile label="ROI (uplift GMV)"  value="3.2×" accent="up" />
        </div>

        <div className="mt-8 flex items-center justify-between">
          <TextTabs options={["Semua", "Aktif", "Terjadwal", "Kadaluarsa"]} />
        </div>

        <Card className="mt-4">
          <div className="grid grid-cols-[140px_2fr_1fr_1fr_1fr_100px] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            <span>Kode</span>
            <span>Deskripsi</span>
            <span>Pemakaian</span>
            <span>Min. order</span>
            <span>Status</span>
            <span className="text-right">Aksi</span>
          </div>
          {promos.map((p, i) => (
            <div
              key={p.code}
              className={
                "grid grid-cols-[140px_2fr_1fr_1fr_1fr_100px] items-center gap-4 px-5 py-3 text-sm " +
                (i < promos.length - 1 ? "border-b border-rule/60" : "")
              }
            >
              <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-brand-400/30 bg-brand-400/10 px-2 py-1 font-mono text-xs font-semibold text-brand-400">
                {p.code}
              </span>
              <div className="min-w-0">
                <p className="truncate text-fg">{p.name}</p>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  {p.type === "%" ? `Diskon ${p.value}` : p.type === "Rp" ? `Potongan Rp ${p.value}` : "Gratis ongkir"}
                  {" · berakhir "}{p.endsIn}
                </p>
              </div>
              <div>
                <p className="text-xs text-fg">
                  <b>{p.used}</b>
                  <span className="text-fg-subtle"> / {p.limit}</span>
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-panel-2">
                  <div
                    className="h-full bg-gradient-to-r from-brand-400 to-flame-400"
                    style={{ width: `${Math.min(100, (p.used / p.limit) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-fg-muted">{p.min}</span>
              <span>
                <Badge tone={statusMap[p.status].tone} size="xs">{statusMap[p.status].label}</Badge>
              </span>
              <span className="text-right">
                <button className="text-xs text-brand-400 hover:underline">Edit</button>
              </span>
            </div>
          ))}
        </Card>
      </div>
    </AdminShell>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "up" }) {
  return (
    <Card>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{label}</p>
        <p className={"mt-2 text-2xl font-bold " + (accent === "up" ? "text-brand-400" : "text-fg")}>{value}</p>
        {sub && <p className="mt-1 text-xs text-fg-muted">{sub}</p>}
      </div>
    </Card>
  );
}
