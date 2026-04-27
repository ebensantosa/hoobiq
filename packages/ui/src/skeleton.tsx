import * as React from "react";
import { cn } from "./lib/cn";

/**
 * Lightweight shimmer skeleton. Pure CSS animation (no JS), no external
 * deps. Use for any "loading" placeholder — pages, lists, cards, text lines.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer relative overflow-hidden rounded-xl bg-panel-2",
        // A diagonal highlight strip slides across; the keyframe is in globals.css
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
        "before:animate-shimmer-sweep",
        className
      )}
      {...props}
    />
  );
}
