import * as React from "react";
import { cn } from "./lib/cn";

// Visible "frame" height — the wordmark sits inside an inline box of this
// size, vertically centered. The PNG bakes a tagline into its bottom padding,
// so we render it taller than the frame and crop via overflow:hidden, then
// nudge it up so the wordmark — not the tagline — lands at the frame's
// optical center. Frame height is what flex `items-center` actually sees,
// so the logo is properly centered in any header that uses items-center.
const frame = {
  sm: 40,
  md: 40,
  lg: 64,
};

const imageH = {
  sm: 60,
  md: 60,
  lg: 96,
};

/**
 * Hoobiq logo. Scales to a fixed-height frame and crops the tagline padding
 * baked into the PNG so the visible wordmark sits centered in any header.
 *
 * Hover lifts and saturates a touch — small piece of the "premium" feel.
 */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const h = frame[size];
  const imgH = imageH[size];
  return (
    <span
      className={cn("inline-flex items-center overflow-hidden", className)}
      style={{ height: h }}
    >
      <img
        src="/logo.PNG"
        alt="Hoobiq"
        height={imgH}
        // Pull the image up just enough to land the wordmark's optical
        // center at the frame's center — small offset (vs the larger
        // imgH/12 we used previously) so the logo sits flush with the
        // menu text baseline instead of riding above it.
        style={{ height: imgH, width: "auto", marginTop: -imgH / 30 }}
        className={cn(
          "max-w-none select-none object-contain transition-transform duration-300 ease-out",
          "hover:scale-[1.03]",
          // Dark mode: flip lightness while keeping chroma so the dark navy
          // letters become legible on the dark canvas.
          "dark:[filter:invert(1)_hue-rotate(180deg)_saturate(1.15)]"
        )}
        draggable={false}
      />
    </span>
  );
}
