"use client";
import * as React from "react";
import { cn } from "./lib/cn";

interface TabsProps {
  options: string[];
  value?: string;
  onChange?: (v: string) => void;
  className?: string;
}

export function Tabs({ options, value, onChange, className }: TabsProps) {
  const [internal, setInternal] = React.useState(value ?? options[0]);
  const active = value ?? internal;
  const set = (v: string) => {
    setInternal(v);
    onChange?.(v);
  };
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-full border border-rule bg-panel p-1", className)}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => set(o)}
          className={cn(
            "rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
            active === o
              ? "bg-brand-sheen text-white"
              : "text-fg-muted hover:text-fg"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function TextTabs({ options, value, onChange, className }: TabsProps) {
  const [internal, setInternal] = React.useState(value ?? options[0]);
  const active = value ?? internal;
  const set = (v: string) => {
    setInternal(v);
    onChange?.(v);
  };
  return (
    <div className={cn("flex items-center gap-5 border-b border-rule", className)}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => set(o)}
          className={cn(
            "relative -mb-px pb-3 text-sm font-medium transition-colors",
            active === o ? "text-fg" : "text-fg-subtle hover:text-fg-muted"
          )}
        >
          {o}
          {active === o && (
            <span className="absolute inset-x-0 bottom-0 h-px bg-brand-400" />
          )}
        </button>
      ))}
    </div>
  );
}
