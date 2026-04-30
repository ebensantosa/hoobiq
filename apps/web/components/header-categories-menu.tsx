"use client";
import * as React from "react";
import Link from "next/link";

/** A node in the trimmed-down category tree we ship to the client.
 *  Children are flattened to one level deep — the mega menu shows
 *  primary categories on the left rail and their direct sub-cats on
 *  the right, which is enough surface for buyers to drill in without
 *  drowning the panel in level-3 anime titles. */
export type MenuCategory = {
  id: string;
  slug: string;
  name: string;
  listingCount: number;
  children: { id: string; slug: string; name: string; listingCount: number }[];
};

/**
 * Desktop "Kategori" header trigger — renders a button that toggles a
 * full-width mega-menu panel below the header. Hover + click both
 * open it, click outside or Escape closes it. Categories are served
 * by the parent (TopNav) so the dropdown is fully static once
 * mounted; no per-open API hits.
 *
 * The mobile equivalent lives in `header-mobile-drawer.tsx`.
 */
export function HeaderCategoriesMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<string | null>(categories[0]?.slug ?? null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Click-outside + Escape so the panel doesn't trap focus when the
  // user navigates away with the keyboard.
  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // A short close-delay on mouseleave so a small mouse jiggle between
  // trigger and panel doesn't dismiss the menu mid-read.
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }
  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  const activeCat = categories.find((c) => c.slug === active) ?? categories[0];

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors " +
          (open ? "bg-panel text-fg" : "text-fg-muted hover:bg-panel hover:text-fg")
        }
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Kategori
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          className={"transition-transform " + (open ? "rotate-180" : "")}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && categories.length > 0 && (
        <div
          // Position relative to header. Width spans far enough for
          // two columns (rail + panel) but not the entire viewport
          // so it still feels like a menu, not a section takeover.
          className="absolute left-0 top-full z-30 mt-2 w-[640px] overflow-hidden rounded-xl border border-rule bg-canvas shadow-2xl"
          role="menu"
        >
          <div className="grid grid-cols-[200px_1fr]">
            {/* Left rail — primary categories. Hover/focus updates
                the right panel without navigating. */}
            <ul className="border-r border-rule bg-panel/30 py-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(c.slug)}
                    onFocus={() => setActive(c.slug)}
                    className={
                      "flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm transition-colors " +
                      (active === c.slug
                        ? "bg-brand-400/10 font-semibold text-fg"
                        : "text-fg-muted hover:bg-panel hover:text-fg")
                    }
                  >
                    <span>{c.name}</span>
                    <span className="font-mono text-[10px] text-fg-subtle">
                      {c.listingCount.toLocaleString("id-ID")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Right panel — direct sub-categories of the active
                primary, plus a "Lihat semua" deep link. */}
            <div className="flex flex-col p-4">
              {activeCat && (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-fg">{activeCat.name}</h3>
                    <Link
                      href={`/kategori/${activeCat.slug}`}
                      onClick={() => setOpen(false)}
                      className="text-xs font-semibold text-brand-500 hover:text-brand-600"
                    >
                      Lihat semua →
                    </Link>
                  </div>
                  {activeCat.children.length > 0 ? (
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {activeCat.children.map((sub) => (
                        <li key={sub.id}>
                          <Link
                            href={`/kategori/${sub.slug}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-panel hover:text-brand-500"
                          >
                            <span className="truncate">{sub.name}</span>
                            <span className="font-mono text-[10px] text-fg-subtle">
                              {sub.listingCount.toLocaleString("id-ID")}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-fg-subtle">
                      Belum ada sub-kategori. Jelajahi semua di {activeCat.name}.
                    </p>
                  )}
                </>
              )}
              <div className="mt-auto border-t border-rule pt-3">
                <Link
                  href="/kategori"
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold text-fg-muted hover:text-brand-500"
                >
                  Buka peta kategori lengkap →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
