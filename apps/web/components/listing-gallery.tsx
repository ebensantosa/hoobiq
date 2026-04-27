"use client";
import * as React from "react";
import { Badge } from "@hoobiq/ui";

/**
 * Click-to-swap image gallery for the listing detail page. Cover image is
 * the first one; thumbnails below let the buyer cycle through the rest.
 * Server component would suffice for the static markup but we want the
 * thumbnail-click interaction without a route change.
 */
export function ListingGallery({
  images, title, condition,
}: {
  images: string[];
  title: string;
  condition: string;
}) {
  const [active, setActive] = React.useState(0);
  const cover = images[active] ?? images[0] ?? null;

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-rule bg-panel-2">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-400/15 via-transparent to-flame-400/10" />
        )}
        <Badge tone={condition === "MINT" ? "mint" : "near"} size="sm" className="absolute left-4 top-4">
          {condition === "MINT" ? "Mint" : condition.replace("_", " ")}
        </Badge>
        {images.length > 1 && (
          <span className="absolute right-4 bottom-4 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur">
            {active + 1} / {images.length}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.slice(0, 8).map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
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
    </div>
  );
}
