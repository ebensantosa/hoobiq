"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@hoobiq/ui";
import { ThemeToggle } from "./theme-toggle";
import { authApi } from "@/lib/api/auth";
import type { SessionUser } from "@hoobiq/types";

/**
 * Profile dropdown — the only entry point for "Jual" since the
 * marketplace redesign per spec moves selling out of the buyer-first
 * header. The "Jual" item is a context-aware row at the bottom of
 * the menu:
 *   - Mulai Jualan   → user has zero listings (treated as not-a-seller)
 *   - Dashboard Seller → user has at least one listing
 *
 * `isSeller` is computed server-side in TopNav (one cheap probe to
 * /listings/mine) so the menu doesn't have to fetch on open.
 */
export function UserMenu({
  user,
  isSeller = false,
}: {
  user: SessionUser;
  isSeller?: boolean;
}) {
  const links = [
    { href: `/u/${user.username}`, label: "Profil" },
    { href: "/pesanan",   label: "Pesanan saya" },
    { href: "/wishlist",  label: "Wishlist" },
    { href: "/feeds",     label: "Feeds" },
    { href: "/trades",    label: "Meet Match" },
    { href: "/saldo",     label: "Hoobiq Pay" },
    { href: "/pengaturan", label: "Pengaturan" },
  ];

  const sellEntry = isSeller
    ? { href: "/jual",   label: "Dashboard Seller" }
    : { href: "/upload", label: "Mulai Jualan" };

  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    setOpen(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-rule bg-panel px-1.5 py-1 text-sm transition-colors hover:border-brand-400/50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar letter={user.username[0] ?? "U"} size="sm" src={user.avatarUrl} alt={`Avatar @${user.username}`} />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-subtle"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {open && (
        <div
          role="menu"
          // z-50 — must sit above the header (z-40).
          className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-rule bg-panel shadow-xl ring-1 ring-black/5 z-50 origin-top-right animate-menu-pop"
        >
          <div className="border-b border-rule px-4 py-3">
            <p className="truncate text-sm font-semibold text-fg">
              {user.name?.trim() || `@${user.username}`}
            </p>
            <p className="mt-0.5 truncate text-xs text-fg-subtle">{user.email}</p>
          </div>

          <ul className="py-1 text-sm">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-fg-muted transition-colors hover:bg-panel-2 hover:text-fg"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Seller CTA — visually separated from the buyer-side
              account links because it's a different "mode" of using
              the app. Not-yet-sellers see "Mulai Jualan" with the
              brand-coloured chip; existing sellers see "Dashboard
              Seller" with a subtler treatment. */}
          <div className="border-t border-rule p-2">
            <Link
              href={sellEntry.href}
              onClick={() => setOpen(false)}
              className={
                "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors " +
                (isSeller
                  ? "bg-panel-2 text-fg hover:bg-panel-2/70"
                  : "bg-brand-500 text-white hover:bg-brand-600")
              }
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 7 1.5-4h17L22 7" />
                  <path d="M4 12v9h16v-9" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                {sellEntry.label}
              </span>
              <span aria-hidden>→</span>
            </Link>
          </div>

          {/* Theme toggle — moved out of the header into the avatar
              dropdown per the latest UX feedback: keeps the topbar
              cleaner, and theme is a settings-ish control, not a
              primary nav action. */}
          <div className="border-t border-rule">
            <ThemeToggle variant="row" />
          </div>

          <div className="border-t border-rule">
            <button
              onClick={logout}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-flame-500 transition-colors hover:bg-panel-2"
            >
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
