import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./lib/cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-flame-400 text-parch-50 hover:bg-flame-300 active:bg-flame-500",
        gold:
          "bg-brand-sheen text-white hover:brightness-110 active:brightness-95 shadow-glow",
        outline:
          "border border-rule bg-transparent text-fg hover:border-brand-400/60 hover:text-brand-300",
        ghost: "text-fg-muted hover:bg-panel hover:text-fg",
        link: "text-brand-400 underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-8 px-2.5 text-xs rounded-lg",
        sm: "h-9 px-3 text-sm rounded-lg",
        md: "h-11 px-5 text-sm rounded-xl",
        lg: "h-12 px-6 text-base rounded-2xl",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(button({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
