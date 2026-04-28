import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Avatar, Badge, Button, Card } from "@hoobiq/ui";

export const metadata = { title: "Detail dispute · Admin Hoobiq", robots: { index: false } };

const timeline = [
  { actor: "@nendohunt", role: "buyer",  body: "Halo admin, figure yang saya beli sampai dengan kotak penyok dan box figure peyang. Foto terlampir. Saya minta refund penuh.", when: "25 Apr · 14:30" },
  { actor: "@sellerX",    role: "seller", body: "Saya packing pakai double box dan bubble wrap tebal. Foto packing sebelum kirim juga terlampir. Kemungkinan rusak di kurir.", when: "25 Apr · 16:12" },
  { actor: "@nendohunt",  role: "buyer",  body: "Video unboxing utuh dari saat nerima paket. Bisa dicek dari kurir atau seller salah packing.", when: "25 Apr · 18:02" },
];

export default async function AdminDisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminShell active="Dispute">
      <div className="px-8 py-8">
        <nav className="mb-6 text-xs text-fg-subtle">
          <Link href="/admin-panel/dispute" className="hover:text-fg">Dispute</Link>
          <span className="mx-2">/</span>
          <span>#{id}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="crim" size="sm">Baru · High priority</Badge>
              <span className="font-mono text-xs text-fg-subtle">
                Dispute #{id} · tx HBQ-2026-04845120
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-fg">
              Nendoroid Ganyu — klaim rusak saat sampai
            </h1>
            <p className="mt-2 text-sm text-fg-muted">
              @nendohunt vs @sellerX · nominal Rp 1.450.000 · dibuka 2 jam lalu
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Timeline & decision */}
          <section className="flex flex-col gap-6">
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-fg">Kronologi</h2>
                <ul className="mt-5 space-y-5">
                  {timeline.map((t, i) => (
                    <li key={i} className="flex gap-4">
                      <Avatar letter={t.actor[1]} size="sm" />
                      <div className="flex-1">
                        <p className="text-sm">
                          <b className="text-fg">{t.actor}</b>{" "}
                          <Badge tone="ghost" size="xs">{t.role}</Badge>{" "}
                          <span className="text-xs text-fg-subtle">· {t.when}</span>
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-fg-muted">{t.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-fg">Bukti</h2>
                <p className="mt-1 text-sm text-fg-muted">
                  3 foto dari buyer, 2 foto packing dari seller, 1 video unboxing (1:42).
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="aspect-square overflow-hidden rounded-lg bg-panel-2">
                      <div className="h-full w-full bg-gradient-to-br from-brand-400/20 via-ultra-400/15 to-flame-400/20" />
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-fg">Keputusan admin</h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Keputusan akan dicatat di audit log dan tidak bisa dibatalkan. Kedua pihak akan diberi notifikasi.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <DecisionCard
                    tone="ok"
                    title="Refund penuh ke buyer"
                    body="Rp 1.450.000 + ongkir dikembalikan. Seller menanggung 100% kerugian + 1 strike."
                  />
                  <DecisionCard
                    tone="partial"
                    title="Refund sebagian"
                    body="Refund persentase disepakati (default 50%). Dipakai kalau ada kontribusi dua pihak."
                  />
                  <DecisionCard
                    tone="seller"
                    title="Lanjutkan ke seller"
                    body="Dana dilepas ke seller. Dipakai kalau bukti buyer tidak memadai."
                  />
                  <DecisionCard
                    tone="escalate"
                    title="Escalate ke Trust Senior"
                    body="Kasus kompleks di atas Rp 5 juta atau butuh tinjauan hukum."
                  />
                </div>

                <div className="mt-5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                    Catatan keputusan (wajib)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ringkasan bukti dan alasan keputusan — masuk ke audit log."
                    className="mt-2 w-full rounded-lg border border-rule bg-canvas px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400/60 focus:outline-none"
                  />
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <Button variant="outline" size="md">Simpan draft</Button>
                  <Button variant="primary" size="md">Finalisasi keputusan</Button>
                </div>
              </div>
            </Card>
          </section>

          <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Transaksi</h3>
                <dl className="mt-4 flex flex-col gap-3 text-sm">
                  <Kv k="ID" v={<span className="font-mono text-xs">HBQ-2026-04845120</span>} />
                  <Kv k="Nominal" v="Rp 1.450.000" />
                  <Kv k="Metode" v="BCA VA" />
                  <Kv k="Kurir" v="SiCepat REG" />
                  <Kv k="Status dana" v={<Badge tone="mint" size="xs">Di escrow</Badge>} />
                </dl>
                <Link href="/pesanan/HBQ-2026-04845120" className="mt-4 inline-block text-xs text-brand-400 hover:underline">
                  Buka halaman pesanan →
                </Link>
              </div>
            </Card>

            <Card>
              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Pihak terlibat</h3>
                <div className="mt-4 space-y-4 text-sm">
                  <Party user="nendohunt" role="Buyer" trust="4.7" />
                  <Party user="sellerX"    role="Seller" trust="3.2" flagged />
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}

function DecisionCard({ tone, title, body }: { tone: "ok" | "partial" | "seller" | "escalate"; title: string; body: string }) {
  const dot = {
    ok: "bg-brand-400",
    partial: "bg-ultra-400",
    seller: "bg-fg-subtle",
    escalate: "bg-flame-400",
  }[tone];
  return (
    <label className="group flex cursor-pointer items-start gap-3 rounded-xl border border-rule bg-canvas p-4 transition-colors hover:border-brand-400/50">
      <input type="radio" name="decision" className="mt-1 accent-brand-400" />
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-fg">
          <span className={"h-2 w-2 rounded-full " + dot} />
          {title}
        </p>
        <p className="mt-1 text-xs text-fg-muted">{body}</p>
      </div>
    </label>
  );
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fg-muted">{k}</dt>
      <dd className="text-fg">{v}</dd>
    </div>
  );
}

function Party({ user, role, trust, flagged }: { user: string; role: string; trust: string; flagged?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar letter={user[0]} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-fg">
          @{user}
          {flagged && <Badge tone="crim" size="xs" className="ml-1.5">Flagged</Badge>}
        </p>
        <p className="text-xs text-fg-subtle">
          {role} · Trust {trust}
        </p>
      </div>
      <Link href={`/admin/pengguna/${user}`} className="text-xs text-brand-400 hover:underline">
        Profil →
      </Link>
    </div>
  );
}
