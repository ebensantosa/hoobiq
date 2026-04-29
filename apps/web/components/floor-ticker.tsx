"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

export type FloorPill = {
  slug: string;
  name: string;
  floorIdr: number;
  /** decimal — 0.024 = +2.4% */
  change24h: number;
  listings: number;
};

const fmtIdr = (n: number): string => {
  // Compact form for the ticker — full price would be too long for a pill
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}jt`;
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
};

const fmtPct = (x: number): string => {
  const v = Math.abs(x * 100);
  const s = v >= 10 ? v.toFixed(0) : v.toFixed(1);
  return `${x >= 0 ? "+" : "−"}${s}%`;
};

/**
 * Floor-price ticker. Initial snapshot comes from the parent (server-rendered),
 * live updates arrive over Socket.IO on `floor:update`. Horizontal scroll on
 * mobile, full row on desktop. Deliberately understated — no flashing or
 * marquee animation.
 */
export function FloorTicker({ initial }: { initial: FloorPill[] }) {
  const [pills, setPills] = useState<FloorPill[]>(initial);

  useEffect(() => {
    const socket = getSocket();
    const onUpdate = (msg: { pills: FloorPill[] }) => {
      if (Array.isArray(msg?.pills)) setPills(msg.pills);
    };
    socket.on("floor:update", onUpdate);
    return () => {
      socket.off("floor:update", onUpdate);
    };
  }, []);

  if (pills.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Floor price ticker"
      className=" sticky top-20 z-30 border-b border-rule
        bg-canvas/80 backdrop-blur-md"
    >
      <div
        className=" mx-auto flex max-w-[1440px] items-stretch gap-1.5 overflow-x-auto
          px-3 py-2 lg:px-6
          [scrollbar-width:none] [-ms-overflow-style:none]
          [&::-webkit-scrollbar]:hidden"
      >
        <span
          className=" sticky left-0 grid shrink-0 place-items-center
            rounded-lg bg-fg/[0.04] px-2.5 font-mono text-[10px] font-bold
            uppercase tracking-[0.18em] text-fg-subtle"
          aria-hidden
        >
          Floor
        </span>
        {pills.map((p) => (
          <Pill key={p.slug} pill={p} />
        ))}
      </div>
    </div>
  );
}

function Pill({ pill }: { pill: FloorPill }) {
  const up = pill.change24h > 0;
  const flat = pill.change24h === 0;
  const prevPriceRef = useRef(pill.floorIdr);

  // Subtle price-blink when the value actually changes — single ~600ms flash,
  // not a continuous animation. Kept very low contrast to feel calm.
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    const prev = prevPriceRef.current;
    if (prev !== pill.floorIdr) {
      setFlash(pill.floorIdr > prev ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 600);
      prevPriceRef.current = pill.floorIdr;
      return () => clearTimeout(t);
    }
  }, [pill.floorIdr]);

  return (
    <Link
      href={`/kategori/${pill.slug}`}
      className={
        "group flex shrink-0 items-center gap-2 rounded-lg border border-rule bg-panel " +
        "px-3 py-1.5 text-sm transition-colors hover:border-brand-300 hover:bg-panel-2 " +
        (flash === "up"   ? "ring-1 ring-emerald-400/40 " : "") +
        (flash === "down" ? "ring-1 ring-rose-400/40 "    : "")
      }
      title={`${pill.name} — ${pill.listings.toLocaleString("id-ID")} listing aktif`}
    >
      <span className="max-w-[120px] truncate font-medium text-fg">{pill.name}</span>
      <span className="font-mono text-[13px] font-semibold tabular-nums text-fg">
        {fmtIdr(pill.floorIdr)}
      </span>
      <span
        className={
          "flex items-center gap-0.5 font-mono text-[11px] font-bold tabular-nums " +
          (flat
            ? "text-fg-subtle"
            : up
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400")
        }
        aria-label={`Perubahan 24 jam ${fmtPct(pill.change24h)}`}
      >
        {!flat && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="currentColor"
            aria-hidden
            className={up ? "" : "rotate-180"}
          >
            <path d="M5 1.5 9 7H1z" />
          </svg>
        )}
        {flat ? "—" : fmtPct(pill.change24h)}
      </span>
    </Link>
  );
}
