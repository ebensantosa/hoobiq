import Link from "next/link";
import { Logo } from "@hoobiq/ui";
import { ThemeToggle } from "./theme-toggle";

/**
 * Split layout for login/register. Left: form column with the logo
 * anchored to the same max-w-md as the form so logo + heading align
 * vertically. Right: static gradient brand panel with value props
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
      <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
        <section className="flex flex-col px-6 py-8 md:px-10">
          <div className="mx-auto flex w-full max-w-md items-center justify-between">
            <Link href="/" aria-label="Hoobiq" className="inline-flex items-center">
              <Logo size="sm" />
            </Link>
            <ThemeToggle />
          </div>
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
            {children}
          </div>
        </section>

        <aside className="relative hidden overflow-hidden border-l border-rule lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-400/25 via-ultra-400/15 to-flame-400/20 dark:from-brand-500/15 dark:via-ultra-500/10 dark:to-flame-500/15" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-[480px] w-[480px] rounded-full bg-brand-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-[420px] w-[420px] rounded-full bg-ultra-400/20 blur-3xl" />

          <div className="relative flex h-full flex-col justify-center p-12">
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
          </div>
        </aside>
      </div>
    </div>
  );
}
