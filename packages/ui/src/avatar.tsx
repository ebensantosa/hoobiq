import * as React from "react";
import { cn } from "./lib/cn";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  letter: string;
  size?: "sm" | "md" | "lg" | "xl";
  ring?: boolean;
  src?: string | null;
  alt?: string;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-2xl",
};

export function Avatar({
  letter,
  size = "md",
  ring,
  src,
  alt,
  className,
  ...props
}: AvatarProps) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-brand-sheen font-display text-ink-900 select-none",
        sizes[size],
        ring && "ring-2 ring-brand-400/40 ring-offset-2 ring-offset-canvas",
        className
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? ""}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        letter.slice(0, 1).toUpperCase()
      )}
    </div>
  );
}
