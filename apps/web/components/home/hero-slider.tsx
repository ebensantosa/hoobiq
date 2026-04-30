"use client";
import * as React from "react";
import Link from "next/link";

/** Banner shape served by GET /banners (admin-managed in CMS). */
export type HeroBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  kicker: string | null;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
};

/**
 * Hero slider — auto-rotates through admin-managed banners every 6s.
 * Manual prev/next via the side arrows; dots at the bottom show how
 * many slides exist and let the buyer jump to any. Pauses while the
 * pointer is inside the panel so the buyer can read without it
 * sliding away mid-sentence.
 *
 * Falls back to a single static slide when the admin hasn't created
 * any banners yet — keeps the page from looking empty on day one.
 */
export function HeroSlider({ banners }: { banners: HeroBanner[] }) {
  const slides: HeroBanner[] = banners.length > 0 ? banners : [
    {
      id: "default",
      kicker: "FEATURED COLLECTION",
      title: "Lengkapi Koleksimu Temukan Harta Karunmu",
      subtitle: "Dari kartu langka hingga figure eksklusif, semua ada di Hoobiq.",
      ctaLabel: "Jelajahi Sekarang",
      ctaHref: "/marketplace",
      imageUrl: "",
    },
  ];

  const [idx, setIdx] = React.useState(0);
  const [hover, setHover] = React.useState(false);

  React.useEffect(() => {
    if (slides.length <= 1 || hover) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length, hover]);

  const prev = () => setIdx((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIdx((i) => (i + 1) % slides.length);
  const slide = slides[idx]!;

  return (
    <section
      className="relative mt-2 overflow-hidden rounded-2xl border border-rule bg-[#0e1525] text-white"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Background — admin's hero collage image with a subtle dark
          gradient overlay so the headline + CTA stay legible. */}
      {slide.imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e1525]/95 via-[#0e1525]/75 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0e1525] via-[#1c2541] to-[#1c0f2e]" />
      )}

      <div className="relative grid items-center gap-6 px-6 py-10 sm:px-10 sm:py-14 md:grid-cols-[1.2fr_1fr] md:py-16">
        <div className="max-w-md">
          {slide.kicker && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
              <span aria-hidden>🔥</span> {slide.kicker}
            </span>
          )}
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
              {slide.subtitle}
            </p>
          )}
          <Link
            href={slide.ctaHref}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[#0e1525] shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            {slide.ctaLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Right column reserved for the visual collage in the
            background image. We leave a spacer so the CTA on the
            left doesn't overlap the focal point of the photo. */}
        <div aria-hidden className="hidden md:block" />
      </div>

      {/* Prev/Next arrows — only show when there's >1 slide. */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Slide sebelumnya"
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Slide berikutnya"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-6 flex gap-1.5 sm:left-10">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Slide ${i + 1}`}
                aria-current={i === idx ? "true" : undefined}
                onClick={() => setIdx(i)}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (i === idx ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70")
                }
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
