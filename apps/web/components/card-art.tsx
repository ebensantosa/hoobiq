/**
 * Stylized SVG illustrations used as placeholder art on listing/preview cards
 * when there's no real product image. Abstract enough to avoid copying any
 * IP, while the palette + iconography signals "TCG", "figure", "blind box"
 * at a glance.
 *
 * Pick a variant deterministically from a string (slug/id) via `pickArt`.
 */

export type CardArtVariant = "flame" | "thunder" | "ocean" | "bubble" | "neon" | "sakura";

export function CardArt({
  variant,
  className,
}: {
  variant: CardArtVariant;
  className?: string;
}) {
  const cls = "absolute inset-0 h-full w-full " + (className ?? "");
  switch (variant) {
    case "flame":   return <FlameArt   className={cls} />;
    case "thunder": return <ThunderArt className={cls} />;
    case "ocean":   return <OceanArt   className={cls} />;
    case "bubble":  return <BubbleArt  className={cls} />;
    case "neon":    return <NeonArt    className={cls} />;
    case "sakura":  return <SakuraArt  className={cls} />;
  }
}

/** Deterministic pick from any stable identifier (slug, id). */
export function pickArt(seed: string): CardArtVariant {
  const variants: CardArtVariant[] = ["flame", "thunder", "ocean", "bubble", "neon", "sakura"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return variants[h % variants.length]!;
}

/* ---------------------- Variants ---------------------- */

function FlameArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="art-flame-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#FFE2B8"/>
          <stop offset="55%"  stopColor="#FF6B1A"/>
          <stop offset="100%" stopColor="#EC4899"/>
        </linearGradient>
        <radialGradient id="art-flame-glow" cx="50%" cy="60%" r="50%">
          <stop offset="0%"  stopColor="#fff" stopOpacity="0.6"/>
          <stop offset="60%" stopColor="#fff" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="160" height="120" fill="url(#art-flame-bg)"/>
      <rect width="160" height="120" fill="url(#art-flame-glow)"/>
      <path d="M80 18c-8 14-22 22-22 38a22 22 0 0 0 44 0c0-12-9-20-13-30-2-4-4-6-9-8z" fill="#fff" fillOpacity="0.9"/>
      <path d="M80 38c-4 8-10 12-10 22a10 10 0 0 0 20 0c0-7-4-12-6-17-1-2-2-4-4-5z" fill="#EC4899"/>
      <g opacity="0.35">
        <line x1="-20" y1="100" x2="180" y2="0"   stroke="#fff" strokeWidth="2"/>
        <line x1="-20" y1="120" x2="180" y2="20"  stroke="#fff" strokeWidth="1"/>
        <line x1="-20" y1="80"  x2="180" y2="-20" stroke="#fff" strokeWidth="1"/>
      </g>
      <Sparkle x={28} y={26}/>
      <Sparkle x={130} y={36} small/>
      <Sparkle x={120} y={94}/>
    </svg>
  );
}

function ThunderArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="art-thunder-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2D2848"/>
          <stop offset="60%"  stopColor="#A855F7"/>
          <stop offset="100%" stopColor="#ACA4D3"/>
        </linearGradient>
      </defs>
      <rect width="160" height="120" fill="url(#art-thunder-bg)"/>
      <g fill="none" stroke="#FFFFFF" strokeOpacity="0.35">
        <circle cx="80" cy="60" r="42"/>
        <circle cx="80" cy="60" r="30"/>
        <circle cx="80" cy="60" r="18" strokeOpacity="0.6"/>
      </g>
      <path d="M86 24 L66 64 L78 64 L72 96 L96 56 L82 56 L92 24 Z" fill="#FFE2B8" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M28 30 l4 8 -3 1 3 7"   fill="none" stroke="#FFE2B8" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M132 80 l-4 8 3 1 -3 7" fill="none" stroke="#FFE2B8" strokeWidth="1.5" strokeLinecap="round"/>
      <Sparkle x={36} y={92} small/>
      <Sparkle x={130} y={32} small/>
    </svg>
  );
}

function OceanArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="art-ocean-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FFE2B8"/>
          <stop offset="55%"  stopColor="#FF6B1A"/>
          <stop offset="100%" stopColor="#D78934"/>
        </linearGradient>
      </defs>
      <rect width="160" height="120" fill="url(#art-ocean-bg)"/>
      <circle cx="80" cy="46" r="22" fill="#FFF1B8" opacity="0.85"/>
      <path d="M40 70 q40 -22 80 0 v6 q-40 -16 -80 0 z" fill="#FFF"/>
      <ellipse cx="80" cy="62" rx="20" ry="9" fill="#EC4899"/>
      <rect x="60" y="62" width="40" height="3" fill="#EC4899" opacity="0.7"/>
      <path d="M0 88 q20 -8 40 0 t40 0 t40 0 t40 0 v32 H0 z"  fill="#fff" opacity="0.55"/>
      <path d="M0 100 q20 -6 40 0 t40 0 t40 0 t40 0 v20 H0 z" fill="#fff" opacity="0.85"/>
      <Sparkle x={32} y={26} small/>
      <Sparkle x={128} y={36}/>
    </svg>
  );
}

function BubbleArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="art-bubble-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#FBCFE6"/>
          <stop offset="60%"  stopColor="#EC4899"/>
          <stop offset="100%" stopColor="#A855F7"/>
        </linearGradient>
      </defs>
      <rect width="160" height="120" fill="url(#art-bubble-bg)"/>
      <ellipse cx="80" cy="78" rx="40" ry="28" fill="#FFE2F0"/>
      <path d="M52 50 L46 32 L60 46 Z"  fill="#fff"/>
      <path d="M108 50 L114 32 L100 46 Z" fill="#fff"/>
      <circle cx="68" cy="74" r="6" fill="#fff"/>
      <circle cx="92" cy="74" r="6" fill="#fff"/>
      <circle cx="69" cy="75" r="2.5" fill="#2D2848"/>
      <circle cx="93" cy="75" r="2.5" fill="#2D2848"/>
      <path d="M68 88 Q80 96 92 88" stroke="#2D2848" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="60" cy="84" r="3" fill="#EC4899" opacity="0.5"/>
      <circle cx="100" cy="84" r="3" fill="#EC4899" opacity="0.5"/>
      <circle cx="22" cy="32" r="6"   fill="#fff" opacity="0.6"/>
      <circle cx="140" cy="44" r="4"  fill="#fff" opacity="0.7"/>
      <circle cx="135" cy="22" r="2.5" fill="#fff" opacity="0.9"/>
      <Sparkle x={132} y={96} small/>
    </svg>
  );
}

function NeonArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="art-neon-bg" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%"   stopColor="#0B0C13"/>
          <stop offset="60%"  stopColor="#A855F7"/>
          <stop offset="100%" stopColor="#EC4899"/>
        </linearGradient>
      </defs>
      <rect width="160" height="120" fill="url(#art-neon-bg)"/>
      {/* horizon grid */}
      <g stroke="#FF6B1A" strokeOpacity="0.55" strokeWidth="1" fill="none">
        <line x1="0"   y1="80" x2="160" y2="80"/>
        <line x1="0"   y1="92" x2="160" y2="92"/>
        <line x1="0"   y1="106" x2="160" y2="106"/>
        <line x1="80"  y1="68" x2="-40"  y2="120"/>
        <line x1="80"  y1="68" x2="40"   y2="120"/>
        <line x1="80"  y1="68" x2="120"  y2="120"/>
        <line x1="80"  y1="68" x2="200"  y2="120"/>
      </g>
      {/* sun disc */}
      <circle cx="80" cy="56" r="22" fill="#FF6B1A"/>
      <rect x="58" y="60" width="44" height="2" fill="#0B0C13" opacity="0.7"/>
      <rect x="60" y="66" width="40" height="2" fill="#0B0C13" opacity="0.6"/>
      <rect x="62" y="72" width="36" height="2" fill="#0B0C13" opacity="0.5"/>
      <Sparkle x={26} y={28}/>
      <Sparkle x={130} y={22} small/>
    </svg>
  );
}

function SakuraArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="art-sakura-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FCE7F3"/>
          <stop offset="100%" stopColor="#F074AC"/>
        </linearGradient>
      </defs>
      <rect width="160" height="120" fill="url(#art-sakura-bg)"/>
      {/* tree trunk */}
      <rect x="78" y="60" width="6" height="50" fill="#6E1F49" opacity="0.7"/>
      <path d="M81 60 q-10 -20 -28 -22" stroke="#6E1F49" strokeWidth="3" fill="none" opacity="0.7"/>
      <path d="M81 60 q10 -20 28 -22"  stroke="#6E1F49" strokeWidth="3" fill="none" opacity="0.7"/>
      {/* blossoms */}
      {[
        [40, 36], [54, 28], [68, 36], [80, 24], [92, 36], [108, 28], [120, 38],
        [50, 50], [76, 48], [102, 50], [128, 56],
      ].map(([cx, cy], i) => (
        <Blossom key={i} cx={cx} cy={cy}/>
      ))}
      {/* falling petals */}
      <Blossom cx={28} cy={86} small/>
      <Blossom cx={140} cy={94} small/>
      <Blossom cx={64} cy={102} small/>
    </svg>
  );
}

function Blossom({ cx, cy, small }: { cx: number; cy: number; small?: boolean }) {
  const r = small ? 2 : 4;
  return (
    <g fill="#FFFFFF">
      <circle cx={cx}     cy={cy - r} r={r}/>
      <circle cx={cx + r} cy={cy}     r={r}/>
      <circle cx={cx}     cy={cy + r} r={r}/>
      <circle cx={cx - r} cy={cy}     r={r}/>
      <circle cx={cx}     cy={cy}     r={r * 0.8} fill="#EC4899" opacity="0.7"/>
    </g>
  );
}

function Sparkle({ x, y, small }: { x: number; y: number; small?: boolean }) {
  const s = small ? 3 : 5;
  return (
    <path
      d={`M${x} ${y - s} L${x + s * 0.4} ${y - s * 0.4} L${x + s} ${y} L${x + s * 0.4} ${y + s * 0.4} L${x} ${y + s} L${x - s * 0.4} ${y + s * 0.4} L${x - s} ${y} L${x - s * 0.4} ${y - s * 0.4} Z`}
      fill="#fff"
    />
  );
}
