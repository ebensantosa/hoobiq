import * as React from "react";
import { cn } from "./lib/cn";

export interface StatProps {
  value: string;
  label: string;
  accent?: "gold" | "ink";
  className?: string;
}

export function Stat({ value, label, accent = "ink", className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span
        className={cn(
          "font-display text-4xl leading-none tracking-tight",
          accent === "gold" ? "text-brand-400 dark:text-brand-300" : "text-fg"
        )}
      >
        {value}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
        {label}
      </span>
    </div>
  );
}
