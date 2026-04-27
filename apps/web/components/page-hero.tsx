import * as React from "react";

type Tone = "brand" | "flame" | "ultra" | "mint";

const TONES: Record<Tone, { from: string; via: string; to: string; orb1: string; orb2: string; eyebrow: string }> = {
  brand: {
    from: "from-brand-500/20",
    via:  "via-brand-400/10",
    to:   "to-flame-500/15",
    orb1: "bg-brand-500/35",
    orb2: "bg-flame-500/25",
    eyebrow: "text-brand-500",
  },
  flame: {
    from: "from-flame-500/25",
    via:  "via-amber-400/10",
    to:   "to-brand-500/15",
    orb1: "bg-flame-500/35",
    orb2: "bg-brand-500/20",
    eyebrow: "text-flame-500",
  },
  ultra: {
    from: "from-ultra-500/25",
    via:  "via-brand-400/10",
    to:   "to-flame-400/10",
    orb1: "bg-ultra-500/30",
    orb2: "bg-brand-500/20",
    eyebrow: "text-ultra-500",
  },
  mint: {
    from: "from-emerald-400/20",
    via:  "via-teal-400/10",
    to:   "to-brand-400/15",
    orb1: "bg-emerald-500/25",
    orb2: "bg-teal-500/25",
    eyebrow: "text-emerald-500",
  },
};

/**
 * Page cover banner — gradient surface, soft orbs, eyebrow + title + subtitle.
 * Use at the top of section pages to give them a "cover" instead of a flat
 * `<h1>`. Optionally accepts trailing content (CTA, stats) via `right`.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  tone = "brand",
  icon,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <section
      aria-label={title}
      className={
        "relative overflow-hidden rounded-3xl border border-rule " +
        "bg-gradient-to-br " + t.from + " " + t.via + " " + t.to + " " +
        "px-6 py-7 md:px-8 md:py-9"
      }
    >
      <span aria-hidden className={"pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl " + t.orb1} />
      <span aria-hidden className={"pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full blur-3xl " + t.orb2} />
      {/* faint grid texture for depth */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(80% 60% at 50% 50%, black 30%, transparent 80%)",
        }}
      />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4 md:items-center">
          {icon && (
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/60 ring-1 ring-rule shadow-sm dark:bg-white/5">
              <span className={t.eyebrow}>{icon}</span>
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className={"font-mono text-[10px] font-bold uppercase tracking-[0.22em] " + t.eyebrow}>
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-fg md:text-3xl">{title}</h1>
            {subtitle && (
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-fg-muted">{subtitle}</p>
            )}
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </section>
  );
}
