import Link from "next/link";
import { Logo } from "@hoobiq/ui";
import { ThemeToggle } from "@/components/theme-toggle";

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-brand-soft opacity-40" />
      <header className="relative flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" aria-label="Hoobiq">
          <Logo size="sm" />
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">
          404 · Halaman tidak ditemukan
        </p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight text-fg md:text-7xl">
          Hilang di rak.
        </h1>
        <p className="mt-6 max-w-md text-base text-fg-muted">
          Halaman yang kamu cari mungkin sudah dipindahkan, terhapus, atau tidak pernah
          ada. Coba cari lewat marketplace atau balik ke beranda.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-400 px-6 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Kembali ke beranda
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-rule px-6 text-sm font-medium text-fg hover:border-brand-400/60"
          >
            Jelajahi marketplace
          </Link>
        </div>
        <p className="mt-8 text-xs text-fg-subtle">
          Masih bingung?{" "}
          <Link href="/bantuan" className="text-brand-400 hover:underline">
            Pusat Bantuan
          </Link>
        </p>
      </main>
    </div>
  );
}
