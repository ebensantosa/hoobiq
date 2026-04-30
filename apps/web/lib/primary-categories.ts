/**
 * Canonical top-level category order for the sidebar, home strip, and
 * /kategori index. Derived from the spec's 5-bucket taxonomy
 * (Collection Cards / Trading Cards / Merchandise / Toys / Others) so
 * the UI shows exactly those even if the DB still has stale level=1
 * rows from earlier seed iterations (action-figure, blind-box, komik
 * used to live at level=1 before being demoted under Toys/Others).
 *
 * Anything not in this list is hidden — the legacy rows are kept in
 * the DB intentionally so listings keep their categoryId, but they
 * don't belong in the primary nav anymore.
 */
export const PRIMARY_CATEGORY_SLUGS = [
  "collection-cards",
  "trading-cards",
  "merchandise",
  "toys",
  "others",
] as const;

export type PrimaryCategorySlug = (typeof PRIMARY_CATEGORY_SLUGS)[number];

const ORDER = new Map<string, number>(
  PRIMARY_CATEGORY_SLUGS.map((slug, i) => [slug, i]),
);

/** Filter & sort a category list down to the canonical primary set. */
export function pickPrimaryCategories<T extends { slug: string }>(items: T[]): T[] {
  return items
    .filter((c) => ORDER.has(c.slug))
    .sort((a, b) => (ORDER.get(a.slug)! - ORDER.get(b.slug)!));
}
