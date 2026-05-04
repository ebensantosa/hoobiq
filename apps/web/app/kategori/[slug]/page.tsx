import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ListingCard } from "@/components/listing-card";
import { Stat } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/session";
import type { ListingSummary } from "@hoobiq/types";

export const dynamic = "force-dynamic";

type Node = {
  id: string;
  slug: string;
  name: string;
  level: number;
  parentId: string | null;
  listingCount: number;
  imageUrl: string | null;
  children: Node[];
};

type SearchParams = {
  sort?: string;
  condition?: string;
};

const CONDITION_TABS = [
  { key: undefined,           label: "Semua kondisi" },
  { key: "BRAND_NEW_SEALED",  label: "Brand New" },
  { key: "LIKE_NEW",          label: "Like New" },
  { key: "EXCELLENT",         label: "Excellent" },
  { key: "GOOD",              label: "Good" },
  { key: "FAIR",              label: "Fair" },
  { key: "POOR",              label: "Poor" },
];

const SORT_TABS = [
  { key: "newest",     label: "Terbaru" },
  { key: "price_asc",  label: "Termurah" },
  { key: "price_desc", label: "Termahal" },
];

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const sort = sp.sort && SORT_TABS.some((s) => s.key === sp.sort) ? sp.sort : "newest";
  const condition = sp.condition && /^(BRAND_NEW_SEALED|LIKE_NEW|EXCELLENT|GOOD|FAIR|POOR)$/.test(sp.condition) ? sp.condition : null;

  // Build the listings query — same shape the marketplace uses.
  const q = new URLSearchParams();
  q.set("categorySlug", slug);
  q.set("sort", sort);
  q.set("limit", "24");
  if (condition) q.set("condition", condition);

  const [tree, listingsRes, me] = await Promise.all([
    // No data-cache: user-uploaded category images need to show up
    // immediately after admin saves them (the 60s Next.js cache layered
    // on top of the API's own 60s Redis cache otherwise compounded
    // into a ~2-minute lag).
    serverApi<Node[]>("/categories"),
    serverApi<{ items: ListingSummary[]; nextCursor: string | null }>(`/listings?${q}`),
    getSessionUser(),
  ]);

  if (!tree) notFound();
  const found = findInTree(tree, slug);
  if (!found) notFound();
  const { node, ancestors } = found;

  const items = listingsRes?.items ?? [];
  const subcategories = node.children;
  const hasChildren = subcategories.length > 0;
  const breadcrumb = ["Kategori", ...ancestors.map((a) => a.name), node.name];

  // Spec navigation: drill-down through every level that has
  // children, fall through to the listing grid only when we reach a
  // leaf category. So:
  //   /kategori          (L1 picker — primary buckets)
  //   /kategori/<L1>     (L2 picker — sub-categories)
  //   /kategori/<L2>     (L3 picker — series / sets, when present)
  //   /kategori/<leaf>   (listing grid)
  // No redirect — the buyer always lands on a real picker until
  // there's nothing left to refine.

  if (hasChildren) {
    return (
      <AppShell active="Kategori">
        <div className="px-4 pb-8 sm:px-6 lg:px-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            {breadcrumb.join(" · ")}
          </div>

          {/* Hero banner — kategori cover image as the visual anchor.
              Falls back to a tinted gradient when admin hasn't uploaded
              one yet. Sits between breadcrumb and the title bar. */}
          <div className="relative mt-3 aspect-[16/5] w-full overflow-hidden rounded-3xl border border-rule bg-gradient-to-br from-brand-200 via-ultra-200 to-flame-200 dark:from-brand-500/20 dark:via-ultra-500/15 dark:to-flame-500/20">
            {node.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={node.imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
              </>
            ) : (
              <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.5),transparent),radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.35),transparent)] dark:opacity-20" />
            )}
            <div className={"relative flex h-full flex-col justify-end gap-1 p-6 md:p-8 " + (node.imageUrl ? "text-white" : "text-fg")}>
              <span className={"font-mono text-[10px] uppercase tracking-[0.22em] " + (node.imageUrl ? "text-white/80" : "text-fg-subtle")}>
                {node.level === 1 ? "Kategori utama" : "Sub-kategori"}
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">{node.name}.</h1>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-8">
            <div className="max-w-2xl">
              <p className="max-w-[56ch] text-fg-muted">
                {node.level === 1
                  ? "Jelajahi sub-kategori dan temukan koleksi yang kamu cari."
                  : "Jelajahi series/set dan temukan koleksi yang kamu cari."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <Stat value={node.listingCount.toLocaleString("id-ID")} label="Listing" />
              <Stat value={subcategories.length.toLocaleString("id-ID")} label={node.level === 1 ? "Sub-kategori" : "Series/Set"} accent="gold" />
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {subcategories.map((c) => (
              <Link
                key={c.slug}
                href={`/kategori/${c.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-rule bg-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/60 hover:shadow-[0_8px_24px_-12px] hover:shadow-brand-400/40"
              >
                <div className="relative flex aspect-[16/9] items-end overflow-hidden bg-gradient-to-br from-brand-100 to-ultra-50 p-5">
                  {c.imageUrl && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.imageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
                    </>
                  )}
                  <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/85 text-fg shadow-sm backdrop-blur">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
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
                      {c.children.length > 4 ? ` · +${c.children.length - 4}` : ""}
                    </p>
                  )}
                  <span className="mt-2 inline-flex items-center text-sm font-semibold text-brand-500">
                    Jelajahi
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href={`/marketplace?cat=${encodeURIComponent(slug)}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rule bg-panel px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:border-brand-400/50 hover:text-brand-500"
            >
              Atau lihat semua {node.name} di marketplace
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const siblingFallback = ancestors.length > 0 ? ancestors[ancestors.length - 1]!.children.filter((c) => c.slug !== slug).slice(0, 8) : [];
  const subsetChips = subcategories.length > 0 ? subcategories.slice(0, 8) : siblingFallback;

  return (
    <AppShell active="Kategori">
      <div className="px-4 pb-8 sm:px-6 lg:px-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          {breadcrumb.join(" · ")}
        </div>

        <div className="relative mt-3 aspect-[16/5] w-full overflow-hidden rounded-3xl border border-rule bg-gradient-to-br from-brand-200 via-ultra-200 to-flame-200 dark:from-brand-500/20 dark:via-ultra-500/15 dark:to-flame-500/20">
          {node.imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={node.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
            </>
          ) : (
            <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.5),transparent),radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.35),transparent)] dark:opacity-20" />
          )}
          <div className={"relative flex h-full flex-col justify-end gap-1 p-6 md:p-8 " + (node.imageUrl ? "text-white" : "text-fg")}>
            <span className={"font-mono text-[10px] uppercase tracking-[0.22em] " + (node.imageUrl ? "text-white/80" : "text-fg-subtle")}>
              Series / Set
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">{node.name}.</h1>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-8">
          <div className="max-w-2xl">
            <p className="max-w-[56ch] text-fg-muted">
              {descriptionFor(node, ancestors)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <Stat value={node.listingCount.toLocaleString("id-ID")} label="Listing" />
            <Stat
              value={subcategories.length.toLocaleString("id-ID")}
              label="Sub-kategori"
              accent="gold"
            />
          </div>
        </div>

        {subsetChips.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {subcategories.length === 0 && ancestors.length > 0 && (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
                Sub-seri lain di {ancestors[ancestors.length - 1]!.name}:
              </span>
            )}
            {subsetChips.map((c) => (
              <Link
                key={c.slug}
                href={`/kategori/${c.slug}`}
                className="rounded-full border border-rule px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-brand-400/50 hover:text-fg"
              >
                {c.name}
                {c.listingCount > 0 && (
                  <span className="ml-1.5 font-mono text-[10px] text-fg-subtle">{c.listingCount}</span>
                )}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            Listing aktif · {node.listingCount.toLocaleString("id-ID")}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <FilterTabs slug={slug} sort={sort} condition={condition} type="condition" />
            <FilterTabs slug={slug} sort={sort} condition={condition} type="sort" />
          </div>
        </div>

        {listingsRes === null ? (
          <div className="mt-6 rounded-xl border border-flame-400/30 bg-flame-400/5 p-4 text-sm">
            <p className="font-medium text-fg">Gagal memuat listing</p>
            <p className="mt-1 text-fg-muted">Pastikan API jalan di <code>http://localhost:4000</code>.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-xl border border-rule bg-panel/40 p-10 text-center">
            <p className="text-base font-medium text-fg">Belum ada listing di kategori ini.</p>
            <p className="mt-1 text-sm text-fg-muted">
              Jadi yang pertama!{" "}
              <Link href="/upload" className="text-brand-500">Pasang listing</Link>.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((l) => (
              <ListingCard key={l.id} l={l} meUsername={me?.username ?? null} />
            ))}
          </div>
        )}

        {items.length >= 24 && (
          <div className="mt-10 text-center">
            <Link
              href={`/marketplace?cat=${encodeURIComponent(slug)}${condition ? `&condition=${condition}` : ""}${sort !== "newest" ? `&sort=${sort}` : ""}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rule bg-panel px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:border-brand-400/50 hover:text-brand-500"
            >
              Lihat semua di marketplace
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/** Walk the tree and return the matching node with its ancestor chain. */
function findInTree(roots: Node[], slug: string, trail: Node[] = []): { node: Node; ancestors: Node[] } | null {
  for (const r of roots) {
    if (r.slug === slug) return { node: r, ancestors: trail };
    const child = findInTree(r.children, slug, [...trail, r]);
    if (child) return child;
  }
  return null;
}

function descriptionFor(node: Node, ancestors: Node[]): string {
  if (ancestors.length === 0) {
    return `Semua listing kolektor Indonesia di kategori ${node.name}, terorganisir sampai sub-seri.`;
  }
  const path = [...ancestors.map((a) => a.name), node.name].join(" › ");
  return `Listing ${node.name} dari kolektor Indonesia. Path: ${path}.`;
}

function FilterTabs({
  slug, sort, condition, type,
}: {
  slug: string;
  sort: string;
  condition: string | null;
  type: "condition" | "sort";
}) {
  const tabs = type === "condition" ? CONDITION_TABS : SORT_TABS;
  return (
    <div className="flex items-center gap-1.5">
      {tabs.map((t) => {
        const isActive = type === "condition"
          ? (t.key ?? null) === condition
          : t.key === sort;
        const params = new URLSearchParams();
        if (type === "condition") {
          if (t.key) params.set("condition", t.key);
          if (sort !== "newest") params.set("sort", sort);
        } else {
          if (t.key && t.key !== "newest") params.set("sort", t.key);
          if (condition) params.set("condition", condition);
        }
        const href = `/kategori/${slug}${params.toString() ? `?${params.toString()}` : ""}`;
        return (
          <Link
            key={t.label}
            href={href}
            className={
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
              (isActive
                ? "bg-brand-400 text-white"
                : "border border-rule text-fg-muted hover:border-brand-400/50 hover:text-fg")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
