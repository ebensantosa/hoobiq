import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./lib/cn";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full font-mono uppercase tracking-[0.14em]",
  {
    variants: {
      tone: {
        mint: "bg-brand-400/10 text-brand-500 dark:text-brand-200 border border-brand-400/30",
        near: "bg-panel-2 text-fg-muted border border-rule",
        crim: "bg-flame-400/15 text-flame-500 dark:text-flame-200 border border-flame-400/40",
        ghost: "bg-transparent text-fg-subtle border border-rule",
        solid: "bg-brand-sheen text-white border-0",
        level: "bg-flame-400/15 text-flame-400 dark:text-flame-200 border border-flame-400/30",
      },
      size: {
        xs: "text-[10px] px-2 py-0.5",
        sm: "text-[11px] px-2.5 py-1",
      },
    },
    defaultVariants: { tone: "near", size: "xs" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone, size }), className)} {...props} />;
}
