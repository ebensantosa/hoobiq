"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type { DropSummary } from "./drop-hero";

const MONTH_LABELS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const fmtIdr = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

/**
 * Monthly grid of drops. Tap a date to focus that day's drops in the right
 * panel. Uses local-time bucketing — drops are listed under the day they
 * land in the user's timezone, not UTC.
 */
export function DropCalendar({
  year,
  month,
  items,
}: {
  year: number;
  month: number; // 1..12
  items: DropSummary[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Group drops by local-day key (YYYY-MM-DD).
  const byDay = useMemo(() => {
    const map = new Map<string, DropSummary[]>();
    for (const d of items) {
      const key = localDayKey(new Date(d.dropsAt));
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    return map;
  }, [items]);

  // Default focus to today if it falls in this month, otherwise the first
  // day with a drop, otherwise day 1.
  const todayKey = localDayKey(new Date());
  const initialDay = (() => {
    const todayY = new Date().getFullYear();
    const todayM = new Date().getMonth() + 1;
    if (todayY === year && todayM === month) return todayKey;
    const firstWithDrop = [...byDay.keys()].sort()[0];
    return firstWithDrop ?? `${year}-${String(month).padStart(2, "0")}-01`;
  })();
  const [selected, setSelected] = useState(initialDay);
  const selectedDrops = byDay.get(selected) ?? [];

  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);

  function navMonth(delta: number) {
    let y = year;
    let m = month + delta;
    while (m < 1)  { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }
    const ym = `${y}-${String(m).padStart(2, "0")}`;
    startTransition(() => router.push(`/drops?ym=${ym}`));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* ------------ Calendar grid ------------ */}
      <div className="rounded-2xl border border-rule bg-panel p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navMonth(-1)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-rule text-fg-muted hover:bg-panel-2"
            aria-label="Bulan sebelumnya"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h2 className="text-lg font-bold text-fg">
            {MONTH_LABELS[month - 1]} {year}
          </h2>
          <button
            type="button"
            onClick={() => navMonth(1)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-rule text-fg-muted hover:bg-panel-2"
            aria-label="Bulan berikutnya"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-fg-subtle">
          {DAY_LABELS.map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        <div className={"grid grid-cols-7 gap-1 " + (pending ? "opacity-50" : "")}>
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} className="aspect-square rounded-lg bg-transparent" />;

            const dayKey = `${year}-${String(month).padStart(2, "0")}-${String(cell).padStart(2, "0")}`;
            const dayDrops = byDay.get(dayKey) ?? [];
            const isSelected = dayKey === selected;
            const isToday = dayKey === todayKey;
            const hasDrop = dayDrops.length > 0;
            const live = dayDrops.some((d) => d.status === "live");

            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(dayKey)}
                className={
                  "relative flex aspect-square flex-col items-center justify-start gap-1 rounded-lg border p-1.5 text-sm transition-all " +
                  (isSelected
                    ? "border-brand-500 bg-brand-50 text-fg shadow-[0_4px_16px_-6px_rgba(231,85,159,0.4)] dark:bg-brand-500/10 "
                    : "border-rule hover:border-brand-300 hover:bg-panel-2 ") +
                  (hasDrop ? "font-bold " : "text-fg-muted ")
                }
                aria-label={`${cell} ${MONTH_LABELS[month - 1]}${hasDrop ? ` — ${dayDrops.length} drop` : ""}`}
              >
                <span className={"font-mono " + (isToday ? "text-brand-500" : "")}>{cell}</span>
                {hasDrop && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-0.5">
                    <span
                      className={
                        "h-1.5 w-1.5 rounded-full " +
                        (live ? "bg-flame-500 [animation:cal-pulse_1.4s_ease-in-out_infinite]" : "bg-brand-500")
                      }
                    />
                    {dayDrops.length > 1 && (
                      <span className="font-mono text-[9px] font-bold text-fg-subtle">
                        {dayDrops.length}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-4 flex items-center gap-4 text-[11px] text-fg-subtle">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Terjadwal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-flame-500" /> Live
          </span>
        </p>
      </div>

      {/* ------------ Day detail panel ------------ */}
      <div className="rounded-2xl border border-rule bg-panel p-4 md:p-6">
        <div className="mb-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-fg-subtle">
            Detail tanggal
          </p>
          <p className="mt-1 text-base font-bold text-fg">
            {formatLongDate(selected)}
          </p>
        </div>

        {selectedDrops.length === 0 ? (
          <div className="rounded-xl border border-dashed border-rule p-6 text-center">
            <p className="text-sm font-medium text-fg">Tidak ada drop hari ini</p>
            <p className="mt-1 text-xs text-fg-muted">
              Coba pilih tanggal lain yang ada penanda warna.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {selectedDrops.map((d) => (
              <DropRow key={d.id} drop={d} />
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}

function DropRow({ drop }: { drop: DropSummary }) {
  const [reminded, setReminded] = useState(drop.reminded);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !reminded;
    setReminded(next);
    try {
      await api(`/drops/${drop.id}/remind`, { method: next ? "POST" : "DELETE" });
    } catch {
      setReminded(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex gap-3 rounded-xl border border-rule bg-canvas p-3">
      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-100 to-flame-100 dark:from-brand-500/20 dark:to-flame-500/20">
        {drop.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={drop.heroImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-mono text-xl font-bold text-brand-500">
            {drop.brand[0]?.toUpperCase()}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-brand-500">
            {drop.brand}
          </span>
          {drop.status === "live" && (
            <span className="rounded-md bg-flame-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
              ● Live
            </span>
          )}
          {drop.status === "sold_out" && (
            <span className="rounded-md bg-fg/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-fg-muted">
              Sold out
            </span>
          )}
        </div>
        <Link href={`/drops/${drop.slug}`} className="line-clamp-1 text-sm font-bold text-fg hover:text-brand-500">
          {drop.productName}
        </Link>
        <p className="mt-0.5 text-xs text-fg-muted">
          <span className="font-mono">{fmtTime(drop.dropsAt)}</span>
          {" · stok "}
          <span className="font-mono">{drop.supplyQty.toLocaleString("id-ID")}</span>
          {drop.priceIdr != null && <> · <span className="font-mono">{fmtIdr(drop.priceIdr)}</span></>}
        </p>
      </div>

      {drop.status === "scheduled" && (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-pressed={reminded}
          className={
            "shrink-0 self-center rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors " +
            (reminded
              ? "bg-brand-500 text-white hover:bg-brand-400"
              : "border border-rule text-fg-muted hover:border-brand-300 hover:text-brand-500")
          }
        >
          {reminded ? "✓ Reminder" : "Reminder"}
        </button>
      )}
    </li>
  );
}

/* ---------------------------------------------------------------- helpers */

function buildMonthCells(year: number, month: number): (number | null)[] {
  // First weekday (Sun=0), then days in month
  const first = new Date(year, month - 1, 1).getDay();
  const days  = new Date(year, month, 0).getDate();
  const out: (number | null)[] = [];
  for (let i = 0; i < first; i++) out.push(null);
  for (let d = 1; d <= days; d++) out.push(d);
  while (out.length % 7 !== 0) out.push(null);
  return out;
}

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatLongDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
