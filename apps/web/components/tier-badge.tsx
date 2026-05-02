export type Tier = "bronze" | "silver" | "gold" | "platinum" | "elite";

const cn = (...xs: Array<string | false | undefined>) => xs.filter(Boolean).join(" ");

const TIER_META: Record<Tier, { label: string; color: string; ring: string }> = {
  bronze: {
    label: "Bronze",
    color: "from-amber-700 via-amber-500 to-amber-700",
    ring: "ring-amber-400/40",
  },
  silver: {
    label: "Silver",
    color: "from-slate-500 via-slate-300 to-slate-500",
    ring: "ring-slate-300/40",
  },
  gold: {
    label: "Gold",
    color: "from-amber-500 via-yellow-300 to-amber-500",
    ring: "ring-yellow-400/50",
  },
  platinum: {
    label: "Platinum",
    color: "from-cyan-400 via-blue-200 to-cyan-400",
    ring: "ring-cyan-300/50",
  },
  elite: {
    label: "Elite",
    color: "from-fuchsia-500 via-rose-400 to-amber-400",
    ring: "ring-fuchsia-400/50",
  },
};

/** Compute tier from level — kept in lockstep with the API
 *  MembershipService.tierForLevel mapping. */
export function tierForLevel(level: number): Tier {
  if (level >= 51) return "elite";
  if (level >= 41) return "platinum";
  if (level >= 26) return "gold";
  if (level >= 11) return "silver";
  return "bronze";
}

/**
 * Compact tier chip — use in topbar and profile rows. Premium adds a
 * gold sparkle + outer ring. Pure presentation; tier and premium are
 * passed in by the caller (don't read context here so it composes
 * cleanly inside server components).
 */
export function TierBadge({
  tier,
  level,
  premium = false,
  size = "sm",
}: {
  tier: Tier;
  level?: number;
  premium?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const m = TIER_META[tier];
  const sz = {
    sm: "h-6 px-2 text-[10px]",
    md: "h-7 px-2.5 text-[11px]",
    lg: "h-8 px-3 text-xs",
  }[size];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-widest text-white shadow-sm",
        "bg-gradient-to-r",
        m.color,
        premium ? `ring-2 ring-offset-1 ring-offset-canvas ${m.ring}` : "",
        sz,
      )}
    >
      {premium && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="m12 2 2.39 5.6L20 8.4l-4.5 3.9L17 18l-5-3-5 3 1.5-5.7L4 8.4l5.6-.8z"/>
        </svg>
      )}
      <span>{m.label}</span>
      {level != null && <span className="font-mono">LV {level}</span>}
    </span>
  );
}

export function tierLabel(tier: Tier): string {
  return TIER_META[tier].label;
}
