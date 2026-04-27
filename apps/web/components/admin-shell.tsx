import Link from "next/link";
import { Avatar, Logo } from "@hoobiq/ui";
import { ThemeToggle } from "./theme-toggle";

type NavItem = { href: string; label: string; badge?: string | number };

const nav: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/analitik", label: "Analitik" },
      { href: "/admin/laporan", label: "Laporan & abuse", badge: 4 },
    ],
  },
  {
    group: "Marketplace",
    items: [
      { href: "/admin/listing", label: "Listing" },
      { href: "/admin/transaksi", label: "Transaksi" },
      { href: "/admin/dispute", label: "Dispute", badge: 7 },
      { href: "/admin/kategori", label: "Kategori" },
    ],
  },
  {
    group: "Keuangan",
    items: [
      { href: "/admin/keuangan", label: "Keuangan" },
      { href: "/admin/payout", label: "Payout", badge: 12 },
      { href: "/admin/promo", label: "Promo & kupon" },
    ],
  },
  {
    group: "Komunitas",
    items: [
      { href: "/admin/pengguna", label: "Pengguna" },
      { href: "/admin/moderasi", label: "Moderasi feed" },
      { href: "/admin/broadcast", label: "Broadcast" },
    ],
  },
  {
    group: "Sistem",
    items: [
      { href: "/admin/pengaturan", label: "Pengaturan" },
      { href: "/admin/webhook", label: "Webhook" },
      { href: "/admin/audit", label: "Audit log" },
    ],
  },
];

export function AdminShell({
  active,
  children,
}: {
  active?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <AdminTopBar />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <AdminSidebar active={active} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function AdminTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-6 border-b border-rule bg-canvas/90 px-6 backdrop-blur">
      <Link href="/admin" className="flex items-center gap-3">
        <Logo size="sm" />
        <span className="hidden rounded-full border border-brand-400/40 bg-brand-400/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400 md:inline">
          Admin
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-rule bg-panel px-3 py-1.5 text-xs text-fg-muted md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          Sistem normal · v1.4.2
        </div>
        <ThemeToggle />
        <div className="flex items-center gap-2 rounded-lg border border-rule bg-panel px-2 py-1">
          <Avatar letter="R" size="sm" />
          <div className="hidden text-xs md:block">
            <p className="font-medium text-fg">Rina A.</p>
            <p className="text-fg-subtle">Admin · Trust & Safety</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function AdminSidebar({ active }: { active?: string }) {
  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-rule bg-canvas/50 px-4 py-6 lg:flex">
      {nav.map((g) => (
        <div key={g.group}>
          <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
            {g.group}
          </p>
          <ul className="flex flex-col">
            {g.items.map((it) => {
              const isActive = active === it.label;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className={
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors " +
                      (isActive
                        ? "bg-brand-400/10 text-fg"
                        : "text-fg-muted hover:bg-panel hover:text-fg")
                    }
                  >
                    <span className="flex items-center gap-2">
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                      )}
                      {it.label}
                    </span>
                    {it.badge != null && (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-flame-400/20 px-1.5 text-[10px] font-semibold text-flame-400">
                        {it.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="mt-auto rounded-xl border border-rule bg-panel p-4">
        <p className="text-xs text-fg-muted">
          Semua tindakan di panel ini masuk ke{" "}
          <Link href="/admin/audit" className="text-brand-400 hover:underline">
            audit log
          </Link>
          .
        </p>
      </div>
    </aside>
  );
}
