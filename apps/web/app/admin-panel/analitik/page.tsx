import { AdminShell } from "@/components/admin-shell";
import { Card, TextTabs } from "@hoobiq/ui";

export const metadata = { title: "Analitik · Admin Hoobiq", robots: { index: false } };

const kpi = [
  { label: "DAU",              value: "412", delta: "+8.4%" },
  { label: "WAU",              value: "1.284", delta: "+12.1%" },
  { label: "MAU",              value: "3.248", delta: "+22.8%" },
  { label: "Session median",   value: "4m 12s", delta: "+14s" },
];

const funnel = [
  { stage: "Landing visit",      count: 14_820, pct: 100 },
  { stage: "Lihat listing",      count: 9_420,  pct: 63.6 },
  { stage: "Buka detail listing",count: 3_182,  pct: 21.5 },
  { stage: "Mulai checkout",     count: 842,    pct: 5.7 },
  { stage: "Pembayaran sukses",  count: 612,    pct: 4.1 },
];

const topCats = [
  { name: "Pokémon",     listings: 2140, gmv: "Rp 4.2 M"  },
  { name: "Genshin",     listings: 284,  gmv: "Rp 840 jt" },
  { name: "Labubu",      listings: 248,  gmv: "Rp 620 jt" },
  { name: "One Piece",   listings: 642,  gmv: "Rp 580 jt" },
  { name: "Nendoroid",   listings: 412,  gmv: "Rp 490 jt" },
];

const topSellers = [
  { name: "@adityacollects", trade: 142, gmv: "Rp 218 jt", rating: "4.9" },
  { name: "@figurehunt",     trade: 98,  gmv: "Rp 142 jt", rating: "4.9" },
  { name: "@komikpop",       trade: 112, gmv: "Rp 89 jt",  rating: "4.8" },
  { name: "@pokemonid",      trade: 74,  gmv: "Rp 78 jt",  rating: "5.0" },
  { name: "@blindboxid",     trade: 88,  gmv: "Rp 64 jt",  rating: "4.7" },
];

const cities = [
  { city: "Jakarta",    users: 512, pct: 40 },
  { city: "Bandung",    users: 218, pct: 17 },
  { city: "Surabaya",   users: 184, pct: 14 },
  { city: "Yogyakarta", users: 126, pct: 10 },
  { city: "Medan",      users:  82, pct:  6 },
  { city: "Lainnya",    users: 162, pct: 13 },
];

export default function AdminAnalitikPage() {
  return (
    <AdminShell active="Analitik">
      <div className="px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
          <div>
            <h1 className="text-3xl font-bold text-fg">Analitik</h1>
            <p className="mt-2 text-sm text-fg-muted">
              Growth, funnel, geografi, dan leaderboard. Data agregat — tidak terkait identitas individu.
            </p>
          </div>
          <TextTabs options={["30 hari", "7 hari", "24 jam"]} />
        </div>

        {/* Growth KPIs */}
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {kpi.map((k) => (
            <Card key={k.label}>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{k.label}</p>
                <p className="mt-3 text-3xl font-bold text-fg">{k.value}</p>
                <p className="mt-1 text-xs font-semibold text-brand-400">{k.delta} vs periode sebelumnya</p>
                <Sparkline />
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          {/* Funnel */}
          <section>
            <h2 className="text-xl font-semibold text-fg">Funnel konversi</h2>
            <p className="mt-1 text-sm text-fg-muted">Dari landing ke pembayaran sukses.</p>
            <Card className="mt-4">
              <div className="flex flex-col gap-3 p-6">
                {funnel.map((f) => (
                  <div key={f.stage}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-fg">{f.stage}</span>
                      <span className="font-mono text-xs text-fg-muted">
                        {f.count.toLocaleString("id-ID")} · {f.pct}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel-2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-400 via-ultra-400 to-flame-400"
                        style={{ width: `${f.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <h2 className="mt-10 text-xl font-semibold text-fg">Top kategori</h2>
            <Card className="mt-4">
              <div className="grid grid-cols-[1fr_100px_120px] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                <span>Kategori</span>
                <span className="text-right">Listing</span>
                <span className="text-right">GMV</span>
              </div>
              {topCats.map((c, i) => (
                <div
                  key={c.name}
                  className={
                    "grid grid-cols-[1fr_100px_120px] items-center gap-4 px-5 py-3 text-sm " +
                    (i < topCats.length - 1 ? "border-b border-rule/60" : "")
                  }
                >
                  <span className="text-fg">{c.name}</span>
                  <span className="text-right font-mono text-fg-muted">{c.listings}</span>
                  <span className="text-right font-mono font-medium text-fg">{c.gmv}</span>
                </div>
              ))}
            </Card>
          </section>

          {/* Geo + Top sellers */}
          <aside className="flex flex-col gap-8">
            <section>
              <h2 className="text-xl font-semibold text-fg">Distribusi kota</h2>
              <Card className="mt-4">
                <div className="flex flex-col gap-3 p-6">
                  {cities.map((c) => (
                    <div key={c.city}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-fg">{c.city}</span>
                        <span className="font-mono text-xs text-fg-muted">{c.users}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel-2">
                        <div className="h-full bg-brand-400" style={{ width: `${c.pct * 2}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-fg">Top seller (GMV)</h2>
              <Card className="mt-4">
                {topSellers.map((s, i) => (
                  <div
                    key={s.name}
                    className={
                      "flex items-center justify-between gap-3 px-5 py-3 text-sm " +
                      (i < topSellers.length - 1 ? "border-b border-rule/60" : "")
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-400/15 text-xs font-bold text-brand-400">
                        {i + 1}
                      </span>
                      <span className="truncate text-fg">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-xs">
                      <span className="text-fg-subtle">{s.trade} trade</span>
                      <span className="text-fg-muted">★ {s.rating}</span>
                      <span className="font-mono font-medium text-fg">{s.gmv}</span>
                    </div>
                  </div>
                ))}
              </Card>
            </section>
          </aside>
        </div>

        <Card className="mt-10 border-brand-400/30 bg-brand-400/5">
          <div className="flex items-center justify-between p-5 text-sm">
            <div>
              <p className="font-medium text-fg">Butuh analisis custom?</p>
              <p className="mt-1 text-xs text-fg-muted">
                Tim data bisa bantu untuk query spesifik (cohort, retention, LTV). Lead time 1–3 hari kerja.
              </p>
            </div>
            <a href="mailto:data@hoobiq.id" className="text-sm font-medium text-brand-400 hover:underline">
              data@hoobiq.id →
            </a>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}

function Sparkline() {
  return (
    <div className="mt-4 h-8 overflow-hidden rounded bg-gradient-to-r from-brand-400/5 via-ultra-400/10 to-flame-400/15">
      <svg viewBox="0 0 120 30" className="h-full w-full" preserveAspectRatio="none">
        <path
          d="M0 22 L15 19 L30 20 L45 14 L60 16 L75 10 L90 12 L105 6 L120 8"
          fill="none"
          stroke="#E91E63"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
