import * as React from "react";
import { cn } from "./lib/cn";

// Visible "frame" height — the wordmark sits inside an inline box of this
// size, vertically centered. The PNG bakes a tagline into its bottom padding,
// so we render it taller than the frame and crop via overflow:hidden, then
// nudge it up so the wordmark — not the tagline — lands at the frame's
// optical center. Frame height is what flex `items-center` actually sees,
// so the logo is properly centered in any header that uses items-center.
const frame = {
  sm: 32,
  md: 32,
  lg: 56,
};

const imageH = {
  sm: 48,
  md: 48,
  lg: 80,
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
        // Pull the image up by the top padding baked into the asset
        // (~imgH/12), so the wordmark sits vertically centered inside the
        // frame and the tagline at the bottom gets clipped.
        style={{ height: imgH, width: "auto", marginTop: -imgH / 12 }}
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
