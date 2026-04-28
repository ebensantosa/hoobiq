import Link from "next/link";
import { Badge, Button, Card } from "@hoobiq/ui";
import { AppShell } from "@/components/app-shell";

export const metadata = { title: "Pembayaran berhasil · Hoobiq" };

export default function CheckoutSuccessPage() {
  return (
    <AppShell active="Marketplace" withSidebar={false}>
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-400/15 text-brand-400">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-fg md:text-4xl">Pembayaran berhasil.</h1>
          <p className="mt-3 max-w-md text-fg-muted">
            Dana kamu sekarang aman di Hoobiq Pay. Kami akan notifikasi saat seller
            mengirim barang.
          </p>
        </div>

        <Card className="mt-10">
          <div className="divide-y divide-rule">
            <div className="flex items-center justify-between p-5">
              <span className="text-sm text-fg-muted">Nomor pesanan</span>
              <span className="font-mono text-sm font-medium text-fg">HBQ-2026-04847291</span>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-sm text-fg-muted">Total dibayar</span>
              <span className="text-lg font-bold text-fg">Rp 4.325.500</span>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-sm text-fg-muted">Metode pembayaran</span>
              <span className="text-sm text-fg">BCA Virtual Account</span>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className="text-sm text-fg-muted">Status</span>
              <Badge tone="mint" size="sm">Pembayaran aman</Badge>
            </div>
          </div>
        </Card>

        <div className="mt-8 rounded-2xl border border-brand-400/30 bg-brand-400/5 p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-fg">
            <span className="text-brand-400">◆</span> Apa selanjutnya
          </p>
          <ol className="mt-3 space-y-2 text-sm text-fg-muted">
            <li>1. Seller wajib kirim dalam 2×24 jam hari kerja.</li>
            <li>2. Kamu dapat resi otomatis — bisa tracking dari halaman pesanan.</li>
            <li>3. Setelah barang sampai, klik "Konfirmasi diterima" atau auto-release 7 hari setelah <em>delivered</em>.</li>
          </ol>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/pesanan/HBQ-2026-04847291"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-brand-400 px-6 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Lihat detail pesanan
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-rule px-6 text-sm font-medium text-fg hover:border-brand-400/60"
          >
            Lanjut belanja
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-fg-subtle">
          Butuh bantuan? <Link href="/bantuan" className="text-brand-400 hover:underline">Pusat Bantuan</Link> atau kontak{" "}
          <a href="mailto:bantuan@hoobiq.id" className="text-brand-400 hover:underline">bantuan@hoobiq.id</a>
        </p>
      </div>
    </AppShell>
  );
}
