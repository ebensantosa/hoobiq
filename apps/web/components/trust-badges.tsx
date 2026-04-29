"use client";

import { useEffect, useRef, useState } from "react";
import {
  deriveTrustBadges as deriveTrustBadgesPure,
  type TrustBadge,
  type TrustBadgeKey,
} from "./trust-badges-derive";

/* =============================================================== types */

// Re-export for backward compat — callers can `import { TrustBadge } from "./trust-badges"`.
export type { TrustBadge, TrustBadgeKey } from "./trust-badges-derive";

/**
 * Re-export of the pure helper. New server-side callers should import directly
 * from "./trust-badges-derive" to avoid pulling the client component into
 * the server bundle. Keeps existing client imports working.
 */
export const deriveTrustBadges = deriveTrustBadgesPure;

export type TrustSize = "xs" | "sm" | "md";

/* =============================================================== component */

/**
 * Inline trust badges. Renders up to 2 visible badges + a "+N" overflow
 * pill. Tap or hover any badge to surface a tooltip with the meaning.
 *
 * Place anywhere a piece of trust signal applies — listing cards, profile
 * cards, post avatars. The component is presentation only; pass the
 * pre-derived list (use `deriveTrustBadges()` for the common cases).
 */
export function TrustBadges({
  badges,
  size = "sm",
  max = 2,
  className,
}: {
  badges: TrustBadge[];
  size?: TrustSize;
  max?: number;
  className?: string;
}) {
  if (badges.length === 0) return null;

  const visible  = badges.slice(0, max);
  const overflow = badges.slice(max);

  return (
    <span className={"inline-flex items-center gap-1 " + (className ?? "")}>
      {visible.map((b, i) => (
        <BadgeChip key={badgeId(b) + i} badge={b} size={size} />
      ))}
      {overflow.length > 0 && (
        <OverflowChip overflow={overflow} size={size} />
      )}
    </span>
  );
}

/* =============================================================== chip */

function BadgeChip({ badge, size }: { badge: TrustBadge; size: TrustSize }) {
  const meta = META[badge.key];
  const dim  = SIZES[size];

  return (
    <Tooltip
      title={renderTitle(badge)}
      body={meta.body}
    >
      <span
        role="img"
        aria-label={renderAria(badge)}
        className="inline-flex items-center"
      >
        {badge.key === "grade" ? (
          <GradeChip badge={badge} size={size} />
        ) : badge.key === "verified" ? (
          <VerifiedChip size={size} />
        ) : (
          <span
            className={
              "inline-flex shrink-0 items-center justify-center rounded-full border " +
              dim.icon + " " + meta.surface
            }
          >
            {/* SVG sized via parent */}
            <span className={dim.svg + " " + meta.fg}>{meta.glyph}</span>
          </span>
        )}
      </span>
    </Tooltip>
  );
}

function VerifiedChip({ size }: { size: TrustSize }) {
  const dim = VERIFIED_SIZE[size];
  return (
    <svg viewBox="0 0 24 24" className={dim + " shrink-0 text-sky-500"}>
      <path
        fill="currentColor"
        d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.108 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.71 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.108 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"
      />
      <path
        fill="#fff"
        d="m9.72 15.95 5.99-6.32a.99.99 0 0 0-.04-1.41 1.005 1.005 0 0 0-1.42.04l-5.27 5.56-2-2.08a1.001 1.001 0 0 0-1.44 1.39l2.73 2.83a1 1 0 0 0 .72.31c.25 0 .51-.1.7-.3z"
      />
    </svg>
  );
}

const VERIFIED_SIZE: Record<TrustSize, string> = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
};

function GradeChip({
  badge,
  size,
}: {
  badge: Extract<TrustBadge, { key: "grade" }>;
  size: TrustSize;
}) {
  const dim = SIZES[size];
  // Cards graded 9.5+ get the gold treatment; lower grades read silver
  const gold = badge.grade >= 9.5;
  return (
    <span
      className={
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 font-mono font-extrabold tabular-nums leading-none " +
        dim.gradePad + " " +
        (gold
          ? "border-amber-500/60 bg-gradient-to-br from-amber-200 to-amber-400 text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
          : "border-slate-400/60 bg-gradient-to-br from-slate-100 to-slate-300 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]")
      }
    >
      <span className="text-[0.55em] uppercase tracking-widest opacity-80">{badge.grader}</span>
      <span>{Number.isInteger(badge.grade) ? badge.grade : badge.grade.toFixed(1)}</span>
    </span>
  );
}

