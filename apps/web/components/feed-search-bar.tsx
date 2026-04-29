"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Client-side controls for /feeds: a search box (writes ?q=) and a set
 * of independent view-mode checkboxes (?include=posts,listings,following).
 * Multi-select per spec — buyers can tick "Yang diikuti" + "Listing"
 * simultaneously and the server combines the streams.
 *
 *   - posts:     user posts (sharing/photos) appear in the timeline
 *   - listings:  marketplace listings appear in the timeline
 *   - following: only authors the buyer follows — gated until the follow
 *     graph lands; the pill stays disabled with a "soon" hint.
 *
 * No checkbox ticked = default behaviour: show everything (posts + listings).
 */
const FILTERS: { key: string; label: string; disabled?: boolean; hint?: string }[] = [
  { key: "posts",     label: "Tampilkan feeds" },
  { key: "listings",  label: "Tampilkan listing" },
  { key: "following", label: "Hanya yang diikuti", disabled: true, hint: "Coming soon" },
];

export function FeedSearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialQ = sp.get("q") ?? "";
  // `include` is comma-separated. Empty = default (everything).
  const includeRaw = sp.get("include") ?? "";
  const include = new Set(includeRaw.split(",").filter(Boolean));

  const [q, setQ] = React.useState(initialQ);
  const debounceRef = React.useRef<number | null>(null);

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
    debounceRef.current = window.setTimeout(() => {
      pushParams({ q: v.trim() || null });
    }, 300);
  }

  function toggleFilter(key: string) {
    const next = new Set(include);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    pushParams({ include: next.size > 0 ? Array.from(next).join(",") : null });
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
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const checked = include.has(f.key);
          return (
            <button
              key={f.key}
              type="button"
              role="checkbox"
              aria-checked={checked}
              disabled={f.disabled}
              onClick={() => !f.disabled && toggleFilter(f.key)}
              title={f.hint}
              className={
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                (f.disabled
                  ? "cursor-not-allowed border-rule bg-panel-2 text-fg-subtle"
                  : checked
                    ? "border-brand-400 bg-brand-400/10 text-brand-500"
                    : "border-rule bg-panel text-fg-muted hover:border-brand-300 hover:text-fg")
              }
            >
              <span
                aria-hidden
                className={
                  "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border transition-colors " +
                  (checked ? "border-brand-500 bg-brand-500 text-white" : "border-rule bg-panel")
                }
              >
                {checked && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
              {f.label}
              {f.disabled && (
                <span className="text-[9px] uppercase tracking-wider text-fg-subtle">soon</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
