/**
 * Replacement for the ASCII "→" CTA marker scattered across cards and
 * link rails. Renders a properly-weighted SVG with smooth hover slide
 * via a `group-hover:translate-x-0.5` parent class on the calling
 * element. Lives next to text — the wrapper sets size + color via
 * currentColor so it inherits whatever the link styling already says.
 */
export function ArrowRight({ size = 12, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={"inline-block shrink-0 transition-transform group-hover:translate-x-0.5 " + className}
    >
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}
