"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreatePostLauncher } from "./create-post-launcher";

/**
 * Bottom tab bar for mobile/tablet — 7 cells with the center "Buat"
 * cell rendered as a raised FAB:
 *
 *   Home · Feed · Belanja · [Buat] · Match · Pesan · Akun
 *
 * 7 columns is tight at phone widths; we use icon-22 + label-9 + a
 * tighter vertical padding so the labels still read without wrap.
 * Hidden at lg+ because the desktop top nav covers these surfaces.
 */
type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
  prefix?: string;
};

const CREATE_HREF = "/__create__";

const ITEMS: Item[] = [
  {
    href: "/",
    label: "Home",
    prefix: "/",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-7h4v7"/></svg>,
  },
  {
    href: "/feeds",
    label: "Feed",
    prefix: "/feeds",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.5"/></svg>,
  },
  {
    href: "/marketplace",
    label: "Belanja",
    prefix: "/marketplace",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 1.5-4h17L22 7"/><path d="M2 7v3a2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2V7"/><path d="M4 12v9h16v-9"/></svg>,
  },
  // Center FAB — special-cased in the renderer.
  { href: CREATE_HREF, label: "Buat", icon: null },
  {
    href: "/trades",
    label: "Match",
    prefix: "/trades",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10l5-5 5 5"/><path d="M7 14l5 5 5-5"/></svg>,
  },
  {
    href: "/dm",
    label: "Pesan",
    prefix: "/dm",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    href: "/akun",
    label: "Akun",
    prefix: "/akun",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>,
  },
];

export function MobileNav({ username }: { username?: string | null }) {
  const pathname = usePathname() ?? "";
  const items = ITEMS.map((it) =>
    it.href === "/akun" && username ? { ...it, href: "/akun" } : it,
  );

  return (
    <nav
      aria-label="Navigasi mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-canvas/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-7">
        {items.map((it) => {
          if (it.href === CREATE_HREF) {
            return (
              <li key={it.href} className="relative flex justify-center">
                <div className="flex flex-col items-center gap-0.5 pb-1 pt-1.5 text-[9px] font-semibold text-brand-500">
                  <span className="-mt-5 ring-4 ring-canvas rounded-full">
                    <CreatePostLauncher />
                  </span>
                  <span>{it.label}</span>
                </div>
              </li>
            );
          }
          const active = it.prefix
            ? pathname === it.prefix || pathname.startsWith(`${it.prefix}/`)
            : pathname === it.href;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={
                  "relative flex flex-col items-center gap-0.5 py-1.5 text-[9px] font-medium transition-colors " +
                  (active ? "text-brand-500" : "text-fg-muted hover:text-fg")
                }
              >
                <span>{it.icon}</span>
                <span>{it.label}</span>
                {active && (
                  <span
                    aria-hidden
                    className="absolute -top-px h-0.5 w-6 rounded-full bg-gradient-to-r from-brand-500 to-flame-500"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
