"use client";

import { useEffect, useRef, useState } from "react";

export type PullRate = {
  /** Successful chase / hit pulls */
  hits: number;
  /** Total boxes opened in this batch */
  pulls: number;
  /** Community average pull rate for the same series, 0..1 */
  communityAvg: number;
  /** e.g. "Labubu — Have a Seat", "Pokemon 151 ETB" */
  seriesName: string;
  /** Optional total samples behind the community avg, for credibility */
  communityN?: number;
};

const fmtPct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Inline pull-rate moment for blind-box posts. Soft pink card, kinetic
 * fill animation on first paint, and a verdict pill comparing the user's
 * rate to the community average.
 */
export function PullRateWidget({
  hits,
  pulls,
  communityAvg,
  seriesName,
  communityN,
}: PullRate) {
  if (pulls <= 0) return null;

  const userRate = Math.min(1, Math.max(0, hits / pulls));
  const delta = userRate - communityAvg;
  const verdict = pickVerdict(delta);

  // Animate fill on mount — measured pause then ease to target
  const [filled, setFilled] = useState(0);
  const ranRef = useRef(false);
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    const t = setTimeout(() => setFilled(userRate), 120);
    return () => clearTimeout(t);
  }, [userRate]);

  // Position of the community marker, clamped so it never falls off the rail
  const markerLeft = `${Math.min(98, Math.max(2, communityAvg * 100))}%`;

  return (
    <div
      className="
        relative mx-5 my-3 overflow-hidden rounded-2xl border border-brand-200/70
        bg-gradient-to-br from-brand-50 via-white to-flame-50
        p-4 dark:border-brand-500/30 dark:from-brand-500/10 dark:via-panel dark:to-flame-500/10
      "
    >
      {/* decorative blob */}
      <span
        aria-hidden
        className="
          pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full
          bg-brand-300/30 blur-2xl dark:bg-brand-500/20
        "
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-brand-500">
            Pull rate
          </p>
          <p className="mt-0.5 line-clamp-1 text-xs text-fg-muted">
            {seriesName}
          </p>
        </div>
        <span
          className={
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest " +
            verdict.chipClass
          }
          aria-label={`Selisih ${delta >= 0 ? "+" : ""}${Math.round(delta * 100)} poin`}
        >
          {verdict.icon} {verdict.label}
        </span>
      </div>

      {/* The number, big and confident */}
      <div className="relative mt-3 flex items-baseline gap-3">
        <span className="font-mono text-[36px] font-extrabold leading-none tracking-tight text-fg">
          {fmtPct(userRate)}
        </span>
        <span className="font-mono text-sm font-semibold text-fg-muted">
          {hits} / {pulls}
        </span>
      </div>

      {/* Bar */}
      <div className="relative mt-4">
        <div
          className="
            relative h-2.5 overflow-hidden rounded-full
            bg-brand-100/80 dark:bg-white/10
          "
        >
          <div
            className="
              h-full rounded-full
              bg-gradient-to-r from-brand-400 via-flame-400 to-brand-500
              shadow-[0_0_12px_rgba(231,85,159,0.55)]
              transition-[width] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]
            "
            style={{ width: `${filled * 100}%` }}
          />
        </div>

        {/* Community avg marker — vertical tick + label below */}
        <div
          className="absolute -top-1 z-10 flex -translate-x-1/2 flex-col items-center"
          style={{ left: markerLeft }}
          aria-hidden
        >
          <span className="h-4.5 w-[2px] rounded-full bg-fg/70 dark:bg-white/70" style={{ height: 18 }} />
        </div>
      </div>

      {/* Footnote line — feels like a stats moment, not a chart */}
      <p className="mt-3 text-[13px] leading-snug text-fg-muted">
        Rata-rata komunitas:{" "}
        <span className="font-semibold text-fg">{fmtPct(communityAvg)}</span>
        {communityN ? (
          <span className="text-fg-subtle"> · {communityN.toLocaleString("id-ID")} sampel</span>
        ) : null}
        {" — "}
        <span className={"font-semibold " + verdict.lineClass}>{verdict.line}</span>
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- verdicts */

function pickVerdict(delta: number) {
  // delta is userRate - communityAvg, in [-1, 1]
  if (delta >= 0.25) {
    return {
      label: "Hoki banget",
      icon: "🍀",
      line: "Kamu jauh lebih hoki",
      chipClass:
        "bg-flame-500 text-white shadow-[0_4px_14px_-4px_rgba(250,167,74,0.7)]",
      lineClass: "text-flame-600 dark:text-flame-400",
    };
  }
  if (delta >= 0.05) {
    return {
      label: "Lebih hoki",
      icon: "✨",
      line: "Kamu lebih hoki",
      chipClass:
        "bg-brand-500 text-white shadow-[0_4px_14px_-4px_rgba(231,85,159,0.7)]",
      lineClass: "text-brand-600 dark:text-brand-400",
    };
  }
  if (delta > -0.05) {
    return {
      label: "Sesuai rata-rata",
      icon: "≈",
      line: "Sesuai rata-rata",
      chipClass: "bg-ultra-500/15 text-ultra-600 dark:text-ultra-300",
      lineClass: "text-ultra-600 dark:text-ultra-300",
    };
  }
  if (delta > -0.25) {
    return {
      label: "Sabar dulu",
      icon: "🎲",
      line: "Belum hoki kali ini",
      chipClass: "bg-fg/10 text-fg-muted",
      lineClass: "text-fg-muted",
    };
  }
  return {
    label: "Hari sial",
    icon: "💀",
    line: "Hari sial — coba batch berikutnya",
    chipClass: "bg-fg/15 text-fg",
    lineClass: "text-fg-muted",
  };
}
