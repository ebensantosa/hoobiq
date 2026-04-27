import { Card } from "@hoobiq/ui";

export const metadata = { title: "Notifikasi · Pengaturan · Hoobiq" };

const groups = [
  {
    title: "Transaksi",
    note: "Nggak bisa dimatikan — penting untuk keamanan.",
    items: [
      { label: "Pembayaran berhasil", email: true, push: true, locked: true },
      { label: "Resi diperbarui", email: true, push: true, locked: true },
      { label: "Barang diterima / auto-release", email: true, push: true, locked: true },
      { label: "Dispute dibuka", email: true, push: true, locked: true },
    ],
  },
  {
    title: "Social",
    items: [
      { label: "Like & komentar di post kamu", email: false, push: true },
      { label: "Follower baru", email: false, push: false },
      { label: "Tag & mention", email: false, push: true },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { label: "Harga wishlist turun", email: true, push: true },
      { label: "Stok baru di kategori minat", email: false, push: true },
      { label: "Penawaran nego masuk", email: true, push: true },
    ],
  },
  {
    title: "Pemasaran",
    note: "Opt-in — default mati.",
    items: [
      { label: "Newsletter mingguan", email: false, push: false },
      { label: "Pengumuman fitur baru", email: false, push: false },
    ],
  },
];

export default function NotifikasiSettingsPage() {
  return (
    <section className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold text-fg">Preferensi notifikasi</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Atur channel kirim per jenis notifikasi. Push notification butuh izin browser.
        </p>
      </div>

      {groups.map((g) => (
        <div key={g.title}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">
            {g.title}
          </h3>
          {g.note && <p className="mt-1 text-xs text-fg-muted">{g.note}</p>}
          <Card className="mt-3">
            <div className="grid grid-cols-[1fr_70px_70px] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <span>Jenis</span>
              <span className="text-center">Email</span>
              <span className="text-center">Push</span>
            </div>
            {g.items.map((it, i) => (
              <div
                key={i}
                className={
                  "grid grid-cols-[1fr_70px_70px] items-center gap-4 px-5 py-3 text-sm " +
                  (i < g.items.length - 1 ? "border-b border-rule/60" : "")
                }
              >
                <span className="text-fg">{it.label}</span>
                <Toggle checked={it.email} disabled={"locked" in it ? it.locked : false} />
                <Toggle checked={it.push} disabled={"locked" in it ? it.locked : false} />
              </div>
            ))}
          </Card>
        </div>
      ))}
    </section>
  );
}

function Toggle({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <label className="mx-auto inline-flex cursor-pointer">
      <input type="checkbox" defaultChecked={checked} disabled={disabled} className="peer sr-only" />
      <span
        className={
          "relative h-5 w-9 rounded-full bg-panel-2 transition-colors peer-checked:bg-brand-400 peer-disabled:opacity-50 " +
          "after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"
        }
      />
    </label>
  );
}
