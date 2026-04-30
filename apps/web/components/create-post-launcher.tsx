"use client";

import * as React from "react";
import Link from "next/link";

/**
 * "+" floating-action launcher rendered in the mobile bottom-nav.
 * Tapping it opens a centered sheet asking the user to pick what they
 * want to do: share to feed, or list an item for sale. Mirrors the
 * "Create Post" modal pattern from the design reference — one tap,
 * two clear paths, no implicit guessing about intent.
 *
 * Closes on backdrop click + Esc + after navigating.
 */
export function CreatePostLauncher() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
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
        onClick={() => setOpen(true)}
        aria-label="Buat post atau jual"
        className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-flame-500 text-white shadow-[0_10px_24px_-8px_rgba(231,85,159,0.7)] transition-transform hover:scale-105"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      {open && <PickerSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function PickerSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buat post"
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-t-2xl bg-panel shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-rule px-5 py-4">
          <div>
            <p className="text-base font-bold text-fg">Buat post</p>
            <p className="text-xs text-fg-muted">Pilih sharing atau jualan dengan mudah.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-panel-2 hover:text-fg"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex flex-col gap-3 p-5">
          <Choice
            href="/feeds#composer"
            onClick={onClose}
            tone="brand"
            title="Share Your Collection"
            blurb="Bagikan cerita, foto, atau pengalaman koleksi kamu."
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
              </svg>
            }
          />
          <Choice
            href="/upload"
            onClick={onClose}
            tone="flame"
            title="Sell an Item"
            blurb="Jual koleksi kamu ke komunitas yang tepat."
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2 7 1.5-4h17L22 7" />
                <path d="M2 7v3a2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2V7" />
                <path d="M4 12v9h16v-9" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}

function Choice({
  href, onClick, tone, title, blurb, icon,
}: {
  href: string;
  onClick: () => void;
  tone: "brand" | "flame";
  title: string;
  blurb: string;
  icon: React.ReactNode;
}) {
  const cls = tone === "brand"
    ? "border-brand-400/30 bg-brand-400/5 text-brand-500 hover:border-brand-400/60 hover:bg-brand-400/10"
    : "border-flame-400/30 bg-flame-400/5 text-flame-500 hover:border-flame-400/60 hover:bg-flame-400/10";
  return (
    <Link
      href={href}
      onClick={onClick}
      className={"flex items-center gap-4 rounded-xl border p-4 transition-colors " + cls}
    >
      <span className={"grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-panel " + (tone === "brand" ? "text-brand-500" : "text-flame-500")}>
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-base font-bold text-fg">{title}</span>
        <span className="mt-0.5 block text-xs text-fg-muted">{blurb}</span>
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-fg-subtle">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
