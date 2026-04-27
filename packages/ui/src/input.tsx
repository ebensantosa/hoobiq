import * as React from "react";
import { cn } from "./lib/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-xl border border-rule bg-panel px-4 text-sm text-fg placeholder:text-fg-subtle",
      "focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-colors",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[96px] w-full rounded-xl border border-rule bg-panel px-4 py-3 text-sm text-fg placeholder:text-fg-subtle",
      "focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-colors",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted",
        className
      )}
      {...props}
    />
  );
}
