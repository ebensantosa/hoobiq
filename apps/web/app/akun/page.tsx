import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@hoobiq/ui";
import { AppShell } from "@/components/app-shell";
import { LogoutButton } from "@/components/logout-button";
import { getSessionUser } from "@/lib/server/session";

export const metadata = { title: "Akun · Hoobiq" };
export const dynamic = "force-dynamic";

const SECTIONS: Array<{
  href: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  tone: "brand" | "ultra" | "flame" | "sky";
}> = [
  {
    href: "/u",
    label: "Profil",
    desc: "Lihat & kelola profil publik kamu.",
    tone: "ultra",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>,
  },
  {
    href: "/pesanan",
    label: "Pesanan saya",
    desc: "Track paket & history pembelian.",
    tone: "sky",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg>,
  },
  {
    href: "/keranjang",
    label: "Keranjang",
    desc: "Item siap di-checkout.",
    tone: "brand",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M3 3h2l3.6 11.59a2 2 0 0 0 2 1.41h7.7a2 2 0 0 0 2-1.59L23 6H6"/></svg>,
  },
  {
    href: "/wishlist",
    label: "Wishlist",
    desc: "Item yang kamu pengen.",
    tone: "brand",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  },
  {
    href: "/trades",
    label: "Trade Match",
    desc: "Tukar koleksi dua arah.",
    tone: "ultra",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10l5-5 5 5M7 14l5 5 5-5"/></svg>,
  },
  {
    href: "/jual",
    label: "Jual · Dashboard",
    desc: "Listing kamu, pesanan masuk, saldo.",
    tone: "ultra",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 1.5-4h17L22 7"/><path d="M2 7v3a2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2V7"/><path d="M4 12v9h16v-9"/></svg>,
  },
  {
    href: "/saldo",
    label: "Hoobiq Pay",
    desc: "Saldo wallet & withdrawal.",
    tone: "flame",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>,
  },
  {
    href: "/notifikasi",
    label: "Notifikasi",
    desc: "Pesanan, listing, sistem.",
    tone: "brand",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  },
  {
    href: "/kategori",
    label: "Kategori",
    desc: "Browse semua kategori.",
    tone: "flame",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  },
  {
    href: "/pengaturan",
    label: "Pengaturan",
    desc: "Profil, alamat, rekening, keamanan.",
    tone: "brand",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
  },
];

const TONE_CLASSES = {
  brand: "bg-brand-400/10 text-brand-500",
  ultra: "bg-ultra-400/10 text-ultra-500",
  flame: "bg-flame-400/10 text-flame-500",
  sky:   "bg-sky-400/10 text-sky-500",
} as const;

export default async function AkunPage() {
  const me = await getSessionUser();
  if (!me) redirect("/masuk?next=/akun");

  return (
    <AppShell active="Akun" withSidebar={false}>
      <div className="mx-auto max-w-2xl px-6 pb-24 lg:px-10">
        <header className="flex items-center gap-4 border-b border-rule pb-6">
          <Avatar
            letter={me.username[0]?.toUpperCase() ?? "U"}
            size="xl"
            ring
            src={me.avatarUrl}
            alt={`Avatar @${me.username}`}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold text-fg">{me.name ?? `@${me.username}`}</p>
            <p className="truncate text-sm text-fg-muted">@{me.username}</p>
            <p className="mt-1 text-xs text-fg-subtle">
              LV {me.level} · ★ {me.trustScore.toFixed(1)}
            </p>
          </div>
          <Link
            href={`/u/${encodeURIComponent(me.username)}`}
            className="rounded-lg border border-rule bg-panel px-3 py-1.5 text-xs font-semibold text-fg-muted transition-colors hover:border-brand-400/50 hover:text-fg"
          >
            Profil
          </Link>
        </header>

        <ul className="mt-4 grid gap-2">
          {SECTIONS.map((s) => {
            const href = s.href === "/u" ? `/u/${encodeURIComponent(me.username)}` : s.href;
            return (
              <li key={s.href}>
                <Link
                  href={href}
                  className="flex items-center gap-4 rounded-2xl border border-rule bg-panel p-4 transition-colors hover:border-brand-400/50"
                >
                  <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl " + TONE_CLASSES[s.tone]}>
                    {s.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">{s.label}</p>
                    <p className="mt-0.5 truncate text-xs text-fg-muted">{s.desc}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-subtle">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </AppShell>
  );
}
