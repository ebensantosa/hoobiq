import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CategoryTreeView } from "@/components/category-tree-view";
import { serverApi } from "@/lib/server/api";
import { pickPrimaryCategories } from "@/lib/primary-categories";

export const metadata = { title: "Kategori · Hoobiq" };
export const dynamic = "force-dynamic";

type Node = {
  id: string;
  slug: string;
  name: string;
  level: number;
  listingCount: number;
  children: Node[];
};

/** Per-slug icon + accent color. Falls back to a generic grid + brand pink.
 *  Both the new spec slugs and the legacy ones are listed so the index
 *  page keeps rendering icons during the rollout window where both
 *  taxonomies coexist in the DB. */
const meta: Record<string, { icon: React.ReactNode; tint: string; ring: string }> = {
  "collection-cards": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="14" height="16" rx="2"/><path d="M6 6V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2"/></svg>
    ),
    tint: "from-emerald-100 to-emerald-50",
    ring: "group-hover:border-emerald-400/60 group-hover:shadow-[0_8px_24px_-12px] group-hover:shadow-emerald-400/40",
  },
  "trading-cards": {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="14" height="16" rx="2"/><path d="M6 6V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2"/></svg>
    ),
    tint: "from-brand-100 to-brand-50",
    ring: "group-hover:border-brand-400/60 group-hover:shadow-[0_8px_24px_-12px] group-hover:shadow-brand-400/40",
  },
  merchandise: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.4 7.5 16 4l-2 2-2-2-2 2-2-2-4.4 3.5L5 12h2v8h10v-8h2z"/></svg>
    ),
    tint: "from-sky-100 to-sky-50",
    ring: "group-hover:border-sky-400/60 group-hover:shadow-[0_8px_24px_-12px] group-hover:shadow-sky-400/40",
  },
  toys: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4z"/><path d="M5 22h14l-1.5-9h-11z"/><path d="M9 13v9M15 13v9"/></svg>
    ),
    tint: "from-ultra-100 to-ultra-50",
    ring: "group-hover:border-ultra-400/60 group-hover:shadow-[0_8px_24px_-12px] group-hover:shadow-ultra-400/40",
  },
  others: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4"/><path d="M12 17h.01"/></svg>
    ),
    tint: "from-flame-100 to-flame-50",
    ring: "group-hover:border-flame-400/60 group-hover:shadow-[0_8px_24px_-12px] group-hover:shadow-flame-400/40",
  },
  // Legacy slugs (kept until migration retires them)
  cards: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="14" height="16" rx="2"/><path d="M6 6V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2"/></svg>
    ),
    tint: "from-brand-100 to-brand-50",
    ring: "group-hover:border-brand-400/60 group-hover:shadow-[0_8px_24px_-12px] group-hover:shadow-brand-400/40",
  },
  figure: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4z"/><path d="M5 22h14l-1.5-9h-11z"/><path d="M9 13v9M15 13v9"/></svg>
    ),
    tint: "from-ultra-100 to-ultra-50",
    ring: "group-hover:border-ultra-400/60 group-hover:shadow-[0_8px_24px_-12px] group-hover:shadow-ultra-400/40",
  },
  blindbox: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-9 5-9-5V8l9-5 9 5z"/><path d="M3.3 8 12 13l8.7-5"/><path d="M12 13v8"/></svg>
    ),
    tint: "from-flame-100 to-flame-50",
    ring: "group-hover:border-flame-400/60 group-hover:shadow-[0_8px_24px_-12px] group-hover:shadow-flame-400/40",
  },
  merch: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.4 7.5 16 4l-2 2-2-2-2 2-2-2-4.4 3.5L5 12h2v8h10v-8h2z"/></svg>
    ),
    tint: "from-sky-100 to-sky-50",
    ring: "group-hover:border-sky-400/60 group-hover:shadow-[0_8px_24px_-12px] group-hover:shadow-sky-400/40",
  },
  komik: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4a2 2 0 0 1 2-2h6v18H4a2 2 0 0 1-2-2z"/><path d="M22 4a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 0 2-2z"/></svg>
    ),
    tint: "from-brand-100 to-ultra-50",
    ring: "group-hover:border-brand-400/60 group-hover:shadow-[0_8px_24px_-12px] group-hover:shadow-brand-400/40",
  },
};

