import { Badge, Button, Card, Input, Label } from "@hoobiq/ui";

export const metadata = { title: "Keamanan · Pengaturan · Hoobiq" };

const sessions = [
  { device: "MacBook Pro · Chrome", location: "Jakarta, Indonesia", last: "Aktif sekarang", current: true },
  { device: "iPhone 15 · Safari", location: "Jakarta, Indonesia", last: "2 jam lalu" },
  { device: "Windows · Firefox", location: "Bandung, Indonesia", last: "3 hari lalu" },
];

export default function KeamananPage() {
  return (
    <section className="flex flex-col gap-10">
      {/* Password */}
      <div>
        <h2 className="text-xl font-semibold text-fg">Ubah password</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Password kuat = minimal 8 karakter, campur huruf besar-kecil + angka.
        </p>
        <form className="mt-5 flex flex-col gap-4">
          <Field label="Password lama"><Input type="password" /></Field>
          <Field label="Password baru"><Input type="password" /></Field>
          <Field label="Konfirmasi password baru"><Input type="password" /></Field>
          <div className="flex justify-end">
            <Button variant="primary" size="md">Simpan password</Button>
          </div>
        </form>
      </div>

      {/* 2FA */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-fg">Verifikasi 2 langkah (2FA)</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Kode tambahan lewat aplikasi authenticator saat login dari perangkat baru.
            </p>
          </div>
          <Badge tone="ghost" size="sm">Belum aktif</Badge>
        </div>
        <Card className="mt-4">
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="font-medium text-fg">Authenticator app</p>
              <p className="mt-1 text-xs text-fg-muted">Google Authenticator, Authy, 1Password, dll.</p>
            </div>
            <Button variant="outline" size="sm">Aktifkan</Button>
          </div>
        </Card>
      </div>

      {/* Sessions */}
      <div>
        <h2 className="text-xl font-semibold text-fg">Sesi aktif</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Kalau ada sesi mencurigakan, logout dari sana. Kalau ragu — tekan{" "}
          <b className="text-fg">Logout semua</b>.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {sessions.map((s, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-fg">
                    {s.device}
                    {s.current && <Badge tone="mint" size="xs">Perangkat ini</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {s.location} · {s.last}
                  </p>
                </div>
                {!s.current && (
                  <button className="text-xs text-crim-400 hover:underline">Logout</button>
                )}
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm">Logout dari semua perangkat</Button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-crim-400/30 bg-crim-400/5 p-5">
        <h2 className="text-lg font-semibold text-fg">Tutup akun</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Data profil dihapus permanen setelah 30 hari. Transaksi yang belum selesai wajib diselesaikan dulu.
        </p>
        <button className="mt-4 text-sm font-medium text-crim-400 hover:underline">
          Ajukan penutupan akun →
        </button>
      </div>
    </section>
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
