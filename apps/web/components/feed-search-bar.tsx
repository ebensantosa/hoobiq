"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Client-side controls for /feeds: a search box (writes ?q=) and a set
 * of view-mode pills (writes ?show=). The server reads these params and
 * decides what to fetch + render.
 *
 * Per spec:
 *   - default ("all"): random/latest mix of posts + marketplace listings
 *   - "posts": just user posts (sharing/photos)
 *   - "listings": just marketplace listings
 *   - "following": only authors the buyer follows — disabled until the
 *     follow graph lands in the schema; left as a labelled pill so the
 *     intent is obvious in the UI.
 */
const VIEW_OPTIONS: { key: string; label: string; disabled?: boolean; hint?: string }[] = [
  { key: "all",       label: "Semua" },
  { key: "posts",     label: "Feeds" },
  { key: "listings",  label: "Listing" },
  { key: "following", label: "Yang diikuti", disabled: true, hint: "Coming soon" },
];

export function FeedSearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialQ = sp.get("q") ?? "";
  const show = sp.get("show") ?? "all";

  const [q, setQ] = React.useState(initialQ);
  const debounceRef = React.useRef<number | null>(null);

  // Keep the input in sync if URL changes externally (back/forward nav).
  React.useEffect(() => { setQ(initialQ); }, [initialQ]);

  function pushParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.replace(`/feeds?${params.toString()}`, { scroll: false });
  }

  function onSearchChange(v: string) {
    setQ(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    // 300ms debounce — same feel as a typeahead, doesn't hammer the server
    // on every keystroke.
    debounceRef.current = window.setTimeout(() => {
      pushParams({ q: v.trim() || null });
    }, 300);
  }

  function onPickShow(key: string) {
    pushParams({ show: key === "all" ? null : key });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-rule bg-panel p-3 sm:p-4">
      <label className="relative block">
        <span className="sr-only">Cari di feed</span>
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari pull rate, kolektor, set, atau anime…"
          className="h-11 w-full rounded-xl border border-rule bg-panel-2 pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400 focus:outline-none"
        />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {VIEW_OPTIONS.map((opt) => {
          const active = show === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              disabled={opt.disabled}
              onClick={() => !opt.disabled && onPickShow(opt.key)}
              title={opt.hint}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                (opt.disabled
                  ? "cursor-not-allowed border-rule bg-panel-2 text-fg-subtle"
                  : active
                    ? "border-brand-400 bg-brand-400/10 text-brand-500"
                    : "border-rule bg-panel text-fg-muted hover:border-brand-300 hover:text-fg")
              }
            >
              {opt.label}
              {opt.disabled && opt.hint && (
                <span className="ml-1 text-[9px] uppercase tracking-wider text-fg-subtle">soon</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
