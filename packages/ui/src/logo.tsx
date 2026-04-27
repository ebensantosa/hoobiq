import * as React from "react";
import { cn } from "./lib/cn";

const sizes = {
  sm: 64,
  md: 112,
  lg: 144,
};

/**
 * Hoobiq logo — the source PNG already includes the wordmark with its tagline.
 * We render the image as-is and use negative vertical margins to absorb the
 * padding baked into the file so it doesn't blow out the parent's height.
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
  const h = sizes[size];
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src="/logo.PNG"
        alt="Hoobiq"
        height={h}
        // Split the difference: a small negative marginTop lifts the
        // wordmark just enough to land at the optical center of the header,
        // while the larger negative marginBottom clips the tagline padding
        // so the layout box height stays flush with the header.
        style={{ height: h, width: "auto", marginTop: -h / 12, marginBottom: -h / 4 }}
        className={cn(
          "select-none object-contain transition-transform duration-300 ease-out",
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