const fallback = {
  icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  ),
  tint: "from-brand-50 to-ultra-50",
  ring: "group-hover:border-brand-400/60",
};

export default async function CategoryIndexPage() {
  const tree = await serverApi<Node[]>("/categories", { revalidate: 60 });
  const roots = pickPrimaryCategories((tree ?? []).filter((n) => n.level === 1));

  return (
    <AppShell active="Kategori">
      <div className="px-4 pb-8 sm:px-6 lg:px-10">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-6">
          <div>
            <h1 className="text-3xl font-bold text-fg md:text-4xl">Kategori</h1>
            <p className="mt-2 max-w-2xl text-sm text-fg-muted">
              Jelajahi kategori dan temukan koleksi yang kamu cari.
            </p>
          </div>
          <Link
            href="/pengaturan/kategori-baru"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-brand-400/60 bg-brand-400/10 px-4 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-400/20 dark:text-brand-300"
          >
            + Request kategori baru
          </Link>
        </header>

        {roots.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-rule bg-panel/40 p-10 text-center text-fg-muted">
            Belum ada kategori. Coba lagi nanti.
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {roots.map((c) => {
              const m = meta[c.slug] ?? fallback;
              return (
                <Link
                  key={c.id}
                  href={`/kategori/${c.slug}`}
                  className={
                    "group flex flex-col overflow-hidden rounded-2xl border border-rule bg-panel transition-all duration-200 hover:-translate-y-0.5 " +
                    m.ring
                  }
                >
                  <div className={`flex aspect-[16/9] items-end bg-gradient-to-br ${m.tint} p-5`}>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 text-fg shadow-sm backdrop-blur">
                      {m.icon}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-fg">{c.name}</h2>
                      <span className="rounded-full bg-panel-2 px-2 py-0.5 font-mono text-[11px] text-fg-muted">
                        {c.listingCount.toLocaleString("id-ID")} listing
                      </span>
                    </div>
                    {c.children.length > 0 && (
                      <p className="text-xs text-fg-subtle">
                        {c.children.slice(0, 4).map((s) => s.name).join(" · ")}
                        {c.children.length > 4 ? ` · +${c.children.length - 4} sub-seri` : ""}
                      </p>
                    )}
                    <span className="mt-2 inline-flex items-center text-sm font-semibold text-brand-500">
                      Jelajahi
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Inline chevron-expand tree — same data as the cards above but
            for buyers who prefer to drill in without route changes. */}
        {roots.some((r) => r.children.length > 0) && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-fg">Jelajah cepat</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Klik panah untuk buka sub-kategori, klik panah lagi untuk
              buka series-nya. Klik nama untuk langsung ke marketplace.
            </p>
            <div className="mt-5">
              <CategoryTreeView roots={roots} />
            </div>
          </section>
        )}

        {/* Popular sub-series chip strip stays as a quick-jump for the
            categories that already have momentum. */}
        {roots.some((r) => r.children.length > 0) && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-fg">Sub-seri populer</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Loncat langsung ke sub-seri spesifik yang sedang dicari kolektor.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {roots.flatMap((r) =>
                r.children.slice(0, 6).map((s) => (
                  <Link
                    key={s.id}
                    href={`/kategori/${s.slug}`}
                    className="rounded-full border border-rule bg-panel px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-brand-400/50 hover:text-brand-500"
                  >
                    {s.name}{" "}
                    <span className="ml-1 font-mono text-[10px] text-fg-subtle">
                      {s.listingCount}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
