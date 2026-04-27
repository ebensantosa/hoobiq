import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Badge, Card, TextTabs } from "@hoobiq/ui";

export const metadata = { title: "Keuangan · Admin Hoobiq", robots: { index: false } };

const revenue = [
  { label: "Fee platform (2%)",  value: "Rp 184.240.000", pct: 62.4 },
  { label: "Fee Hoobiq Pay (1%)", value: "Rp  92.120.000", pct: 31.2 },
  { label: "Boost listing",       value: "Rp  18.750.000", pct:  6.4 },
];

const recon = [
  { k: "Total GMV 30 hari",       v: "Rp 9.212.000.000" },
  { k: "Pendapatan platform",     v: "Rp 295.110.000" },
  { k: "Refund diproses",         v: "Rp  42.800.000" },
  { k: "Dana masih di escrow",    v: "Rp 2.140.000.000" },
  { k: "Payout ke seller",        v: "Rp 6.730.000.000" },
];

const paymentMix = [
  { method: "BCA VA",    pct: 28, volume: "Rp 2.58 M" },
  { method: "GoPay",     pct: 18, volume: "Rp 1.66 M" },
  { method: "Mandiri VA",pct: 14, volume: "Rp 1.29 M" },
  { method: "QRIS",      pct: 12, volume: "Rp 1.11 M" },
  { method: "OVO",       pct:  9, volume: "Rp 828 jt" },
  { method: "Kartu kredit", pct: 8, volume: "Rp 737 jt" },
  { method: "DANA",      pct:  6, volume: "Rp 553 jt" },
  { method: "ShopeePay", pct:  5, volume: "Rp 461 jt" },
];

const ledger = [
  { id: "LDG-04841", date: "25 Apr 14:03", kind: "in",  label: "Fee platform · tx HBQ-2026-04847291",     amount: "+Rp 85.010" },
  { id: "LDG-04840", date: "25 Apr 13:00", kind: "out", label: "Payout ke @opccollector",                  amount: "-Rp 850.000" },
  { id: "LDG-04839", date: "25 Apr 12:48", kind: "in",  label: "Fee Hoobiq Pay · tx HBQ-2026-04847190",   amount: "+Rp 28.340" },
  { id: "LDG-04838", date: "25 Apr 12:10", kind: "in",  label: "Boost listing @pokemonid (7 hari)",        amount: "+Rp 15.000" },
  { id: "LDG-04837", date: "25 Apr 10:22", kind: "out", label: "Refund ke @nendohunt · dispute #42",       amount: "-Rp 1.450.000" },
  { id: "LDG-04836", date: "25 Apr 09:44", kind: "in",  label: "Top-up saldo Hoobiq Pay · @adityacollects", amount: "+Rp 3.000.000" },
];

