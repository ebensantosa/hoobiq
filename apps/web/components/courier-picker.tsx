"use client";
import * as React from "react";

export const COURIERS: { code: string; label: string }[] = [
  { code: "jne",      label: "JNE" },
  { code: "jnt",      label: "J&T" },
  { code: "sicepat",  label: "SiCepat" },
  { code: "anteraja", label: "AnterAja" },
  { code: "ide",      label: "ID Express" },
  { code: "ninja",    label: "Ninja Xpress" },
  { code: "tiki",     label: "TIKI" },
  { code: "pos",      label: "Pos Indonesia" },
  { code: "wahana",   label: "Wahana" },
];

/** Multi-select chip grid used by the listing upload form. */
export function CourierPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(code: string) {
    if (value.includes(code)) onChange(value.filter((c) => c !== code));
    else onChange([...value, code]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {COURIERS.map((c) => {
        const on = value.includes(c.code);
        return (
          <button
            type="button"
            key={c.code}
            onClick={() => toggle(c.code)}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
              (on
                ? "border-brand-400 bg-brand-400/10 text-brand-500"
                : "border-rule text-fg-muted hover:border-brand-400/50")
            }
          >
            {on ? "✓ " : ""}{c.label}
          </button>
        );
      })}
    </div>
  );
}
