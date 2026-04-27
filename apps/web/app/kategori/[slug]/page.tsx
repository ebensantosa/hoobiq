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
  children: Node[];
};

type SearchParams = {
  sort?: string;
  condition?: string;
};

const CONDITION_TABS = [
  { key: undefined,  label: "Semua kondisi" },
  { key: "MINT",      label: "Mint" },
  { key: "NEAR_MINT", label: "Near Mint" },
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
  const condition = sp.condition && /^(MINT|NEAR_MINT|EXCELLENT|GOOD|FAIR)$/.test(sp.condition) ? sp.condition : null;

  // Build the listings query — same shape the marketplace uses.
  const q = new URLSearchParams();
  q.set("categorySlug", slug);
  q.set("sort", sort);
  q.set("limit", "24");
  if (condition) q.set("condition", condition);

  const [tree, listingsRes, me] = await Promise.all([
    serverApi<Node[]>("/categories", { revalidate: 60 }),
    serverApi<{ items: ListingSummary[]; nextCursor: string | null }>(`/listings?${q}`),
    getSessionUser(),
  ]);

  if (!tree) notFound();
  const found = findInTree(tree, slug);
  if (!found) notFound();
  const { node, ancestors } = found;

  const items = listingsRes?.items ?? [];
  const subcategories = node.children.slice(0, 8);
  const siblingFallback = ancestors.length > 0 ? ancestors[ancestors.length - 1]!.children.filter((c) => c.slug !== slug).slice(0, 8) : [];
  const subsetChips = subcategories.length > 0 ? subcategories : siblingFallback;

  const breadcrumb = ["Kategori", ...ancestors.map((a) => a.name), node.name];

  return (
    <AppShell active="Kategori">
      <div className="px-6 pb-8 lg:px-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          {breadcrumb.join(" · ")}
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold text-fg md:text-5xl">{node.name}.</h1>
            <p className="mt-4 max-w-[56ch] text-fg-muted">
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
              <Link href="/upload" className="text-brand-500 hover:underline">Pasang listing</Link>.
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
              Lihat semua di marketplace →
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
