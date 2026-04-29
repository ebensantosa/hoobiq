"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api/client";

/* ============================================================== types */

import type { Condition } from "@hoobiq/types";
const CONDITIONS: { key: Condition; label: string; sub: string }[] = [
  { key: "BRAND_NEW_SEALED", label: "Brand New", sub: "Sealed / segel" },
  { key: "LIKE_NEW",         label: "Like New",  sub: "Mulus, hampir baru" },
  { key: "EXCELLENT",        label: "Excellent", sub: "Bekas terawat" },
  { key: "GOOD",             label: "Good",      sub: "Bekas wajar" },
  { key: "FAIR",             label: "Fair",      sub: "Ada minor cacat" },
  { key: "POOR",             label: "Poor",      sub: "Cacat jelas / box only" },
];

type Grade = "PSA10" | "PSA9" | "PSA8" | "BGS" | "UNGRADED";
const GRADES: { key: Grade; label: string; sub: string }[] = [
  { key: "PSA10",    label: "PSA 10",   sub: "Gem Mint" },
  { key: "PSA9",     label: "PSA 9",    sub: "Mint" },
  { key: "PSA8",     label: "PSA 8",    sub: "Near Mint" },
  { key: "BGS",      label: "BGS",      sub: "Beckett" },
  { key: "UNGRADED", label: "Ungraded", sub: "Belum dinilai" },
];

const SORT_OPTIONS = [
  { key: "newest",     label: "Terbaru" },
  { key: "price_asc",  label: "Harga ↑" },
  { key: "price_desc", label: "Harga ↓" },
];

type Category = { slug: string; name: string; level: number; children?: Category[] };
type Histogram = {
  buckets: Array<{ low: number; high: number; count: number }>;
  minIdr: number;
  maxIdr: number;
  total: number;
};
type Facets = { histogram: Histogram; cities: Array<{ city: string; count: number }> };

