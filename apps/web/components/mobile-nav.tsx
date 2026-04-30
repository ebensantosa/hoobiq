"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreatePostLauncher } from "./create-post-launcher";

/**
 * Bottom tab bar for mobile/tablet — 5 items in the marketplace
 * standard pattern (Tokopedia / Shopee / Tokopedia Seller layout):
 *
 *   Home · Belanja · [Buat-FAB] · Pesan · Akun
 *
 * The center "Buat" cell is a raised FAB that hosts the
 * CreatePostLauncher modal — visually distinct from the four flat
 * tabs around it so the primary "post something" action stays the
 * loudest CTA on the bar at a glance.
 *
 * Hidden at lg+ because the desktop top nav covers these surfaces.
 * Pages get pb-20 lg:pb-0 from app-shell so content doesn't hide
 * under this fixed bar.
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
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-7h4v7"/></svg>,
  },
  {
    href: "/marketplace",
    label: "Belanja",
    prefix: "/marketplace",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 1.5-4h17L22 7"/><path d="M2 7v3a2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2V7"/><path d="M4 12v9h16v-9"/></svg>,
  },
  // Center FAB — special-cased in the renderer.
  { href: CREATE_HREF, label: "Buat", icon: null },
  {
    href: "/dm",
    label: "Pesan",
    prefix: "/dm",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    href: "/akun",
    label: "Akun",
    prefix: "/akun",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>,
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
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          // Center FAB cell — raised + brand-coloured to draw the
          // eye to the primary "post something" action.
          if (it.href === CREATE_HREF) {
            return (
              <li key={it.href} className="relative flex justify-center">
                <div className="flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10px] font-semibold text-brand-500">
                  {/* CreatePostLauncher already renders its own
                      gradient FAB; we just lift it up off the rail
                      so it reads as the primary action without
                      stacking another wrapper around its button. */}
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
                  "relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors " +
                  (active ? "text-brand-500" : "text-fg-muted hover:text-fg")
                }
              >
                <span>{it.icon}</span>
                <span>{it.label}</span>
                {active && (
                  <span
                    aria-hidden
                    className="absolute -top-px h-0.5 w-8 rounded-full bg-gradient-to-r from-brand-500 to-flame-500"
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
