"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

export type DropSummary = {
  id: string;
  slug: string;
  productName: string;
  brand: string;
  heroImageUrl: string | null;
  supplyQty: number;
  priceIdr: number | null;
  dropsAt: string;
  status: "scheduled" | "live" | "sold_out" | "cancelled";
  reminded: boolean;
};

const fmtIdr = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

/**
 * Dark gradient hero with live countdown to the next drop. Tick uses a
 * 1s interval — we recompute from `Date.now()` each tick so even if the
 * tab gets backgrounded the resume is correct.
 */
export function DropHero({ initial }: { initial: DropSummary[] }) {
  const [drops, setDrops] = useState(initial);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (drops.length === 0) return null;

  const next = drops[0]!;
  const dropMs = new Date(next.dropsAt).getTime();
  const remaining = Math.max(0, dropMs - now);
  const live = next.status === "live" || (remaining === 0 && next.status !== "cancelled");

  const days  = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const mins  = Math.floor((remaining % 3_600_000) / 60_000);
  const secs  = Math.floor((remaining % 60_000) / 1000);

  async function toggleRemind() {
    const wasReminded = next.reminded;
    setDrops((arr) => arr.map((d, i) => (i === 0 ? { ...d, reminded: !wasReminded } : d)));
    try {
      await api(`/drops/${next.id}/remind`, { method: wasReminded ? "DELETE" : "POST" });
    } catch {
      // revert on failure
      setDrops((arr) => arr.map((d, i) => (i === 0 ? { ...d, reminded: wasReminded } : d)));
    }
  }

  return (
    <section
      aria-label="Drop berikutnya"
      className=" relative overflow-hidden rounded-2xl
        bg-[radial-gradient(120%_120%_at_0%_0%,#3F1A4A_0%,#1A0B2E_45%,#0A0612_100%)]
        text-white shadow-[0_20px_60px_-20px_rgba(60,15,80,0.6)]"
    >
      {/* decorative blobs */}
      <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-flame-500/25 blur-3xl" />

      {/* poster */}
      {next.heroImageUrl && (
        <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={next.heroImageUrl}
            alt=""
            className="h-full w-full object-cover opacity-70"
          />
          <span className="absolute inset-0 bg-gradient-to-r from-[#1A0B2E] via-[#1A0B2E]/60 to-transparent" />
        </div>
      )}

      <div className="relative grid gap-6 p-6 md:grid-cols-[1.2fr_1fr] md:p-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/80 backdrop-blur">
              Drop berikutnya
            </span>
            {live ? (
              <span className="flex items-center gap-1.5 rounded-full bg-flame-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-white [animation:hero-blink_1.2s_ease-in-out_infinite]" />
                Live sekarang
              </span>
            ) : (
              <span className="rounded-full bg-brand-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-200">
                {next.brand}
              </span>
            )}
          </div>

          <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">
            {next.productName}
          </h2>

          <dl className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm text-white/70">
            <div className="flex items-baseline gap-1.5">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-white/50">Brand</dt>
              <dd className="font-medium text-white">{next.brand}</dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="font-mono text-[10px] uppercase tracking-widest text-white/50">Stok</dt>
              <dd className="font-mono font-medium text-white">{next.supplyQty.toLocaleString("id-ID")}</dd>
            </div>
            {next.priceIdr != null && (
              <div className="flex items-baseline gap-1.5">
                <dt className="font-mono text-[10px] uppercase tracking-widest text-white/50">Harga</dt>
                <dd className="font-mono font-medium text-white">{fmtIdr(next.priceIdr)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="flex flex-col gap-4">
          {/* countdown */}
          <div className="flex items-stretch gap-2">
            <Unit label="Hari"  value={days}  />
            <Unit label="Jam"   value={hours} />
            <Unit label="Menit" value={mins}  />
            <Unit label="Detik" value={secs}  />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {live ? (
              <Link
                href={`/drops/${next.slug}`}
                className=" inline-flex flex-1 items-center justify-center gap-2 rounded-xl
                  bg-flame-500 px-4 py-3 text-sm font-bold text-white
                  shadow-[0_8px_24px_-6px_rgba(250,167,74,0.7)] hover:bg-flame-400"
              >
                Buka sekarang
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <button
                type="button"
                onClick={toggleRemind}
                aria-pressed={next.reminded}
                className={
                  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors " +
                  (next.reminded
                    ? "bg-white text-[#1A0B2E] hover:bg-white/90"
                    : "bg-gradient-to-r from-brand-500 to-flame-500 text-white shadow-[0_8px_24px_-6px_rgba(231,85,159,0.7)] hover:opacity-95")
                }
              >
                {next.reminded ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                    Reminder aktif · 1 jam sebelum
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                    </svg>
                    Reminder
                  </>
                )}
              </button>
            )}
            <Link
              href="/drops"
              className=" inline-flex items-center justify-center rounded-xl
                bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur
                hover:bg-white/20"
            >
              Lihat kalender
            </Link>
          </div>
        </div>
      </div>

    </section>
  );
}

function Unit({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-xl bg-white/5 px-2 py-3 backdrop-blur">
      <span className="font-mono text-2xl font-extrabold tabular-nums leading-none md:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/55">
        {label}
      </span>
    </div>
  );
}

