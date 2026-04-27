import * as React from "react";
import { cn } from "./lib/cn";

export interface ProgressProps {
  value: number; // 0..100
  tone?: "gold" | "crim";
  className?: string;
}

export function Progress({ value, tone = "gold", className }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-panel-2", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all",
          tone === "gold" ? "bg-brand-sheen" : "bg-flame-400"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
