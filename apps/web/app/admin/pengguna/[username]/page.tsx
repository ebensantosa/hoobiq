import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Avatar, Badge, Button, Card } from "@hoobiq/ui";

export const metadata = { title: "Detail pengguna · Admin Hoobiq", robots: { index: false } };

const actions = [
  { by: "Rina A.", what: "Menyetujui verifikasi KTP", when: "12 Mei 2025 14:22" },
  { by: "Budi P.", what: "Menandai listing #1204 perlu review (foto buram)", when: "18 Mei 2025 09:10" },
  { by: "System",  what: "Trust Score naik 4.7 → 4.9", when: "02 Sep 2025" },
  { by: "Rina A.", what: "Membalas tiket bantuan #8821", when: "14 Mar 2026" },
];

export default function AdminUserDetailPage({ params }: { params: { username: string } }) {
  const u = {
    username: params.username,
    name: "Aditya Kurniawan",
    email: "aditya@gmail.com",
    phone: "+62 812-3456-7890",
    city: "Jakarta Selatan",
    joined: "12 Mei 2025",
    ktp: "verified",
    role: "verified" as const,
    ip: "180.244.120.42",
    device: "MacBook Pro · Chrome 126",
  };

  return (
    <AdminShell active="Pengguna">
      <div className="px-8 py-8">
        <nav className="mb-6 text-xs text-fg-subtle">
          <Link href="/admin/pengguna" className="hover:text-fg">Pengguna</Link>
          <span className="mx-2">/</span>
          <span>@{u.username}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-6">
          <div className="flex items-start gap-4">
            <Avatar letter={u.username[0]} size="xl" ring />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-fg">{u.name}</h1>
                <Badge tone="mint" size="sm">Aktif</Badge>
                <Badge tone="ghost" size="sm">Verified Seller</Badge>
              </div>
              <p className="mt-1 text-sm text-fg-muted">
                @{u.username} · gabung {u.joined} · {u.city}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Kirim pesan admin</Button>
            <Button variant="outline" size="sm">Reset password paksa</Button>
            <button className="inline-flex h-9 items-center rounded-lg border border-crim-400/50 bg-crim-400/10 px-3 text-sm font-medium text-crim-400 hover:bg-crim-400/20">
              Suspend akun
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <aside className="flex flex-col gap-5">
            <Card>
              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  Identitas
                </h3>
                <dl className="mt-4 flex flex-col gap-3 text-sm">
                  <Kv k="Email" v={u.email} />
                  <Kv k="Telepon" v={u.phone} />
                  <Kv k="Alamat terdaftar" v="Jl. Kemang Raya No. 42B, Jakarta Selatan" />
                  <Kv k="Verifikasi KTP" v={<Badge tone="mint" size="xs">Terverifikasi</Badge>} />
                </dl>
              </div>
            </Card>

            <Card>
              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  Risk signals
                </h3>
                <dl className="mt-4 flex flex-col gap-3 text-sm">
                  <Kv k="Trust Score" v={<span className="font-mono text-fg">4.9 / 5</span>} />
                  <Kv k="Dispute rate" v={<span className="font-mono text-brand-400">0.7%</span>} />
                  <Kv k="Chargeback rate" v={<span className="font-mono text-brand-400">0.0%</span>} />
                  <Kv k="Multi-akun detected" v={<Badge tone="mint" size="xs">Tidak</Badge>} />
                  <Kv k="Last IP" v={<span className="font-mono text-xs text-fg-muted">{u.ip}</span>} />
                  <Kv k="Last device" v={<span className="text-xs text-fg-muted">{u.device}</span>} />
                </dl>
              </div>
            </Card>

            <Card>
              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  Statistik
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <Mini label="Listing aktif" value="12" />
                  <Mini label="Trade selesai" value="142" />
                  <Mini label="Rating rata-rata" value="4.9★" />
                  <Mini label="GMV seumur hidup" value="Rp 218jt" />
                </div>
              </div>
            </Card>
          </aside>

          <section>
            <h2 className="text-xl font-semibold text-fg">Riwayat tindakan admin</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Semua aksi admin terhadap akun ini. Tidak bisa dihapus.
            </p>
            <Card className="mt-4">
              {actions.map((a, i) => (
                <div
                  key={i}
                  className={
                    "flex items-start gap-3 px-5 py-4 " +
                    (i < actions.length - 1 ? "border-b border-rule/60" : "")
                  }
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  <div className="flex-1">
                    <p className="text-sm text-fg">
                      <b>{a.by}</b>{" "}
                      <span className="text-fg-muted">· {a.what}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-fg-subtle">{a.when}</p>
                  </div>
                </div>
              ))}
            </Card>

            <h2 className="mt-8 text-xl font-semibold text-fg">Catatan internal</h2>
            <Card className="mt-4">
              <div className="p-5">
                <textarea
                  rows={4}
                  placeholder="Catatan hanya terlihat oleh admin. Contoh: konteks verifikasi, korespondensi via email support, dll."
                  className="w-full rounded-lg border border-rule bg-canvas px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400/60 focus:outline-none"
                />
                <div className="mt-3 flex justify-end">
                  <Button variant="primary" size="sm">Simpan catatan</Button>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </AdminShell>
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-fg-subtle">{label}</p>
      <p className="mt-0.5 font-semibold text-fg">{value}</p>
    </div>
  );
}