function OverflowChip({ overflow, size }: { overflow: TrustBadge[]; size: TrustSize }) {
  const dim = SIZES[size];
  return (
    <Tooltip
      title="Lebih banyak badge"
      body={
        <ul className="flex flex-col gap-1.5">
          {overflow.map((b, i) => (
            <li key={badgeId(b) + i} className="flex items-center gap-2">
              <span className="grid h-4 w-4 shrink-0 place-items-center text-[10px]">
                {META[b.key].glyph}
              </span>
              <span>{renderTitle(b)}</span>
            </li>
          ))}
        </ul>
      }
    >
      <span
        className={
          "inline-flex shrink-0 items-center justify-center rounded-full border bg-fg/[0.06] font-mono text-[10px] font-bold text-fg-muted " +
          dim.icon
        }
        aria-label={`${overflow.length} badge lainnya`}
      >
        +{overflow.length}
      </span>
    </Tooltip>
  );
}

/* =============================================================== tooltip */

function Tooltip({
  title,
  body,
  children,
}: {
  title: string;
  body: React.ReactNode;
  children: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  // Click-outside: tap to dismiss when toggled open on touch
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        tabIndex={0}
        onClick={(e) => {
          // Don't bubble into a parent <Link>; just toggle the tip
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1 rounded-full"
      >
        {children}
      </button>
      {open && (
        <span
          role="tooltip"
          className=" pointer-events-none absolute left-1/2 top-full z-40 mt-2 w-max max-w-[220px]
            -translate-x-1/2 rounded-lg bg-fg px-3 py-2 text-left text-xs
            text-canvas shadow-[0_12px_32px_-8px_rgba(0,0,0,0.4)]"
        >
          <span aria-hidden className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-fg" />
          <span className="block font-semibold">{title}</span>
          <span className="mt-0.5 block leading-snug opacity-80">{body}</span>
        </span>
      )}
    </span>
  );
}

/* =============================================================== meta */

const SIZES: Record<TrustSize, { icon: string; svg: string; gradePad: string }> = {
  xs: { icon: "h-4  w-4  ", svg: "h-2.5 w-2.5", gradePad: "h-4   text-[9px]" },
  sm: { icon: "h-5  w-5  ", svg: "h-3   w-3  ", gradePad: "h-5   text-[10px]" },
  md: { icon: "h-6  w-6  ", svg: "h-3.5 w-3.5", gradePad: "h-6   text-[11px]" },
};

const META: Record<TrustBadgeKey, {
  surface: string;
  fg: string;
  glyph: React.ReactNode;
  body: string;
}> = {
  verified: {
    surface: "border-sky-500/40 bg-sky-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
    fg:      "text-white",
    glyph: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
        <path d="M5 12l5 5L20 7" />
      </svg>
    ),
    body: "Penjual sudah lolos verifikasi KTP & data bank.",
  },
  authenticated: {
    surface: "border-sky-500/40 bg-sky-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
    fg:      "text-white",
    glyph: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" />
      </svg>
    ),
    body: "Tim Hoobiq sudah memeriksa & memvalidasi keaslian item ini.",
  },
  grade: {
    surface: "",
    fg:      "",
    glyph:   null,
    body:    "Grade resmi dari PSA / BGS / CGC. Tap untuk detail.",
  },
  fast_shipper: {
    surface: "border-orange-500/40 bg-orange-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
    fg:      "text-white",
    glyph: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
      </svg>
    ),
    body: "Rata-rata kirim < 24 jam setelah pesanan dibayar.",
  },
  top_trader: {
    surface: "border-amber-500/40 bg-gradient-to-br from-amber-300 to-amber-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
    fg:      "text-amber-950",
    glyph: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M12 2l2.9 6 6.6.6-5 4.5 1.5 6.5L12 16.8 5.9 19.6 7.5 13l-5-4.5L9.1 8z" />
      </svg>
    ),
    body: "Reputasi tinggi — rating ≥ 4.8 dengan banyak trade selesai.",
  },
};

function renderTitle(b: TrustBadge): string {
  switch (b.key) {
    case "verified":      return "Verified Seller";
    case "authenticated": return "Authenticated by Hoobiq";
    case "grade":         return `${b.grader} ${Number.isInteger(b.grade) ? b.grade : b.grade.toFixed(1)}`;
    case "fast_shipper":  return b.hours ? `Fast Shipper · < ${b.hours}j` : "Fast Shipper";
    case "top_trader":    return "Top Trader";
  }
}

function renderAria(b: TrustBadge): string {
  if (b.key === "grade") return `${b.grader} grade ${b.grade}`;
  return renderTitle(b);
}

function badgeId(b: TrustBadge): string {
  return b.key === "grade" ? `grade-${b.grader}-${b.grade}` : b.key;
}

