import Link from "next/link";
import { Logo } from "@hoobiq/ui";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { NotificationsBell } from "./notifications-bell";
import { getSessionUser } from "@/lib/server/session";

// Primary navigation (Feeds / Marketplace / Kategori) lives in the sidebar
// now — top bar focuses on identity, search, and account actions.
export async function TopNav({ active: _active }: { active?: string }) {
  void _active;
  const user = await getSessionUser();

  return (
    <header className="header-glow fixed inset-x-0 top-0 z-40 border-b border-rule bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/75">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center gap-4 px-6">
        <Link href={user ? "/marketplace" : "/"} className="shrink-0 inline-flex items-center" aria-label="Hoobiq">
          <Logo size="md" />
        </Link>

        {user && (
          <nav className="hidden items-center gap-1 lg:flex">
            <NavPill href="/feeds">Feeds</NavPill>
            <NavPill href="/marketplace">Marketplace</NavPill>
            <NavPill href="/drops">Drops</NavPill>
            <NavPill href="/trades">Trades</NavPill>
          </nav>
        )}

        <div className="ml-auto flex flex-1 items-center gap-3 md:max-w-2xl">
          <form action="/marketplace" className="hidden w-full md:block">
            <label className="group flex h-11 items-center gap-3 rounded-xl border border-rule bg-panel px-4 text-sm transition-colors focus-within:border-brand-400/60 focus-within:ring-2 focus-within:ring-brand-400/15">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-subtle"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                name="q"
                placeholder="Cari kartu, figure, blind box…"
                className="flex-1 bg-transparent text-fg placeholder:text-fg-subtle focus:outline-none"
              />
              <kbd className="rounded border border-rule bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">↵</kbd>
            </label>
          </form>
        </div>

        <div className="flex items-center gap-1.5">
          {user && (
            <Link
              href="/upload"
              className="hidden h-10 items-center gap-1.5 rounded-lg bg-brand-400 px-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-500 hover:shadow-md sm:inline-flex"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Jual
            </Link>
          )}
          <ThemeToggle />
          {user ? (
            <>
              <IconButton href="/dm" label="Pesan">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </IconButton>
              <NotificationsBell />
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Link href="/masuk" className="rounded-lg px-3 py-2 text-sm font-semibold text-fg-muted hover:text-fg">
                Masuk
              </Link>
              <Link
                href="/daftar"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-400 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-500 hover:shadow-md"
              >
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavPill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-semibold text-fg-muted transition-colors hover:bg-panel hover:text-fg"
    >
      {children}
    </Link>
  );
}

function IconButton({
  href,
  label,
  children,
  hasUnread,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  hasUnread?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rule bg-panel text-fg-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/50 hover:text-brand-500"
    >
      {children}
      {hasUnread && (
        <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 animate-dot-pulse" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
        </span>
      )}
    </Link>
  );
}
