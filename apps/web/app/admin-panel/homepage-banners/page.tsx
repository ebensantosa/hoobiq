import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { serverApi } from "@/lib/server/api";
import { BannersManager, type BannerRow } from "./manager";

export const metadata = { title: "Hero banner · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function HomepageBannersPage() {
  const data = await serverApi<{ items: BannerRow[] }>("/banners/admin");
  const items = data?.items ?? [];

  return (
    <AdminShell active="Hero banner">
      <div className="px-8 py-8">
        <div className="flex items-end justify-between gap-4 border-b border-rule pb-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
              Homepage management
            </p>
            <h1 className="mt-1 text-2xl font-bold text-fg">Hero banner</h1>
            <p className="mt-2 max-w-2xl text-sm text-fg-muted">
              Slider yang muncul di paling atas halaman home buyer logged-in.
              Tiap banner punya kicker (chip kecil), judul besar, subtitle, gambar
              hero, dan satu tombol CTA. Banner aktif di-rotate otomatis tiap 6
              detik. Atur urutan via field <b>Sort order</b> (kecil ke besar).
            </p>
          </div>
          <Link
            href="/"
            target="_blank"
            className="hidden rounded-lg border border-rule bg-panel px-3 py-2 text-xs font-semibold text-fg-muted hover:border-brand-400/60 hover:text-fg lg:inline-block"
          >
            Lihat di home →
          </Link>
        </div>

        <BannersManager initial={items} />
      </div>
    </AdminShell>
  );
}
