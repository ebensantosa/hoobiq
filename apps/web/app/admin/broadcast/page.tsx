import { AdminShell } from "@/components/admin-shell";
import { Badge, Button, Card, Input, Label, Textarea } from "@hoobiq/ui";

export const metadata = { title: "Broadcast · Admin Hoobiq", robots: { index: false } };

const history = [
  { title: "Ketentuan Layanan diperbarui v1.4",        channels: "Email + In-app banner", sent: "1.420 penerima", when: "22 Apr 2026 10:00", opens: "78%" },
  { title: "Maintenance terjadwal 30 menit",            channels: "Push",                  sent: "1.284 penerima", when: "18 Apr 2026 22:00", opens: "54%" },
  { title: "Launch kategori HSR",                        channels: "Email",                 sent: "892 penerima",    when: "12 Apr 2026 09:00", opens: "61%" },
  { title: "Early Member claim — tinggal 258 slot",      channels: "In-app banner",         sent: "Semua non-member", when: "08 Apr 2026 08:00", opens: "—" },
];

export default function AdminBroadcastPage() {
  return (
    <AdminShell active="Broadcast">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Broadcast</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Kirim pengumuman ke pengguna via email, push, atau banner in-app. Perubahan material (Terms/Privasi) wajib 14 hari sebelum berlaku.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          {/* Composer */}
          <section>
            <h2 className="text-xl font-semibold text-fg">Kirim pesan baru</h2>
            <Card className="mt-4">
              <form className="flex flex-col gap-5 p-6">
                <Field label="Judul">
                  <Input placeholder="Pengumuman singkat (maks 80 karakter)" maxLength={80} />
                </Field>

                <Field label="Isi pesan" hint="Markdown didukung. Akan dirender konsisten di email dan in-app.">
                  <Textarea rows={6} placeholder="Tulis pengumuman untuk kolektor…" />
                </Field>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Target penerima">
                    <select className="h-11 w-full rounded-xl border border-rule bg-panel px-3 text-sm text-fg">
                      <option>Semua pengguna aktif (1.284)</option>
                      <option>Seller terverifikasi (412)</option>
                      <option>Pembeli 30 hari terakhir (892)</option>
                      <option>Kategori: Pokémon (618)</option>
                      <option>Kota: Jakarta (284)</option>
                    </select>
                  </Field>
                  <Field label="Jadwal kirim">
                    <Input type="datetime-local" defaultValue="2026-04-26T10:00" />
                  </Field>
                </div>

                <div>
                  <Label>Channel</Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ChannelChip label="Email"            defaultChecked />
                    <ChannelChip label="Push notification" defaultChecked />
                    <ChannelChip label="In-app banner" />
                    <ChannelChip label="SMS" locked />
                  </div>
                </div>

                <Card className="border-brand-400/30 bg-brand-400/5">
                  <div className="flex items-start gap-3 p-4 text-xs text-fg-muted">
                    <span className="mt-0.5 text-brand-400">◆</span>
                    <p>
                      Broadcast marketing hanya dikirim ke pengguna yang mengaktifkan preferensi newsletter / pengumuman fitur di{" "}
                      <b className="text-fg">Pengaturan → Notifikasi</b>. Broadcast transaksional selalu diterima.
                    </p>
                  </div>
                </Card>

                <div className="flex justify-end gap-3 border-t border-rule pt-5">
                  <Button variant="ghost" size="md">Simpan draft</Button>
                  <Button variant="outline" size="md">Kirim tes ke email saya</Button>
                  <Button variant="primary" size="md">Kirim / Jadwalkan</Button>
                </div>
              </form>
            </Card>
          </section>

          {/* Preview */}
          <aside>
            <h2 className="text-xl font-semibold text-fg">Preview</h2>
            <Card className="mt-4 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-rule bg-panel/60 px-4 py-2 text-xs text-fg-muted">
                <span className="h-2 w-2 rounded-full bg-flame-400" />
                <span className="h-2 w-2 rounded-full bg-brand-400" />
                <span className="h-2 w-2 rounded-full bg-ultra-400" />
                <span className="ml-2 font-mono text-[10px]">Preview · email</span>
              </div>
              <div className="p-6">
                <p className="text-xs text-fg-subtle">Dari: Hoobiq &lt;noreply@hoobiq.id&gt;</p>
                <p className="mt-1 text-xs text-fg-subtle">Untuk: kamu@hoobiq.id</p>
                <h3 className="mt-4 text-lg font-bold text-fg">Judul pengumuman kamu</h3>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                  Isi pesan akan muncul di sini. Pratinjau update secara live saat kamu
                  mengetik di composer.
                </p>
                <div className="mt-5 inline-flex items-center rounded-lg bg-brand-400 px-4 py-2 text-xs font-semibold text-white">
                  Lihat detail
                </div>
                <p className="mt-8 text-[10px] text-fg-subtle">
                  Kamu menerima email ini karena terdaftar di Hoobiq. Atur preferensi di Pengaturan → Notifikasi.
                </p>
              </div>
            </Card>
          </aside>
        </div>

        {/* History */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-fg">Riwayat broadcast</h2>
          <Card className="mt-4">
            <div className="grid grid-cols-[2fr_1fr_1fr_140px_80px] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <span>Judul</span>
              <span>Channel</span>
              <span>Penerima</span>
              <span>Terkirim</span>
              <span className="text-right">Opens</span>
            </div>
            {history.map((h, i) => (
              <div
                key={i}
                className={
                  "grid grid-cols-[2fr_1fr_1fr_140px_80px] items-center gap-4 px-5 py-3 text-sm " +
                  (i < history.length - 1 ? "border-b border-rule/60" : "")
                }
              >
                <span className="truncate text-fg">{h.title}</span>
                <span className="text-xs text-fg-muted">{h.channels}</span>
                <span className="text-xs text-fg-muted">{h.sent}</span>
                <span className="text-xs text-fg-muted">{h.when}</span>
                <span className="text-right font-mono text-xs text-fg">{h.opens}</span>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </AdminShell>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

function ChannelChip({ label, defaultChecked, locked }: { label: string; defaultChecked?: boolean; locked?: boolean }) {
  return (
    <label
      className={
        "inline-flex cursor-pointer select-none items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors " +
        (locked ? "cursor-not-allowed opacity-50" : "")
      }
    >
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        disabled={locked}
        className="peer h-3.5 w-3.5 accent-brand-400"
      />
      <span className="text-fg-muted peer-checked:text-fg">{label}</span>
      {locked && <Badge tone="ghost" size="xs">Soon</Badge>}
    </label>
  );
}
