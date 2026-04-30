"use client";
import * as React from "react";
import Link from "next/link";
import type { MenuCategory } from "./header-categories-menu";

/**
 * Mobile-only header drawer. Hamburger button on the left of the
 * topbar opens a slide-in panel that mirrors what desktop puts in the
 * header itself (categories tree + nav links + account quick links).
 *
 * The bottom tab bar still handles the most-used destinations on
 * mobile; this drawer is for everything that won't fit there
 * (kategori, wishlist, jual, pengaturan, masuk/daftar for guests).
 */
export function HeaderMobileDrawer({
  categories,
  user,
}: {
  categories: MenuCategory[];
  user: { username: string; name: string | null } | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  // Lock body scroll while the drawer is open so the underlying page
  // doesn't scroll when the user swipes the menu.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function close() {
    setOpen(false);
    setExpanded(null);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Buka menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-panel hover:text-fg lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          {/* Backdrop — sits behind the panel; clicking it closes the drawer. */}
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={close}
            className="absolute inset-0 z-0 bg-black/50 backdrop-blur-sm"
          />
          {/* Panel — explicit z-index above backdrop, hard solid bg
              (bg-canvas + bg-white fallback so the panel never reads
              as transparent if a CSS variable misses on the user's
              theme), and a min-height that fills the viewport so a
              short nav list doesn't leave the page bleeding through
              the bottom. */}
          <div className="absolute inset-y-0 left-0 z-10 flex h-full w-[88%] max-w-sm flex-col overflow-y-auto bg-white shadow-2xl dark:bg-[hsl(225_24%_6%)]">
            <div className="flex items-center justify-between border-b border-rule px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
                Menu
              </p>
              <button
                type="button"
                onClick={close}
                aria-label="Tutup"
                className="rounded-md p-1 text-fg-muted hover:bg-panel hover:text-fg"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {user ? (
              <div className="border-b border-rule px-4 py-3 text-sm">
                <p className="text-fg-subtle">Masuk sebagai</p>
                <p className="font-semibold text-fg">{user.name?.trim() || `@${user.username}`}</p>
              </div>
            ) : (
              <div className="flex gap-2 border-b border-rule px-4 py-3">
                <Link
                  href="/masuk"
                  onClick={close}
                  className="flex-1 rounded-lg border border-rule bg-panel py-2 text-center text-sm font-semibold text-fg-muted hover:text-fg"
                >
                  Masuk
                </Link>
                <Link
                  href="/daftar"
                  onClick={close}
                  className="flex-1 rounded-lg bg-brand-500 py-2 text-center text-sm font-bold text-white hover:bg-brand-600"
                >
                  Daftar
                </Link>
              </div>
            )}

            <nav className="flex flex-col py-2 text-sm">
              <Section title="Belanja">
                <DrawerLink href="/marketplace" onClick={close}>Marketplace</DrawerLink>
                <DrawerLink href="/feeds" onClick={close}>Feeds</DrawerLink>
                <DrawerLink href="/trades" onClick={close}>Meet Match</DrawerLink>
                <DrawerLink href="/wishlist" onClick={close}>Wishlist</DrawerLink>
                <DrawerLink href="/keranjang" onClick={close}>Keranjang</DrawerLink>
              </Section>

              {categories.length > 0 && (
                <Section title="Kategori">
                  {categories.map((c) => (
                    <div key={c.id} className="border-b border-rule/50 last:border-0">
                      <button
                        type="button"
                        onClick={() => setExpanded((cur) => (cur === c.slug ? null : c.slug))}
                        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left font-medium text-fg hover:bg-panel"
                      >
                        <span>{c.name}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-fg-subtle">
                            {c.listingCount.toLocaleString("id-ID")}
                          </span>
                          {c.children.length > 0 && (
                            <svg
                              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                              className={"transition-transform " + (expanded === c.slug ? "rotate-180" : "")}
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          )}
                        </span>
                      </button>
                      {expanded === c.slug && (
                        <ul className="bg-panel/40 pb-2 text-[13px]">
                          <li>
                            <Link
                              href={`/kategori/${c.slug}`}
                              onClick={close}
                              className="block px-6 py-1.5 font-semibold text-brand-500"
                            >
                              Lihat semua {c.name}
                            </Link>
                          </li>
                          {c.children.map((sub) => (
                            <li key={sub.id}>
                              <Link
                                href={`/kategori/${sub.slug}`}
                                onClick={close}
                                className="block px-6 py-1.5 text-fg-muted hover:text-brand-500"
                              >
                                {sub.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                  <DrawerLink href="/kategori" onClick={close}>
                    Lihat semua kategori →
                  </DrawerLink>
                </Section>
              )}

              {user && (
                <Section title="Akun">
                  <DrawerLink href={`/u/${user.username}`} onClick={close}>Profil</DrawerLink>
                  <DrawerLink href="/pesanan" onClick={close}>Pesanan saya</DrawerLink>
                  <DrawerLink href="/saldo" onClick={close}>Hoobiq Pay</DrawerLink>
                  <DrawerLink href="/jual" onClick={close}>Dashboard penjual</DrawerLink>
                  <DrawerLink href="/upload" onClick={close}>Pasang listing</DrawerLink>
                  <DrawerLink href="/pengaturan" onClick={close}>Pengaturan</DrawerLink>
                </Section>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-rule">
      <p className="px-4 pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
        {title}
      </p>
      <div className="pb-2">{children}</div>
    </div>
  );
}

function DrawerLink({
  href, onClick, children,
}: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2 text-fg-muted hover:bg-panel hover:text-fg"
    >
      {children}
    </Link>
  );
}
