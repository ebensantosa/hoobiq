import * as React from "react";
import { cn } from "./lib/cn";

type InvalidProp = { invalid?: boolean };

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & InvalidProp
>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      "h-11 w-full rounded-xl border bg-panel px-4 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:outline-none focus:ring-2",
      invalid
        ? "border-flame-400 focus:border-flame-400 focus:ring-flame-400/20"
        : "border-rule focus:border-brand-400/60 focus:ring-brand-400/20",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & InvalidProp
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      "min-h-[96px] w-full rounded-xl border bg-panel px-4 py-3 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:outline-none focus:ring-2",
      invalid
        ? "border-flame-400 focus:border-flame-400 focus:ring-flame-400/20"
        : "border-rule focus:border-brand-400/60 focus:ring-brand-400/20",
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
