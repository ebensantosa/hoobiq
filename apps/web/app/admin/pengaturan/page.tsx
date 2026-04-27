import { AdminShell } from "@/components/admin-shell";
import { Badge, Button, Card, Input, Label } from "@hoobiq/ui";

export const metadata = { title: "Pengaturan platform · Admin Hoobiq", robots: { index: false } };

export default function AdminSettingsPage() {
  return (
    <AdminShell active="Pengaturan">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Pengaturan platform</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Parameter global yang mempengaruhi seluruh pengguna Hoobiq. Perubahan terbit
            dalam 30 detik dan dicatat di audit log.
          </p>
        </div>

        <div className="mt-8 flex max-w-3xl flex-col gap-10">
          {/* Fees */}
          <section>
            <h2 className="text-xl font-semibold text-fg">Biaya platform</h2>
            <p className="mt-1 text-sm text-fg-muted">Berlaku untuk transaksi baru; tidak retroaktif.</p>
            <Card className="mt-4">
              <div className="grid gap-5 p-6 md:grid-cols-2">
                <Field label="Fee platform (%)">
                  <Input defaultValue="2" />
                </Field>
                <Field label="Fee Hoobiq Pay (%)">
                  <Input defaultValue="1" />
                </Field>
                <Field label="Minimum transaksi wajib escrow (Rp)">
                  <Input defaultValue="100000" />
                </Field>
                <Field label="Biaya boost listing / 7 hari (Rp)">
                  <Input defaultValue="15000" />
                </Field>
              </div>
            </Card>
          </section>

          {/* Escrow timing */}
          <section>
            <h2 className="text-xl font-semibold text-fg">Escrow & auto-release</h2>
            <Card className="mt-4">
              <div className="grid gap-5 p-6 md:grid-cols-2">
                <Field label="Auto-release setelah delivered (hari)">
                  <Input defaultValue="7" />
                </Field>
                <Field label="Window dispute post-delivery (jam)">
                  <Input defaultValue="72" />
                </Field>
                <Field label="Seller wajib kirim dalam (jam kerja)">
                  <Input defaultValue="48" />
                </Field>
                <Field label="Payout ke bank (hari kerja)">
                  <Input defaultValue="1" />
                </Field>
              </div>
            </Card>
          </section>

          {/* Verification thresholds */}
          <section>
            <h2 className="text-xl font-semibold text-fg">Ambang verifikasi</h2>
            <Card className="mt-4">
              <div className="grid gap-5 p-6 md:grid-cols-2">
                <Field label="Verifikasi KTP untuk listing di atas (Rp)">
                  <Input defaultValue="2000000" />
                </Field>
                <Field label="Verifikasi untuk payout kumulatif / 30 hari (Rp)">
                  <Input defaultValue="10000000" />
                </Field>
                <Field label="Batas Trust Score minimum (auto-restrict)">
                  <Input defaultValue="3.5" />
                </Field>
                <Field label="Suspend otomatis setelah N dispute kalah">
                  <Input defaultValue="3" />
                </Field>
              </div>
            </Card>
          </section>

          {/* Feature flags */}
          <section>
            <h2 className="text-xl font-semibold text-fg">Feature flags</h2>
            <p className="mt-1 text-sm text-fg-muted">Nyalakan / matikan fitur tanpa deploy.</p>
            <Card className="mt-4">
              <FlagRow label="Registrasi terbuka"        desc="Kalau dimatikan, hanya invite-only." on />
              <FlagRow label="Boost listing"              desc="Memungkinkan seller boost berbayar." on />
              <FlagRow label="DM antar pengguna"          desc="Matikan kalau ada serangan spam besar." on />
              <FlagRow label="Google OAuth"               desc="Login dengan akun Google." on />
              <FlagRow label="Mode maintenance marketplace" desc="Checkout di-freeze, feed tetap jalan." />
              <FlagRow label="Leaderboard publik"         desc="Tampilkan top seller di halaman komunitas." />
            </Card>
          </section>

          {/* Team */}
          <section>
            <h2 className="text-xl font-semibold text-fg">Anggota tim admin</h2>
            <Card className="mt-4">
              <TeamRow name="Rina A." email="rina@hoobiq.id" role="Admin · Trust & Safety" status="active" />
              <TeamRow name="Budi P." email="budi@hoobiq.id" role="Admin · Ops"             status="active" />
              <TeamRow name="Tami K." email="tami@hoobiq.id" role="Admin · Support"          status="active" />
              <TeamRow name="Dika H." email="dika@hoobiq.id" role="Developer · Engineering"  status="invite" />
              <div className="p-4">
                <Button variant="outline" size="sm">+ Undang anggota</Button>
              </div>
            </Card>
          </section>

          <div className="flex justify-end gap-3 border-t border-rule pt-6">
            <Button variant="ghost" size="md">Batal</Button>
            <Button variant="primary" size="md">Simpan semua perubahan</Button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function FlagRow({ label, desc, on }: { label: string; desc: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-rule/60 px-5 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="mt-0.5 text-xs text-fg-muted">{desc}</p>
      </div>
      <label className="cursor-pointer">
        <input type="checkbox" defaultChecked={on} className="peer sr-only" />
        <span className="relative inline-block h-5 w-9 rounded-full bg-panel-2 transition-colors peer-checked:bg-brand-400 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
      </label>
    </div>
  );
}

function TeamRow({ name, email, role, status }: { name: string; email: string; role: string; status: "active" | "invite" }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-rule/60 px-5 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{name}</p>
        <p className="mt-0.5 text-xs text-fg-muted">{email} · {role}</p>
      </div>
      <div className="flex items-center gap-3">
        <Badge tone={status === "active" ? "mint" : "crim"} size="xs">
          {status === "active" ? "Aktif" : "Undangan pending"}
        </Badge>
        <button className="text-xs text-fg-muted hover:text-crim-400">Cabut akses</button>
      </div>
    </div>
  );
}