const fmtIdr = (n: number): string => {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}jt`;
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
};

/* ============================================================== component */

/**
 * Horizontal filter bar — replaces the old left-rail panel. Each filter
 * collapses to a pill that opens a popover on click. Tighter footprint,
 * full screen for the listing grid.
 */
export function MarketplaceFilterBar({
  resultCount,
  series,
}: {
  resultCount: number;
  series: Category[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const cat       = sp.get("cat") ?? "";
  // Multi-select: `cats` is comma-separated slugs that the API resolves to
  // a union of descendant categories. Empty array = no filter.
  const catsParam = sp.get("cats") ?? "";
  const cats      = catsParam ? catsParam.split(",").filter(Boolean) : [];
  const minPrice  = numOrNull(sp.get("minPrice"));
  const maxPrice  = numOrNull(sp.get("maxPrice"));
  const condition = (sp.get("condition") as Condition | null) ?? null;
  const grade     = (sp.get("grade") as Grade | null) ?? null;
  const city      = sp.get("city") ?? "";
  const distance  = Number(sp.get("distance") ?? "0");
  const sort      = sp.get("sort") ?? "newest";
  const qParam    = sp.get("q") ?? "";

  /* Facets — only re-fetch when category/q changes */
  const [facets, setFacets] = useState<Facets | null>(null);
  useEffect(() => {
    const params = new URLSearchParams();
    if (cat)    params.set("categorySlug", cat);
    if (qParam) params.set("q", qParam);
    let cancelled = false;
    api<Facets>(`/listings/facets/all?${params.toString()}`)
      .then((f) => { if (!cancelled) setFacets(f); })
      .catch(() => { if (!cancelled) setFacets(null); });
    return () => { cancelled = true; };
  }, [cat, qParam]);

  const histMin = facets?.histogram.minIdr ?? 0;
  const histMax = facets?.histogram.maxIdr ?? 5_000_000;
  const [lo, setLo] = useState<number>(minPrice ?? histMin);
  const [hi, setHi] = useState<number>(maxPrice ?? histMax);
  const lastBoundsRef = useRef({ histMin, histMax });
  useEffect(() => {
    const bounds = lastBoundsRef.current;
    if (bounds.histMin === histMin && bounds.histMax === histMax) return;
    lastBoundsRef.current = { histMin, histMax };
    setLo(minPrice ?? histMin);
    setHi(maxPrice ?? histMax);
  }, [histMin, histMax, minPrice, maxPrice]);

  const pushTimerRef = useRef<number | null>(null);
  function pushUrl(next: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      startTransition(() => router.replace(`/marketplace?${params.toString()}`, { scroll: false }));
    }, 180);
  }

  function pushPrice(loVal: number, hiVal: number) {
    pushUrl({
      minPrice: loVal > histMin ? String(loVal) : null,
      maxPrice: hiVal < histMax ? String(hiVal) : null,
    });
  }

  const isTcg = cat === "cards" || cat.startsWith("pokemon") || cat.includes("trading");

  /* Multi-level checkbox picker — supports the spec'd flow where buyers
   * tick across kategori + sub kategori + series simultaneously. The tree
   * comes from /categories already shaped as L1 → L2 → L3, so we just
   * render expandable groups. */
  const [seriesQ, setSeriesQ] = useState("");
  const seriesFlat = useMemo(() => flattenCats(series), [series]);
  const seriesFiltered = useMemo(() => {
    const q = seriesQ.trim().toLowerCase();
    if (!q) return null;
    return seriesFlat.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 24);
  }, [seriesFlat, seriesQ]);

  // Selected count combines the legacy single `cat` and the multi `cats`.
  const selectedSlugs = useMemo(() => {
    const set = new Set<string>(cats);
    if (cat) set.add(cat);
    return set;
  }, [cat, cats]);

  function toggleCat(slug: string) {
    const next = new Set(selectedSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    // Migrate everything onto the new `cats` param; clear `cat` to avoid
    // a stale single-value bleeding into the union.
    pushUrl({
      cats: next.size > 0 ? Array.from(next).join(",") : null,
      cat: null,
    });
  }

  const catLabel =
    selectedSlugs.size === 0 ? "Kategori"
    : selectedSlugs.size === 1
      ? (seriesFlat.find((s) => s.slug === Array.from(selectedSlugs)[0])?.name ?? "Kategori")
      : `Kategori · ${selectedSlugs.size}`;

  /* Active count */
  const activeCount =
    (minPrice !== null || maxPrice !== null ? 1 : 0) +
    (condition ? 1 : 0) +
    (grade ? 1 : 0) +
    (selectedSlugs.size > 0 ? 1 : 0) +
    (city ? 1 : 0) +
    (distance > 0 ? 1 : 0);

  const priceLabel =
    minPrice !== null || maxPrice !== null
      ? `${fmtIdr(lo)}–${fmtIdr(hi)}`
      : "Harga";

  const sortLabel = SORT_OPTIONS.find((s) => s.key === sort)?.label ?? "Terbaru";

  return (
    <div className="sticky top-20 z-20 -mx-6 mb-6 border-b border-rule bg-canvas/90 px-6 py-3 backdrop-blur-md lg:-mx-10 lg:px-10">
      <div className="flex flex-wrap items-center gap-2">
        {/* Result count + spinner */}
        <div className="mr-2 flex items-baseline gap-2">
          <span className="font-mono text-lg font-extrabold tabular-nums text-fg">
            {resultCount.toLocaleString("id-ID")}
          </span>
          <span className="text-xs text-fg-muted">listing</span>
          {pending && (
            <span className="ml-1 h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          )}
        </div>

        {/* Filter pills */}
        <Pill
          label={catLabel}
          active={selectedSlugs.size > 0}
          onClear={selectedSlugs.size > 0 ? () => pushUrl({ cats: null, cat: null }) : undefined}
        >
          <div className="w-80">
            <div className="border-b border-rule p-2">
              <input
                type="text"
                value={seriesQ}
                onChange={(e) => setSeriesQ(e.target.value)}
                placeholder="Cari kategori, anime, atau series…"
                className="w-full rounded-lg border border-rule bg-panel-2 px-3 py-1.5 text-xs text-fg placeholder:text-fg-subtle focus:border-brand-400 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-96 overflow-y-auto p-1">
              {seriesFiltered ? (
                seriesFiltered.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-fg-subtle">Tidak ada cocok.</p>
                ) : (
                  seriesFiltered.map((s) => (
                    <CheckboxRow
                      key={s.slug}
                      slug={s.slug}
                      name={s.name}
                      checked={selectedSlugs.has(s.slug)}
                      onToggle={() => toggleCat(s.slug)}
                      indent={0}
                    />
                  ))
                )
              ) : (
                <CategoryTree
                  nodes={series}
                  selectedSlugs={selectedSlugs}
                  onToggle={toggleCat}
                  level={0}
                />
              )}
            </div>
            {selectedSlugs.size > 0 && (
              <div className="flex items-center justify-between border-t border-rule px-3 py-2 text-[11px] text-fg-muted">
                <span>{selectedSlugs.size} dipilih</span>
                <button
                  type="button"
                  onClick={() => pushUrl({ cats: null, cat: null })}
                  className="font-medium text-brand-500"
                >
                  Reset kategori
                </button>
              </div>
            )}
          </div>
        </Pill>

        <Pill
          label={priceLabel}
          active={minPrice !== null || maxPrice !== null}
          onClear={(minPrice !== null || maxPrice !== null) ? () => pushPrice(histMin, histMax) : undefined}
        >
          <div className="w-80 p-4">
            <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle">
              Rentang harga
            </p>
            <PriceSlider
              min={histMin}
              max={histMax}
              lo={lo}
              hi={hi}
              histogram={facets?.histogram.buckets ?? []}
              onChange={(nLo, nHi) => {
                setLo(nLo);
                setHi(nHi);
                pushPrice(nLo, nHi);
              }}
            />
          </div>
        </Pill>

        <Pill
          label={condition ? CONDITIONS.find((c) => c.key === condition)?.label ?? "Kondisi" : "Kondisi"}
          active={!!condition}
          onClear={condition ? () => pushUrl({ condition: null }) : undefined}
        >
          <div className="w-72 p-2">
            {CONDITIONS.map((c) => {
              const active = condition === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => pushUrl({ condition: active ? null : c.key })}
                  className={
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors " +
                    (active
                      ? "bg-brand-400/10 font-semibold text-brand-500"
                      : "text-fg-muted hover:bg-panel-2 hover:text-fg")
                  }
                >
                  <span>
                    <span className="font-semibold">{c.label}</span>
                    <span className="ml-2 text-[10px] text-fg-subtle">{c.sub}</span>
                  </span>
                  {active && <span className="text-brand-500">✓</span>}
                </button>
              );
            })}
          </div>
        </Pill>

        {isTcg && (
          <Pill
            label={grade ? GRADES.find((g) => g.key === grade)?.label ?? "Grade" : "Grade"}
            active={!!grade}
            onClear={grade ? () => pushUrl({ grade: null }) : undefined}
            tone="amber"
          >
            <div className="w-64 p-2">
              {GRADES.map((g) => {
                const active = grade === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => pushUrl({ grade: active ? null : g.key })}
                    className={
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors " +
                      (active
                        ? "bg-amber-400/15 font-semibold text-amber-600"
                        : "text-fg-muted hover:bg-panel-2 hover:text-fg")
                    }
                  >
                    <span>
                      <span className="font-semibold">{g.label}</span>
                      <span className="ml-2 text-[10px] text-fg-subtle">{g.sub}</span>
                    </span>
                    {active && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          </Pill>
        )}

        <Pill
          label={city ? city : distance > 0 ? `${distance} km` : "Lokasi"}
          active={!!city || distance > 0}
          onClear={(city || distance > 0) ? () => pushUrl({ city: null, distance: null }) : undefined}
        >
          <div className="w-72 p-4">
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle">
              Radius
            </p>
            <DistanceSlider
              value={distance}
              onChange={(v) => pushUrl({ distance: v > 0 ? String(v) : null })}
            />
            {facets && facets.cities.length > 0 && (
              <>
                <p className="mb-2 mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle">
                  Kota
                </p>
                <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
                  {facets.cities.map((c) => {
                    const active = city === c.city;
                    return (
                      <button
                        key={c.city}
                        type="button"
                        onClick={() => pushUrl({ city: active ? null : c.city })}
                        className={
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors " +
                          (active
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-rule text-fg-muted hover:border-brand-300 hover:text-brand-500")
                        }
                      >
                        {c.city}
                        <span className={"font-mono text-[9px] " + (active ? "text-white/80" : "text-fg-subtle")}>
                          {c.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Pill>

        {/* Sort — separate group, doesn't count as filter */}
        <div className="ml-auto flex items-center gap-2">
          <Pill label={`Urutkan: ${sortLabel}`} compact>
            <div className="w-44 p-1.5">
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => pushUrl({ sort: s.key === "newest" ? null : s.key })}
                  className={
                    "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-xs transition-colors " +
                    (sort === s.key
                      ? "bg-brand-400/10 font-semibold text-brand-500"
                      : "text-fg-muted hover:bg-panel-2 hover:text-fg")
                  }
                >
                  {s.label}
                  {sort === s.key && <span>✓</span>}
                </button>
              ))}
            </div>
          </Pill>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => router.replace("/marketplace", { scroll: false })}
              className="rounded-full border border-rule px-3 py-1.5 text-xs font-semibold text-fg-muted transition-colors hover:border-flame-400/50 hover:text-flame-500"
            >
              Reset {activeCount}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================ Pill (popover) */

function Pill({
  label, active, onClear, tone = "brand", compact, children,
}: {
  label: string;
  active?: boolean;
  onClear?: () => void;
  tone?: "brand" | "amber";
  compact?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const activeStyle = tone === "amber"
    ? "border-amber-400 bg-amber-400/10 text-amber-700 dark:text-amber-300"
    : "border-brand-400 bg-brand-400/10 text-brand-500";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
          (compact ? "py-1 " : "") +
          (active
            ? activeStyle
            : "border-rule bg-panel text-fg-muted hover:border-brand-300 hover:text-fg")
        }
      >
        <span>{label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
        {onClear && (
          <span
            role="button"
            aria-label="Hapus filter"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="ml-1 grid h-4 w-4 cursor-pointer place-items-center rounded-full bg-current/15 text-[10px] hover:bg-current/30"
          >
            ×
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-full z-30 mt-2 origin-top-left animate-menu-pop overflow-hidden rounded-2xl border border-rule bg-panel shadow-xl ring-1 ring-black/5"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ============================================================ price slider */

function PriceSlider({
  min, max, lo, hi, histogram, onChange,
}: {
  min: number; max: number; lo: number; hi: number;
  histogram: Array<{ low: number; high: number; count: number }>;
  onChange: (lo: number, hi: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<"lo" | "hi" | null>(null);

  const span = Math.max(1, max - min);
  const loPct = ((lo - min) / span) * 100;
  const hiPct = ((hi - min) / span) * 100;
  const maxBucketCount = histogram.reduce((m, b) => Math.max(m, b.count), 1);

  function pointerToValue(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return lo;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(min + ratio * span);
  }

  function onPointerDown(handle: "lo" | "hi") {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(handle);
      (e.target as Element).setPointerCapture?.(e.pointerId);
    };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const v = pointerToValue(e.clientX);
    if (dragging === "lo") onChange(Math.min(v, hi - Math.max(1, Math.round(span * 0.01))), hi);
    else                   onChange(lo, Math.max(v, lo + Math.max(1, Math.round(span * 0.01))));
  }
  function onPointerUp() { setDragging(null); }

  return (
    <div className="select-none">
      <div className="flex h-12 items-end gap-[2px] px-1">
        {histogram.length === 0 ? (
          <div className="h-full w-full rounded bg-fg/[0.05]" />
        ) : (
          histogram.map((b, i) => {
            const inRange = b.high >= lo && b.low <= hi;
            const h = b.count > 0 ? Math.max(8, (b.count / maxBucketCount) * 100) : 4;
            return (
              <div
                key={i}
                title={`${fmtIdr(b.low)}–${fmtIdr(b.high)} · ${b.count}`}
                className={"flex-1 rounded-t-sm transition-colors " + (inRange ? "bg-brand-400" : "bg-fg/[0.12] dark:bg-white/10")}
                style={{ height: `${h}%` }}
              />
            );
          })
        )}
      </div>

      <div
        ref={trackRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative mt-1 h-6 touch-none"
      >
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-fg/[0.08] dark:bg-white/10" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand-500 to-flame-500"
          style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
        />
        <Handle pct={loPct} onPointerDown={onPointerDown("lo")} active={dragging === "lo"} label={`Min ${fmtIdr(lo)}`} />
        <Handle pct={hiPct} onPointerDown={onPointerDown("hi")} active={dragging === "hi"} label={`Max ${fmtIdr(hi)}`} />
      </div>

      <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-fg-muted">
        <span>{fmtIdr(lo)}</span>
        <span>{fmtIdr(hi)}</span>
      </div>
    </div>
  );
}

function Handle({
  pct, onPointerDown, active, label,
}: {
  pct: number;
  onPointerDown: (e: React.PointerEvent) => void;
  active: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      aria-label={label}
      className={
        "absolute top-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full border-2 bg-canvas shadow-[0_2px_6px_-1px_rgba(0,0,0,0.25)] transition-transform " +
        (active ? "scale-110 cursor-grabbing border-brand-500" : "border-brand-400 hover:scale-105")
      }
      style={{ left: `${pct}%` }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
    </button>
  );
}

/* ============================================================ distance */

const DISTANCE_STEPS = [0, 5, 10, 25, 50, 100, 250];

function DistanceSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const idx = Math.max(0, DISTANCE_STEPS.indexOf(value));
  const fillPct = (idx / Math.max(1, DISTANCE_STEPS.length - 1)) * 100;
  return (
    <div>
      <input
        type="range"
        min={0}
        max={DISTANCE_STEPS.length - 1}
        step={1}
        value={idx === -1 ? 0 : idx}
        onChange={(e) => onChange(DISTANCE_STEPS[Number(e.target.value)] ?? 0)}
        className="hbq-range w-full"
        style={{ ["--fill" as string]: `${fillPct}%` }}
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] text-fg-subtle">
        {DISTANCE_STEPS.map((s) => (
          <span key={s} className={s === value ? "font-bold text-brand-500" : ""}>
            {s === 0 ? "∞" : s}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ helpers */

/* ============================================================ category tree */

/**
 * Expandable checkbox tree. Each row is a category — clicking the
 * checkbox toggles ONLY that node's slug; clicking the chevron toggles
 * the children panel. Children render indented and follow the same
 * pattern recursively, so L1 → L2 → L3 all share one component.
 *
 * Per spec the buyer can tick boxes at any level (e.g. Toys + Action
 * Figure + Naruto) — each ticked slug is independent and the API unions
 * their descendant ids on the server.
 */
function CategoryTree({
  nodes, selectedSlugs, onToggle, level,
}: {
  nodes: Category[];
  selectedSlugs: Set<string>;
  onToggle: (slug: string) => void;
  level: number;
}) {
  return (
    <>
      {nodes.map((n) => (
        <CategoryNode
          key={n.slug}
          node={n}
          selectedSlugs={selectedSlugs}
          onToggle={onToggle}
          level={level}
        />
      ))}
    </>
  );
}

function CategoryNode({
  node, selectedSlugs, onToggle, level,
}: {
  node: Category;
  selectedSlugs: Set<string>;
  onToggle: (slug: string) => void;
  level: number;
}) {
  // Auto-expand level-1 by default, collapse deeper. The buyer can still
  // click the chevron to toggle.
  const [open, setOpen] = useState(level === 0);
  const hasKids = !!node.children?.length;

  return (
    <>
      <div className="flex items-stretch">
        {hasKids ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Tutup" : "Buka"}
            className="grid w-6 shrink-0 place-items-center text-fg-subtle hover:text-fg"
            style={{ marginLeft: level * 12 }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={open ? "rotate-90 transition-transform" : "transition-transform"}>
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        ) : (
          <span className="w-6 shrink-0" style={{ marginLeft: level * 12 }} />
        )}
        <CheckboxRow
          slug={node.slug}
          name={node.name}
          checked={selectedSlugs.has(node.slug)}
          onToggle={() => onToggle(node.slug)}
          indent={0}
          flush
        />
      </div>
      {hasKids && open && (
        <CategoryTree
          nodes={node.children ?? []}
          selectedSlugs={selectedSlugs}
          onToggle={onToggle}
          level={level + 1}
        />
      )}
    </>
  );
}

function CheckboxRow({
  slug, name, checked, onToggle, indent, flush,
}: {
  slug: string;
  name: string;
  checked: boolean;
  onToggle: () => void;
  indent: number;
  flush?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors " +
        (checked
          ? "bg-brand-400/10 font-semibold text-brand-500"
          : "text-fg-muted hover:bg-panel-2 hover:text-fg") +
        (flush ? "" : " ml-0")
      }
      style={flush ? undefined : { marginLeft: indent }}
    >
      <span
        aria-hidden
        className={
          "grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border transition-colors " +
          (checked ? "border-brand-500 bg-brand-500 text-white" : "border-rule bg-panel")
        }
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      <BrandGlyph slug={slug} />
      <span className="flex-1 truncate">{name}</span>
    </button>
  );
}

function BrandGlyph({ slug }: { slug: string }) {
  const letter = slug.replace(/[^a-z]/gi, "")[0]?.toUpperCase() ?? "·";
  return (
    <span
      aria-hidden
      className="grid h-4 w-4 shrink-0 place-items-center rounded-[4px] bg-gradient-to-br from-brand-500 to-flame-500 font-mono text-[9px] font-extrabold text-white"
    >
      {letter}
    </span>
  );
}

function flattenCats(cats: Category[], out: { slug: string; name: string }[] = []): { slug: string; name: string }[] {
  for (const c of cats) {
    out.push({ slug: c.slug, name: c.name });
    if (c.children?.length) flattenCats(c.children, out);
  }
  return out;
}

function numOrNull(s: string | null): number | null {
  if (s === null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
