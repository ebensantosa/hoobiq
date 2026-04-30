"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

export type HaulItem = {
  id: string;
  /** mp4/webm url; if null we render the poster as a static "story" */
  videoUrl: string | null;
  posterUrl: string;
  caption?: string | null;
  /** Currently broadcasting live */
  live?: boolean;
  durationMs?: number;
  seller: {
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
  /** Optional listing to surface "Beli juga" CTA */
  listing?: {
    id: string;
    slug: string;
    title: string;
    priceIdr: number;
  } | null;
};

const REACTIONS = [
  { key: "fire",   emoji: "🔥", label: "Hype"     },
  { key: "heart",  emoji: "❤️", label: "Suka"     },
  { key: "gem",    emoji: "💎", label: "Grail"    },
  { key: "shock",  emoji: "😱", label: "Gokil"    },
  { key: "star",   emoji: "⭐", label: "Pull GG"  },
] as const;

const fmtPrice = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export function HaulReel({ items }: { items: HaulItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <>
      <section
        aria-label="Haul Reel — pull & unboxing terbaru"
        className="-mx-6 lg:-mx-10"
      >
        <div className="flex items-end justify-between px-6 pb-3 lg:px-10">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-fg">
              Haul reel
            </h2>
            <p className="text-xs text-fg-muted">
              Pull & unboxing real-time dari kolektor
            </p>
          </div>
          <span className="font-mono text-[11px] text-fg-subtle">
            {items.length} pull
          </span>
        </div>

        <div
          className=" flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-3 lg:px-10
            [scrollbar-width:none] [-ms-overflow-style:none]
            [&::-webkit-scrollbar]:hidden"
        >
          {items.map((it, i) => (
            <ReelThumb key={it.id} item={it} onOpen={() => setOpenIdx(i)} />
          ))}
        </div>
      </section>

      {openIdx !== null && (
        <ReelPlayer
          items={items}
          startIndex={openIdx}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </>
  );
}

/* ---------------------------------------------------------------- thumb */

function ReelThumb({ item, onOpen }: { item: HaulItem; onOpen: () => void }) {
  const initial = (item.seller.name ?? item.seller.username)[0]?.toUpperCase() ?? "?";

  return (
    <button
      type="button"
      onClick={onOpen}
      className=" group relative flex shrink-0 snap-start flex-col items-center gap-1.5
        focus:outline-none"
    >
      {/* Animated gradient ring — uses padding trick so inner avatar stays a perfect circle */}
      <span
        className=" relative grid h-[68px] w-[68px] place-items-center rounded-full p-[3px]
          bg-[conic-gradient(from_var(--ring-angle,0deg),#EC4899_0%,#FF6B1A_25%,#A855F7_55%,#EC4899_100%)]
          transition-transform duration-200 group-hover:scale-105 group-active:scale-95
          shadow-[0_4px_16px_-4px_rgba(231,85,159,0.55)]
          [animation:reel-ring_4s_linear_infinite]"
      >
        <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-canvas">
          {item.posterUrl ? (
            // Plain img — Next/Image not needed for 60px and avoids next.config domain churn
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.posterUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              draggable={false}
            />
          ) : (
            <span className="text-base font-bold text-fg-muted">{initial}</span>
          )}
        </span>

        {item.live && (
          <span
            className=" absolute -bottom-1 left-1/2 -translate-x-1/2
              rounded-md bg-flame-500 px-1.5 py-0.5
              text-[9px] font-extrabold uppercase tracking-widest text-white
              shadow-[0_2px_6px_rgba(231,85,159,0.6)]
              [animation:reel-pulse_1.4s_ease-in-out_infinite]"
          >
            ● Live
          </span>
        )}
      </span>

      <span className="max-w-[72px] truncate text-[11px] font-medium text-fg-muted">
        @{item.seller.username}
      </span>

    </button>
  );
}

/* --------------------------------------------------------------- player */

const STORY_DURATION_MS = 6000;

function ReelPlayer({
  items,
  startIndex,
  onClose,
}: {
  items: HaulItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0); // 0..1 of current item
  const [paused, setPaused] = useState(false);
  const [floats, setFloats] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const elapsedBeforePauseRef = useRef<number>(0);

  const item = items[idx];
  const total = item?.live ? Infinity : (item?.durationMs ?? STORY_DURATION_MS);

  /* lock body scroll while open */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* keyboard nav */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  /* progress driver — RAF for image stories, video.timeupdate for videos */
  useEffect(() => {
    setProgress(0);
    elapsedBeforePauseRef.current = 0;
    startedAtRef.current = performance.now();

    const v = videoRef.current;
    if (v && item?.videoUrl) {
      v.currentTime = 0;
      v.play().catch(() => {});
      const onTime = () => {
        if (!v.duration || isNaN(v.duration)) return;
        setProgress(v.currentTime / v.duration);
      };
      const onEnd = () => goNext();
      v.addEventListener("timeupdate", onTime);
      v.addEventListener("ended", onEnd);
      return () => {
        v.removeEventListener("timeupdate", onTime);
        v.removeEventListener("ended", onEnd);
      };
    }

    if (item?.live) return; // live = indeterminate, no auto-advance

    const tick = (t: number) => {
      if (paused) {
        startedAtRef.current = t - elapsedBeforePauseRef.current;
      } else {
        const elapsed = t - startedAtRef.current;
        elapsedBeforePauseRef.current = elapsed;
        const p = Math.min(1, elapsed / (total as number));
        setProgress(p);
        if (p >= 1) {
          goNext();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, paused]);

  /* pause sync to <video> */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) v.pause();
    else v.play().catch(() => {});
  }, [paused]);

  const goNext = useCallback(() => {
    setIdx((i) => {
      if (i >= items.length - 1) {
        onClose();
        return i;
      }
      return i + 1;
    });
  }, [items.length, onClose]);

  const goPrev = useCallback(() => {
    setIdx((i) => Math.max(0, i - 1));
  }, []);

  const fireReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    const x = 30 + Math.random() * 40; // % across reaction tray
    setFloats((f) => [...f, { id, emoji, x }]);
    setTimeout(() => {
      setFloats((f) => f.filter((p) => p.id !== id));
    }, 1400);
  };

  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Haul reel player"
      className="fixed inset-0 z-[60] grid place-items-center bg-black/90 backdrop-blur"
    >
      {/* Tap-zones for prev/next, Stories-style */}
      <button
        type="button"
        aria-label="Sebelumnya"
        onClick={goPrev}
        className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-default"
      />
      <button
        type="button"
        aria-label="Berikutnya"
        onClick={goNext}
        className="absolute inset-y-0 right-0 z-10 w-1/3 cursor-default"
      />

      {/* Frame */}
      <div
        className=" relative flex h-[100dvh] max-h-[100dvh] w-full max-w-[420px] flex-col
          overflow-hidden bg-black
          md:h-[92vh] md:rounded-3xl md:shadow-[0_30px_120px_-20px_rgba(231,85,159,0.5)]"
      >
        {/* Progress bars */}
        <div className="absolute inset-x-3 top-3 z-20 flex gap-1">
          {items.map((_, i) => {
            const pct =
              i < idx ? 100 : i === idx ? Math.round(progress * 100) : 0;
            return (
              <div
                key={i}
                className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25"
              >
                <div
                  className={item.live && i === idx ? "h-full w-full bg-flame-500" : "h-full bg-white"}
                  style={{
                    width: item.live && i === idx ? "100%" : `${pct}%`,
                    transition: i === idx && !item.live ? "none" : "width 200ms",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Top bar */}
        <div className="absolute inset-x-0 top-7 z-20 flex items-center justify-between px-4 pt-2">
          <Link
            href={`/u/${item.seller.username}`}
            className="flex items-center gap-2 rounded-full bg-black/30 px-2 py-1 text-white backdrop-blur-sm"
          >
            <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-white/20 text-xs font-bold">
              {item.seller.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.seller.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                (item.seller.name ?? item.seller.username)[0]?.toUpperCase()
              )}
            </span>
            <span className="text-sm font-semibold">@{item.seller.username}</span>
            {item.live && (
              <span className="rounded-md bg-flame-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-white">
                ● Live
              </span>
            )}
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Putar" : "Jeda"}
              className="grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
            >
              {paused ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Media */}
        <div className="relative flex-1">
          {item.videoUrl ? (
            <video
              ref={videoRef}
              src={item.videoUrl}
              poster={item.posterUrl}
              playsInline
              autoPlay
              muted={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.posterUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          {/* gradient veils for legibility */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/80 to-transparent" />

          {item.caption && (
            <p className="absolute inset-x-4 bottom-[156px] z-10 text-sm font-medium leading-snug text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              {item.caption}
            </p>
          )}
        </div>

        {/* Reactions floating layer */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[120px] z-20 h-32 overflow-hidden">
          {floats.map((f) => (
            <span
              key={f.id}
              className="absolute bottom-0 text-2xl"
              style={{
                left: `${f.x}%`,
                animation: "reel-float 1.4s ease-out forwards",
              }}
            >
              {f.emoji}
            </span>
          ))}
        </div>

        {/* Bottom bar — reactions + Beli juga */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 px-4 pb-5 pt-3">
          <div className="flex items-center justify-between gap-2">
            {REACTIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => fireReaction(r.emoji)}
                aria-label={r.label}
                className=" grid h-11 w-11 place-items-center rounded-full
                  bg-white/10 text-2xl backdrop-blur-md
                  transition-transform duration-150 hover:scale-110 active:scale-95
                  hover:bg-white/20"
              >
                {r.emoji}
              </button>
            ))}
          </div>

          {item.listing ? (
            <Link
              href={`/listing/${item.listing.slug}`}
              className=" flex items-center justify-between gap-3 rounded-2xl
                bg-gradient-to-r from-brand-500 via-flame-500 to-brand-500
                bg-[length:200%_100%] px-4 py-3
                font-semibold text-white shadow-[0_8px_24px_-6px_rgba(231,85,159,0.8)]
                [animation:reel-shimmer_3s_linear_infinite]
                hover:opacity-95"
            >
              <span className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-widest text-white/85">
                  Beli juga
                </span>
                <span className="line-clamp-1 text-sm">{item.listing.title}</span>
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap text-sm font-bold">
                {fmtPrice(item.listing.priceIdr)}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          ) : (
            <Link
              href={`/u/${item.seller.username}`}
              className=" flex items-center justify-center gap-2 rounded-2xl
                bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-md
                hover:bg-white/20"
            >
              Lihat profil {item.seller.name ?? `@${item.seller.username}`}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </div>

    </div>
  );
}
