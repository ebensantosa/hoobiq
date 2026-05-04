"use client";
import * as React from "react";
import { api } from "@/lib/api/client";

type Entry = { amount: number; kind: string; at: number };

/**
 * Polls `GET /exp/recent` while the tab is visible and surfaces each
 * pending EXP grant as a tiny floating chip — "+N EXP" — in the
 * corner of the viewport. Server-side, every ExpService.award() pushes
 * a JSON entry into a per-user Redis list; this endpoint drains that
 * list. So the toast covers EVERY EXP path (post, swipe, daily login,
 * order completion, etc.) without each call site having to know.
 *
 * Timing: 6 second interval is responsive enough that a typical action
 * (post, swipe) shows the chip within seconds, and gentle on the API.
 * On `visibilitychange` we drain immediately when the tab comes back
 * so context-switching doesn't queue stale toasts.
 */
export function ExpToastPoller() {
  const [queue, setQueue] = React.useState<Entry[]>([]);

  // Single drain function — used by interval + visibility change. Wraps
  // the API call so any error just no-ops (toast surface is best-effort).
  const drain = React.useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    try {
      const res = await api<{ items: Entry[] }>("/exp/recent");
      if (res?.items?.length) {
        setQueue((q) => [...q, ...res.items]);
      }
    } catch { /* ignore — endpoint cuma ada saat login, anonymous users dilewatin */ }
  }, []);

  React.useEffect(() => {
    void drain();
    const interval = setInterval(drain, 6000);
    function onVis() { if (document.visibilityState === "visible") void drain(); }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [drain]);

  // Auto-dismiss each chip after 3 seconds. Stack vertically so a burst
  // of awards (e.g. +20 post + +100 first-post) reads as separate lines.
  React.useEffect(() => {
    if (queue.length === 0) return;
    const t = setTimeout(() => {
      setQueue((q) => q.slice(1));
    }, 2800);
    return () => clearTimeout(t);
  }, [queue]);

  if (queue.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[80] flex flex-col gap-2">
      {queue.slice(0, 4).map((e, i) => (
        <div
          key={`${e.at}-${i}`}
          className="exp-toast pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 via-flame-500 to-ultra-500 px-4 py-2 text-white shadow-[0_8px_24px_-8px_rgba(236,72,153,0.6)] ring-1 ring-white/30 backdrop-blur"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>
          </svg>
          <span className="font-mono text-sm font-extrabold tabular-nums">+{e.amount.toLocaleString("id-ID")} EXP</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
            {labelFor(e.kind)}
          </span>
        </div>
      ))}
      <style jsx>{`
        .exp-toast { animation: exp-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes exp-pop {
          from { opacity: 0; transform: translateY(-6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}

/** Map server-side kind constants → short Indonesian labels for the chip. */
function labelFor(kind: string): string {
  switch (kind) {
    case "profile_complete":   return "Profil Lengkap";
    case "post_first":         return "Post Pertama";
    case "post":               return "Post";
    case "swipe_50_daily":     return "Swipe 50";
    case "purchase_first":     return "Beli Pertama";
    case "purchase_complete":  return "Pembelian";
    case "review_seller":      return "Review";
    case "listing_first":      return "Listing Pertama";
    case "sale_first":         return "Sale Pertama";
    case "sale_complete":      return "Sale";
    case "rating_received_45": return "Rating ⭐";
    case "daily_login":        return "Daily Login";
    default:                   return "Reward";
  }
}
