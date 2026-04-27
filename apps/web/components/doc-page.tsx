import Link from "next/link";
import { MarketingNav } from "./marketing-nav";
import { MarketingFooter } from "./marketing-footer";

export function DocPage({
  eyebrow,
  title,
  lead,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  updated?: string;
  sections: { id: string; heading: string; body: React.ReactNode }[];
}) {
  return (
    <>
      <MarketingNav />
      <main className="mx-auto max-w-[1280px] px-6 pt-24 pb-12 md:px-10 md:pb-16">
        <header className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-400">
            {eyebrow}
          </span>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-fg md:text-5xl">
            {title}
          </h1>
          {lead && (
            <p className="mt-4 text-base leading-relaxed text-fg-muted md:text-lg">
              {lead}
            </p>
          )}
          {updated && (
            <p className="mt-4 text-xs text-fg-subtle">
              Terakhir diperbarui · {updated}
            </p>
          )}
        </header>

        <div className="mt-12 grid gap-12 md:grid-cols-[220px_1fr] md:gap-16">
          <aside className="md:sticky md:top-24 md:self-start">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-fg-subtle">
              Daftar isi
            </p>
            <ul className="flex flex-col gap-2 border-l border-rule">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="-ml-px block border-l-2 border-transparent py-1 pl-4 text-sm text-fg-muted transition-colors hover:border-brand-400 hover:text-fg"
                  >
                    {s.heading}
                  </a>
                </li>
              ))}
            </ul>
          </aside>

          <article className="prose-doc max-w-3xl">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="mt-0 text-2xl font-bold text-fg md:text-3xl">
                  {s.heading}
                </h2>
                <div className="mt-4 space-y-4 text-base leading-relaxed text-fg-muted">
                  {s.body}
                </div>
                <div className="my-10 border-t border-rule" />
              </section>
            ))}
          </article>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-fg-muted">
          Butuh bantuan lebih lanjut?
          <Link href="/bantuan" className="font-medium text-brand-400 hover:underline">
            Pusat Bantuan →
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}

/** Inline helpers used inside section body blocks */

export function Para({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-brand-400">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function SubHead({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-lg font-semibold text-fg">{children}</h3>;
}
