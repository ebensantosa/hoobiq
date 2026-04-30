import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@hoobiq/ui";

export const metadata = { title: "Journey · Hoobiq" };

/**
 * Public roadmap / "Coming soon" page. Surfaces what we're building so
 * existing users can see direction and new visitors get context that
 * Hoobiq is more than the current marketplace surface. Content lives
 * inline (not CMS-backed yet) — short, honest, and edited as items land.
 *
 * If a stage's status flips ("planned" → "building" → "live"), update
 * the data array below; nothing here is fetched.
 */

type Status = "live" | "building" | "planned";

const ROADMAP: Array<{
  status: Status;
  title: string;
  blurb: string;
  bullets: string[];
}> = [
  {
    status: "live",
    title: "Marketplace + Hoobiq Pay",
    blurb:
      "Listing, checkout, escrow, return/dispute. Pondasi sudah jalan — semua transaksi protected.",
    bullets: [
      "Virtual Account, e-wallet, QRIS via Komerce",
      "Auto-cancel 24 jam kalau tidak dibayar",
      "Return + dispute window 7 hari setelah delivered",
    ],
  },
  {
    status: "live",
    title: "Komunitas & Trades",
    blurb:
      "Feeds untuk pamer koleksi & pull rate, plus swipe trade buat tuker barang langsung.",
    bullets: [
      "Feed mixed (post + listing) dengan search keyword",
      "Trades — swipe deck antar kolektor",
      "Pull Rate inline di post blind box",
    ],
  },
  {
    status: "building",
    title: "Rating, review, badge prominent",
    blurb:
      "Profil seller sekarang dapat rating bintang real dari ListingReview. Badge UI lebih obvious + halaman koleksi badge.",
    bullets: [
      "Rating bintang + 5 review terbaru di profil",
      "Strip badge tinted dengan CTA “Lihat koleksi”",
      "Halaman /u/[username]/badges",
    ],
  },
  {
    status: "building",
    title: "Restrukturisasi kategori 3 level",
    blurb:
      "Collection Cards, Trading Cards, Merchandise (Official + Art & Fan Goods), Toys, Others — semua dengan sub-sub kategori.",
    bullets: [
      "Form listing: pilihan Kategori → Sub Kategori → Series/Set",
      "Filter marketplace: checkbox multi-level",
      "Navigation: klik Semua → kategori → sub → marketplace pre-filter",
    ],
  },
  {
    status: "planned",
    title: "Follow kolektor",
    blurb:
      "Follow seller favorit — feed punya tab “Hanya yang diikuti”, notifikasi saat mereka post atau drop barang baru.",
    bullets: [
      "Schema: tabel Follow (followerId, followedId)",
      "Feed filter “Hanya yang diikuti” aktif",
      "Notif: seller yg di-follow post baru / pasang listing baru",
    ],
  },
  {
    status: "planned",
    title: "Hoobiq Live",
    blurb:
      "Live commerce — seller buka session, viewer bid real-time, item bisa langsung di-checkout dari overlay.",
    bullets: [
      "Streaming via WebRTC + Socket.IO chat",
      "Listing pinned di overlay",
      "Replay otomatis 30 hari",
    ],
  },
];

const TONE: Record<Status, { label: string; cls: string; ring: string }> = {
  live: {
    label: "Live",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    ring: "border-emerald-400/40",
  },
  building: {
    label: "Sedang dibangun",
    cls: "bg-brand-400/15 text-brand-500",
    ring: "border-brand-400/40",
  },
  planned: {
    label: "Coming soon",
    cls: "bg-flame-400/15 text-flame-600 dark:text-flame-400",
    ring: "border-flame-400/30",
  },
};

export default function JourneyPage() {
  return (
    <AppShell active="Journey">
      <div className="px-4 pb-12 sm:px-6 lg:px-10">
        <header className="border-b border-rule pb-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-flame-500">
            Roadmap publik
          </span>
          <h1 className="mt-2 text-3xl font-bold text-fg md:text-4xl">Hoobiq Journey</h1>
          <p className="mt-3 max-w-2xl text-sm text-fg-muted">
            Apa yang sudah jalan, lagi dibangun, dan rencana selanjutnya. Kita
            update halaman ini setiap minggu — nggak ada janji yang nggak
            ditepati. Punya request fitur? DM admin atau email
            <a className="ml-1 text-brand-500" href="mailto:halo@hoobiq.com">
              halo@hoobiq.com
            </a>.
          </p>
        </header>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {ROADMAP.map((item, i) => {
            const tone = TONE[item.status];
            return (
              <Card key={i} className={`border ${tone.ring}`}>
                <div className="space-y-3 p-6">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${tone.cls}`}>
                    {tone.label}
                  </span>
                  <h2 className="text-lg font-bold text-fg">{item.title}</h2>
                  <p className="text-sm text-fg-muted">{item.blurb}</p>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-fg-muted">
                    {item.bullets.map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-rule bg-panel/40 p-8 text-center">
          <p className="text-base font-medium text-fg">
            Mau ikut bantu shape Hoobiq?
          </p>
          <p className="mt-2 text-sm text-fg-muted">
            Join komunitas, kasih masukan langsung di feed, atau email kalau
            kamu punya ide besar yang belum kelihatan di sini.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/feeds"
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Buka komunitas
            </Link>
            <a
              href="mailto:halo@hoobiq.com"
              className="rounded-xl border border-rule px-4 py-2 text-sm font-semibold text-fg-muted transition-colors hover:border-brand-400/50 hover:text-fg"
            >
              halo@hoobiq.com
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