export default function AdminKeuanganPage() {
  return (
    <AdminShell active="Keuangan">
      <div className="px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
          <div>
            <h1 className="text-3xl font-bold text-fg">Keuangan</h1>
            <p className="mt-2 text-sm text-fg-muted">
              Rekonsiliasi, revenue split, dan ledger internal. Data sinkron dengan Midtrans tiap 15 menit.
            </p>
          </div>
          <TextTabs options={["30 hari", "7 hari", "24 jam", "Kustom"]} />
        </div>

        {/* Headline numbers */}
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <BigTile label="Revenue 30 hari" value="Rp 295.1jt" delta="+14.2%" />
          <BigTile label="GMV 30 hari"     value="Rp 9.21 M"  delta="+18.6%" />
          <BigTile label="Dana di escrow"  value="Rp 2.14 M" sub="342 transaksi aktif" />
          <BigTile label="Refund ratio"    value="0.46%" sub="Dari total GMV" accent="down" />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          {/* Revenue breakdown */}
          <section>
            <h2 className="text-xl font-semibold text-fg">Breakdown pendapatan</h2>
            <Card className="mt-4">
              <div className="p-6">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-panel-2">
                  <span className="bg-brand-400" style={{ width: `${revenue[0].pct}%` }} />
                  <span className="bg-ultra-400" style={{ width: `${revenue[1].pct}%` }} />
                  <span className="bg-flame-400" style={{ width: `${revenue[2].pct}%` }} />
                </div>
                <ul className="mt-5 space-y-3">
                  {revenue.map((r, i) => (
                    <li key={r.label} className="flex items-center gap-3">
                      <span
                        className={
                          "h-2 w-2 rounded-full " +
                          (i === 0 ? "bg-brand-400" : i === 1 ? "bg-ultra-400" : "bg-flame-400")
                        }
                      />
                      <span className="flex-1 text-sm text-fg">{r.label}</span>
                      <span className="font-mono text-sm text-fg-muted">{r.pct}%</span>
                      <span className="w-36 text-right font-mono text-sm font-medium text-fg">{r.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <h2 className="mt-8 text-xl font-semibold text-fg">Mix metode pembayaran</h2>
            <Card className="mt-4">
              <div className="flex flex-col gap-2 p-6">
                {paymentMix.map((p) => (
                  <div key={p.method} className="flex items-center gap-4">
                    <span className="w-28 text-sm text-fg">{p.method}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-panel-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-brand-400 to-flame-400"
                        style={{ width: `${p.pct * 3}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-xs text-fg-muted">{p.pct}%</span>
                    <span className="w-24 text-right font-mono text-xs text-fg">{p.volume}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {/* Reconciliation */}
          <aside className="flex flex-col gap-6">
            <Card>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-fg">Rekonsiliasi</h2>
                <p className="mt-1 text-xs text-fg-muted">
                  Total flow 30 hari. Harus balance dengan laporan Midtrans.
                </p>
                <dl className="mt-5 space-y-3 text-sm">
                  {recon.map((r) => (
                    <div key={r.k} className="flex items-center justify-between gap-3">
                      <dt className="text-fg-muted">{r.k}</dt>
                      <dd className="font-mono text-fg">{r.v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 flex items-center justify-between rounded-lg border border-brand-400/30 bg-brand-400/5 px-4 py-3 text-sm">
                  <span className="font-medium text-fg">Selisih Midtrans vs internal</span>
                  <span className="font-mono text-brand-400">Rp 0</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 rounded-lg border border-rule px-3 py-2 text-xs text-fg hover:border-brand-400/60">
                    Unduh laporan (PDF)
                  </button>
                  <button className="flex-1 rounded-lg border border-rule px-3 py-2 text-xs text-fg hover:border-brand-400/60">
                    Ekspor CSV
                  </button>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Quick links</h2>
                <ul className="mt-3 flex flex-col gap-1 text-sm">
                  <QuickLink href="/admin/payout" label="Antrian payout" badge="12" />
                  <QuickLink href="https://dashboard.midtrans.com" label="Dashboard Midtrans" external />
                  <QuickLink href="/admin/webhook" label="Log webhook Midtrans" />
                  <QuickLink href="/admin/audit" label="Audit transaksi finansial" />
                </ul>
              </div>
            </Card>
          </aside>
        </div>

        {/* Ledger */}
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold text-fg">Ledger terakhir</h2>
            <Link href="/admin/audit" className="text-xs text-brand-400 hover:underline">
              Semua entri →
            </Link>
          </div>
          <Card>
            {ledger.map((l, i) => (
              <div
                key={l.id}
                className={
                  "flex items-center justify-between gap-4 px-5 py-3 text-sm " +
                  (i < ledger.length - 1 ? "border-b border-rule/60" : "")
                }
              >
                <span className="w-24 shrink-0 font-mono text-xs text-fg-subtle">{l.id}</span>
                <span className="w-32 shrink-0 text-xs text-fg-muted">{l.date}</span>
                <span className="flex-1 truncate text-fg">{l.label}</span>
                <span
                  className={
                    "font-mono font-medium " +
                    (l.kind === "in" ? "text-brand-400" : "text-flame-400")
                  }
                >
                  {l.amount}
                </span>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </AdminShell>
  );
}

function BigTile({ label, value, delta, sub, accent }: { label: string; value: string; delta?: string; sub?: string; accent?: "down" }) {
  return (
    <Card>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{label}</p>
        <p className={"mt-3 text-3xl font-bold " + (accent === "down" ? "text-flame-400" : "text-fg")}>
          {value}
        </p>
        {delta && <p className="mt-1 text-xs font-semibold text-brand-400">{delta} vs periode sebelumnya</p>}
        {sub && <p className="mt-1 text-xs text-fg-muted">{sub}</p>}
      </div>
    </Card>
  );
}

function QuickLink({ href, label, badge, external }: { href: string; label: string; badge?: string; external?: boolean }) {
  return (
    <li>
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        className="flex items-center justify-between rounded-lg px-3 py-2 text-fg-muted transition-colors hover:bg-panel hover:text-fg"
      >
        <span>
          {label} {external && <span className="text-xs text-fg-subtle">↗</span>}
        </span>
        {badge && <Badge tone="crim" size="xs">{badge}</Badge>}
      </Link>
    </li>
  );
}
