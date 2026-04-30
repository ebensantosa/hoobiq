import Link from "next/link";
import { Avatar } from "@hoobiq/ui";
import { ThemeToggle } from "./theme-toggle";
import { BrandLogo } from "./brand-logo";
import { ActionDialogProvider } from "./action-dialog";
import { getSessionUser } from "@/lib/server/session";
import { getSiteSettings } from "@/lib/site-settings";
import { serverApi } from "@/lib/server/api";

type NavItem = { href: string; label: string; badgeKey?: "disputes" | "reports" | "payouts" };

const nav: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [
      { href: "/admin-panel", label: "Dashboard" },
      { href: "/admin-panel/analitik", label: "Analitik" },
      { href: "/admin-panel/laporan", label: "Laporan & abuse", badgeKey: "reports" },
    ],
  },
  {
    group: "Marketplace",
    items: [
      { href: "/admin-panel/listing", label: "Listing" },
      { href: "/admin-panel/transaksi", label: "Transaksi" },
      { href: "/admin-panel/dispute", label: "Dispute", badgeKey: "disputes" },
      { href: "/admin-panel/kategori", label: "Kategori" },
      { href: "/admin-panel/kategori-request", label: "Request kategori" },
      { href: "/admin-panel/kyc", label: "Verifikasi KTP" },
    ],
  },
  {
    group: "Keuangan",
    items: [
      { href: "/admin-panel/keuangan", label: "Keuangan" },
      { href: "/admin-panel/payout", label: "Payout", badgeKey: "payouts" },
      { href: "/admin-panel/promo", label: "Promo & kupon" },
    ],
  },
  {
    group: "Komunitas",
    items: [
      { href: "/admin-panel/pengguna", label: "Pengguna" },
      { href: "/admin-panel/moderasi", label: "Moderasi feed" },
      { href: "/admin-panel/review",   label: "Review" },
      { href: "/admin-panel/broadcast", label: "Broadcast" },
    ],
  },
  {
    group: "Konten",
    items: [
      { href: "/admin-panel/homepage-banners", label: "Hero banner" },
    ],
  },
  {
    group: "Sistem",
    items: [
      { href: "/admin-panel/pengaturan", label: "Pengaturan" },
      { href: "/admin-panel/webhook", label: "Webhook" },
      { href: "/admin-panel/audit", label: "Audit log" },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  ops: "Ops",
};

export async function AdminShell({
  active,
  children,
}: {
  active?: string;
  children: React.ReactNode;
}) {
  // The /admin layout already gates on role; we just read for display.
  const [user, settings, overview] = await Promise.all([
    getSessionUser(),
    getSiteSettings(),
    serverApi<{ kpi: { openDisputes: number } }>("/admin/overview").catch(() => null),
  ]);

  const badges = {
    disputes: overview?.kpi.openDisputes ?? 0,
    reports: 0,   // wire when /admin/laporan endpoint lands
    payouts: 0,   // wire when /admin/payout endpoint lands
  };

  return (
    <ActionDialogProvider>
    <div className="min-h-screen bg-canvas">
      <AdminTopBar user={user} brandName={settings.brandName} />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <AdminSidebar active={active} badges={badges} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
    </ActionDialogProvider>
  );
}

function AdminTopBar({
  user,
  brandName,
}: {
  user: { username: string; name: string | null; role: string; avatarUrl: string | null } | null;
  brandName: string;
}) {
  const displayName = user?.name?.trim() || user?.username || "—";
  const initial = (displayName[0] ?? "?").toUpperCase();
  const roleLabel = user ? (ROLE_LABEL[user.role] ?? user.role) : "Tidak login";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-6 border-b border-rule bg-canvas/90 px-6 backdrop-blur">
      <Link href="/admin-panel" className="flex items-center gap-3" aria-label={`${brandName} admin`}>
        <BrandLogo size="sm" />
        <span className="hidden rounded-full border border-brand-400/40 bg-brand-400/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400 md:inline">
          Admin
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        {user ? (
          <div className="flex items-center gap-2 rounded-lg border border-rule bg-panel px-2 py-1">
            <Avatar letter={initial} size="sm" />
            <div className="hidden text-xs md:block">
              <p className="font-medium text-fg">{displayName}</p>
              <p className="text-fg-subtle">{roleLabel} · @{user.username}</p>
            </div>
          </div>
        ) : (
          <Link
            href="/masuk?next=/admin-panel"
            className="rounded-lg border border-rule bg-panel px-3 py-1.5 text-xs font-semibold text-fg-muted hover:text-fg"
          >
            Masuk
          </Link>
        )}
      </div>
    </header>
  );
}

function AdminSidebar({
  active,
  badges,
}: {
  active?: string;
  badges: { disputes: number; reports: number; payouts: number };
}) {
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
              const badge = it.badgeKey ? badges[it.badgeKey] : 0;
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
                    {badge > 0 && (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-flame-400/20 px-1.5 text-[10px] font-semibold text-flame-400">
                        {badge}
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
          <Link href="/admin-panel/audit" className="text-brand-400">
            audit log
          </Link>
          .
        </p>
      </div>
    </aside>
  );
}
