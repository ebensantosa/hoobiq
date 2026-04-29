"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@hoobiq/ui";
import { authApi } from "@/lib/api/auth";
import type { SessionUser } from "@hoobiq/types";

export function UserMenu({ user }: { user: SessionUser }) {
  const links = [
    { href: `/u/${user.username}`, label: "Profil" },
    { href: "/pesanan", label: "Pesanan" },
    { href: "/wishlist", label: "Wishlist" },
    { href: "/jual", label: "Jual / Dashboard" },
    { href: "/saldo", label: "Hoobiq Pay" },
    { href: "/pengaturan", label: "Pengaturan" },
  ];

  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
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
        className="flex items-center gap-2 rounded-lg border border-rule bg-panel px-2 py-1 text-sm transition-colors hover:border-brand-400/50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar letter={user.username[0] ?? "U"} size="sm" src={user.avatarUrl} alt={`Avatar @${user.username}`} />
        <span className="hidden font-medium text-fg sm:inline">@{user.username}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-subtle"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {open && (
        <div
          role="menu"
          // z-50 — must sit above the header (z-40) and its animated gradient
          // border, otherwise the dropdown clips behind the glow line.
          className="absolute right-0 mt-3 w-60 overflow-hidden rounded-2xl border border-rule bg-panel shadow-xl ring-1 ring-black/5 z-50 origin-top-right animate-menu-pop"
        >
          <div className="border-b border-rule px-4 py-3">
            <p className="text-sm font-medium text-fg">{user.name ?? `@${user.username}`}</p>
            <p className="mt-0.5 text-xs text-fg-subtle">{user.email}</p>
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
          <div className="border-t border-rule">
            <button
              onClick={logout}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-flame-400 transition-colors hover:bg-panel-2"
            >
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
