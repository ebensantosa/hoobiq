"use client";
import * as React from "react";

/**
 * Mobile search trigger — an icon-only button that opens a fullscreen
 * search modal. Tapping the icon opens the sheet with autofocus on
 * the input; submit (or Enter) navigates to /marketplace?q=…
 *
 * On desktop the inline search bar stays in the topbar; this trigger
 * is hidden via the `lg:hidden` parent in TopNav.
 */
export function HeaderSearchPopup() {
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Cari"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-panel hover:text-fg"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Cari" className="fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          {/* Sheet — slides in from the top with the input front and
              centre. Submit handled by the wrapping <form> that posts
              to /marketplace, so the search params end up in the URL
              and the result page can server-side render. */}
          <form
            action="/marketplace"
            className="relative z-10 mx-auto mt-0 flex max-w-2xl flex-col bg-canvas p-4 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-fg-muted hover:bg-panel hover:text-fg"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <label className="flex h-11 flex-1 items-center gap-2.5 rounded-full border border-rule bg-panel px-4 text-sm focus-within:border-brand-400/70 focus-within:bg-canvas focus-within:ring-2 focus-within:ring-brand-400/20">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-fg-subtle">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.3-4.3"/>
                </svg>
                <input
                  ref={inputRef}
                  name="q"
                  type="search"
                  autoComplete="off"
                  placeholder="Cari produk, toko, atau kota…"
                  className="min-w-0 flex-1 bg-transparent text-fg placeholder:text-fg-subtle focus:outline-none"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-brand-500 px-4 text-sm font-bold text-white hover:bg-brand-600"
              >
                Cari
              </button>
            </div>
            <p className="mt-3 px-1 text-[11px] text-fg-subtle">
              Cari pakai nama produk, username toko, atau kota seller.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
