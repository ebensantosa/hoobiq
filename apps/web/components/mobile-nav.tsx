"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreatePostLauncher } from "./create-post-launcher";

/**
 * Bottom tab bar for mobile/tablet. Mirrors the most-used items from the
 * desktop sidebar so users on small screens can reach the same surfaces.
 *
 * Hidden at `lg+` because the sidebar takes over there. The body gets a
 * `pb-16 lg:pb-0` somewhere upstream so content doesn't get covered by
 * this fixed bar — handled in app-shell.tsx.
 */
type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Optional path-prefix matcher in addition to exact href match. */
  prefix?: string;
};

/** Sentinel that swaps the cell out for the CreatePostLauncher modal. */
const CREATE_HREF = "/__create__";

const ITEMS: Item[] = [
  {
    href: "/",
    label: "Home",
    // Exact prefix — anything starting with `/` would over-match. usePathname
    // returns "/" only for the root, so an exact equality check is what
    // highlights this tab.
    prefix: "/",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-7h4v7"/></svg>,
  },
  {
    href: "/marketplace",
    label: "Belanja",
    prefix: "/marketplace",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 1.5-4h17L22 7"/><path d="M2 7v3a2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2V7"/><path d="M4 12v9h16v-9"/></svg>,
  },
  {
    href: "/feeds",
    label: "Feeds",
    prefix: "/feeds",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.5"/></svg>,
  },
  // Special slot — rendered as a CreatePostLauncher (modal sheet) below.
  // The href stays here so the active-prefix detector treats it as
  // non-active for routes other than /upload.
  {
    href: CREATE_HREF,
    label: "Buat",
    icon: null,
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

  // The "Akun" tab routes to /akun (a small index of personal pages) when
  // logged in. It serves as the mobile equivalent of the desktop sidebar's
  // "Milikku" section.
  const items = ITEMS.map((it) =>
    it.href === "/akun" && username
      ? { ...it, href: "/akun" } // keep — we have a dedicated index page
      : it
  );

  return (
    <nav
      aria-label="Navigasi mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-canvas/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-6">
        {items.map((it) => {
          // Center create-post slot: swap for the launcher modal.
          if (it.href === CREATE_HREF) {
            return (
              <li key={it.href}>
                <div className="relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-fg">
                  <span className="-mt-3">
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
                  (active
                    ? "text-brand-500"
                    : "text-fg-muted hover:text-fg")
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
