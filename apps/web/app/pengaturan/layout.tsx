import Link from "next/link";
import { AppShell } from "@/components/app-shell";

const sections = [
  { href: "/pengaturan", label: "Profil" },
  { href: "/pengaturan/alamat", label: "Alamat pengiriman" },
  { href: "/pengaturan/rekening", label: "Rekening payout" },
  { href: "/pengaturan/keamanan", label: "Keamanan" },
  { href: "/pengaturan/notifikasi", label: "Notifikasi" },
  { href: "/pengaturan/kategori-baru", label: "Request kategori" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell active="Feeds">
      <div className="px-6 pb-8 lg:px-10">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Pengaturan</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Kelola akun, pembayaran, keamanan, dan preferensi notifikasi.
          </p>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav className="flex flex-col gap-1">
              {sections.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-panel hover:text-fg"
                >
                  {s.label}
                </Link>
              ))}
            </nav>
          </aside>
          <div className="max-w-2xl">{children}</div>
        </div>
      </div>
    </AppShell>
  );
}
