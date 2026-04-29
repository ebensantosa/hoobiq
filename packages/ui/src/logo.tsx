import * as React from "react";
import { cn } from "./lib/cn";

// Visible "frame" height — the asset is a clean wordmark + sparkle on a
// transparent background (831×300, ~2.77:1) so we just scale it to the
// frame height and let aspect-ratio set the width. No more overflow/crop
// hacks; flex `items-center` centers it vertically inside the header.
const frame = {
  sm: 44,
  md: 44,
  lg: 72,
};

/**
 * Hoobiq logo — wordmark scaled to the frame height while preserving the
 * asset's aspect ratio. Hover lifts a touch for the "premium" feel.
 */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const h = frame[size];
  return (
    <span
      className={cn("inline-flex items-center", className)}
      style={{ height: h }}
    >
      <img
        src="/logo.PNG"
        alt="Hoobiq"
        height={h}
        style={{ height: h, width: "auto" }}
        className={cn(
          "max-w-none select-none object-contain transition-transform duration-300 ease-out",
          "hover:scale-[1.03]",
          // Dark mode: flip lightness while keeping chroma so the dark
          // navy letters become legible on the dark canvas.
          "dark:[filter:invert(1)_hue-rotate(180deg)_saturate(1.15)]"
        )}
        draggable={false}
      />
    </span>
  );
}
