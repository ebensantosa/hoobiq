"use client";
import * as React from "react";

/**
 * Click-to-swap gallery for listing detail. Cover at the top; thumbnail
 * strip below cycles through the rest. Tapping the cover (or any
 * thumbnail) opens a fullscreen lightbox — arrow keys + on-screen
 * controls navigate; Esc closes.
 *
 * The condition pill that used to sit on the cover image moved into the
 * detail card per spec — keeping the gallery clean lets photos sell the
 * piece without UI noise.
 */
export function ListingGallery({
  images, title,
}: {
  images: string[];
  title: string;
  /** condition kept in the prop list for backward-compat, but the badge
   *  is now rendered next to the title inside the detail page card. */
  condition?: string;
}) {
  const [active, setActive] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const cover = images[active] ?? images[0] ?? null;

  // Lightbox keyboard nav: ←/→ to cycle, Esc to close. Only bound while open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowLeft") setActive((i) => (i - 1 + images.length) % images.length);
      else if (e.key === "ArrowRight") setActive((i) => (i + 1) % images.length);
    };
    document.addEventListener("keydown", onKey);
    // Prevent body scroll while the overlay is up — feels much closer
    // to a native lightbox.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, images.length]);

  return (
    <div>
      <button
        type="button"
        onClick={() => images.length > 0 && setOpen(true)}
        aria-label="Perbesar foto"
        disabled={images.length === 0}
        className="relative block aspect-[4/5] w-full overflow-hidden rounded-2xl border border-rule bg-panel-2 disabled:cursor-default"
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={title} className="absolute inset-0 h-full w-full cursor-zoom-in object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-400/15 via-transparent to-flame-400/10" />
        )}
        {images.length > 1 && (
          <span className="pointer-events-none absolute right-4 bottom-4 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur">
            {active + 1} / {images.length}
          </span>
        )}
        {images.length > 0 && (
          <span className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1 rounded-md border border-white/30 bg-black/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4" />
            </svg>
            Klik untuk perbesar
          </span>
        )}
      </button>

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.slice(0, 8).map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              onDoubleClick={() => { setActive(i); setOpen(true); }}
              className={
                "relative aspect-square overflow-hidden rounded-lg transition-all " +
                (i === active
                  ? "ring-2 ring-brand-400/80 ring-offset-2 ring-offset-canvas"
                  : "border border-rule opacity-70 hover:opacity-100")
              }
              aria-label={`Foto ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && cover && (
        <Lightbox
          images={images}
          active={active}
          onChange={setActive}
          onClose={() => setOpen(false)}
          title={title}
        />
      )}
    </div>
  );
}

function Lightbox({
  images, active, onChange, onClose, title,
}: {
  images: string[];
  active: number;
  onChange: (i: number) => void;
  onClose: () => void;
  title: string;
}) {
  const src = images[active];
  const prev = () => onChange((active - 1 + images.length) % images.length);
  const next = () => onChange((active + 1) % images.length);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Tutup"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Foto sebelumnya"
            className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Foto berikutnya"
            className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </>
      )}

      <div onClick={(e) => e.stopPropagation()} className="relative max-h-[90vh] max-w-[92vw]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={title} className="max-h-[90vh] max-w-[92vw] rounded-md object-contain" />
        {images.length > 1 && (
          <div className="mt-3 text-center font-mono text-[11px] text-white/70">
            {active + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}
