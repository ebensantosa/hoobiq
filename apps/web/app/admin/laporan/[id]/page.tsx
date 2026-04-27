import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Avatar, Badge, Button, Card } from "@hoobiq/ui";

export const metadata = { title: "Detail laporan · Admin Hoobiq", robots: { index: false } };

const reporters = [
  { user: "buyer_jkt",   when: "3 jam lalu",  body: "Seller maksa transfer langsung ke rekening pribadi, nolak bayar via Hoobiq Pay." },
  { user: "cardtrader9", when: "3 jam lalu",  body: "Dikasih resi palsu, cek di JNE tidak valid." },
  { user: "tcgstash",    when: "5 jam lalu",  body: "Foto listing ambil dari akun lain (reverse image search ketemu di Shopee)." },
  { user: "nendolover",  when: "8 jam lalu",  body: "Chat minta transfer dulu, bilang 'biar murah tanpa fee'." },
];

export default function AdminReportDetailPage({ params }: { params: { id: string } }) {
  return (
    <AdminShell active="Laporan & abuse">
      <div className="px-8 py-8">
        <nav className="mb-6 text-xs text-fg-subtle">
          <Link href="/admin/laporan" className="hover:text-fg">Laporan</Link>
          <span className="mx-2">/</span>
          <span>#{params.id}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="crim" size="sm">Terbuka · High severity</Badge>
              <span className="font-mono text-xs text-fg-subtle">Laporan #{params.id}</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-fg">
              Target: <span className="text-brand-400">@spamseller88</span>
            </h1>
            <p className="mt-2 text-sm text-fg-muted">
              4 laporan masuk dalam 3 jam terakhir. Akun baru (dibuat 2 hari lalu), 2 listing aktif.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-flame-400/50 bg-flame-400/10 px-3 py-2 text-sm font-semibold text-flame-400 hover:bg-flame-400/20">
              Suspend akun
            </button>
            <Button variant="outline" size="sm">Hapus semua listing</Button>
            <Button variant="ghost" size="sm">Tandai aman</Button>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <h2 className="text-xl font-semibold text-fg">Laporan pengguna</h2>
            <Card className="mt-4">
              {reporters.map((r, i) => (
                <div
                  key={i}
                  className={
                    "flex items-start gap-3 p-5 " +
                    (i < reporters.length - 1 ? "border-b border-rule/60" : "")
                  }
                >
                  <Avatar letter={r.user[0]} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm">
                      <b className="text-fg">@{r.user}</b>{" "}
                      <span className="text-xs text-fg-subtle">· {r.when}</span>
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-fg-muted">{r.body}</p>
                  </div>
                </div>
              ))}
            </Card>

            <h2 className="mt-8 text-xl font-semibold text-fg">Keputusan & catatan</h2>
            <Card className="mt-4">
              <div className="p-6">
                <div className="grid gap-3 md:grid-cols-2">
                  <Decision title="Suspend permanen" body="Bukti penipuan jelas, tidak perlu pembelaan." tone="high" />
                  <Decision title="Suspend 30 hari + verifikasi KTP" body="Berikan kesempatan klarifikasi setelah verifikasi." tone="mid" />
                  <Decision title="Shadowban + hapus listing" body="Listing dihapus, akun masih bisa browsing tapi tidak bisa post." tone="mid" />
                  <Decision title="Tandai aman / false positive" body="Laporan tidak terbukti, akun lanjut normal." tone="low" />
                </div>
                <div className="mt-5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                    Catatan keputusan (wajib)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ringkasan bukti dan alasan keputusan. Masuk ke audit log."
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

          <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Profil target</h3>
                <div className="mt-4 flex items-center gap-3">
                  <Avatar letter="S" size="lg" ring />
                  <div>
                    <p className="font-medium text-fg">@spamseller88</p>
                    <p className="text-xs text-fg-muted">Daftar 23 Apr 2026</p>
                  </div>
                </div>
                <dl className="mt-5 flex flex-col gap-3 text-sm">
                  <Kv k="KTP verified" v={<Badge tone="crim" size="xs">Tidak</Badge>} />
                  <Kv k="Trust Score"   v={<span className="font-mono text-flame-400">1.8</span>} />
                  <Kv k="Dispute kalah" v={<span className="font-mono text-flame-400">2 / 2</span>} />
                  <Kv k="Multi-akun"    v={<span className="font-mono text-flame-400">3 IP sama</span>} />
                  <Kv k="Umur akun"     v="2 hari" />
                </dl>
                <Link href="/admin/pengguna/spamseller88" className="mt-4 inline-block text-xs text-brand-400 hover:underline">
                  Buka profil lengkap →
                </Link>
              </div>
            </Card>

            <Card>
              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Listing terkait</h3>
                <ul className="mt-4 space-y-3 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="truncate text-fg">Pikachu Illustrator ASLI (Rp 150rb)</span>
                    <Badge tone="crim" size="xs">Review</Badge>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="truncate text-fg">Charizard Base Set Holo (Rp 500rb)</span>
                    <Badge tone="crim" size="xs">Review</Badge>
                  </li>
                </ul>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}

function Decision({ title, body, tone }: { title: string; body: string; tone: "high" | "mid" | "low" }) {
  const dot = tone === "high" ? "bg-flame-400" : tone === "mid" ? "bg-brand-400" : "bg-fg-subtle";
  return (
    <label className="group flex cursor-pointer items-start gap-3 rounded-xl border border-rule bg-canvas p-4 transition-colors hover:border-brand-400/50">
      <input type="radio" name="report-decision" className="mt-1 accent-brand-400" />
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
