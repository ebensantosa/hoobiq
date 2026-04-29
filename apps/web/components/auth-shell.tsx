import Link from "next/link";
import { Logo } from "@hoobiq/ui";
import { ThemeToggle } from "./theme-toggle";
import { CardArt } from "./card-art";

/**
 * Split layout for login/register. Left: form. Right: branded side panel
 * with value props + a small floating gallery of stylized "showcase" cards
 * (hidden on mobile).
 */
export function AuthShell({
  children,
  sideTitle,
  sideBullets,
}: {
  children: React.ReactNode;
  sideTitle: string;
  sideBullets: string[];
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="absolute inset-x-0 top-0 z-10 flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 md:px-10">
        <Link href="/" aria-label="Hoobiq" className="flex shrink-0 items-center self-center -ml-1 sm:ml-0">
          <Logo size="sm" />
        </Link>
        <ThemeToggle />
      </header>

      <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
        <section className="flex items-center justify-center px-6 py-24 md:px-10">
          <div className="w-full max-w-md">{children}</div>
        </section>

        <aside className="relative hidden overflow-hidden border-l border-rule bg-panel/40 lg:block">
          {/* brand soft halo */}
          <div className="absolute inset-0 bg-brand-soft opacity-70" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-[480px] w-[480px] rounded-full bg-brand-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-[420px] w-[420px] rounded-full bg-ultra-400/15 blur-3xl" />

          <div className="relative flex h-full flex-col justify-between p-12">
            <div className="max-w-md">
              <h2 className="text-3xl font-bold leading-tight text-fg md:text-4xl">
                {sideTitle}
              </h2>
              <ul className="mt-8 space-y-4 text-sm">
                {sideBullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-fg-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <FloatingPreview />
          </div>
        </aside>
      </div>
    </div>
  );
}

function FloatingPreview() {
  const items = [
    { t: "Dragon Foil v2",      p: "Rp 4.250.000", art: "flame"   as const, cls: "animate-float"   },
    { t: "Pirate Captain",      p: "Rp 850.000",   art: "ocean"   as const, cls: "animate-float-3" },
    { t: "Storm Bringer 1/7",   p: "Rp 1.250.000", art: "thunder" as const, cls: "animate-float-2" },
  ];
  return (
    <div className="relative mt-10 grid max-w-md grid-cols-3 gap-3">
      {items.map((c, i) => (
        <div
          key={i}
          className={
            "overflow-hidden rounded-xl border border-rule bg-panel shadow-gallery " + c.cls
          }
        >
          <div className="relative aspect-[3/4] overflow-hidden">
            <CardArt variant={c.art} />
            <span className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white/30 to-transparent mix-blend-overlay" />
          </div>
          <div className="p-2">
            <p className="truncate text-[10px] font-semibold text-fg">{c.t}</p>
            <p className="text-[10px] font-bold text-brand-500">{c.p}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
