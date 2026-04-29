"use client";

import * as React from "react";
import Link from "next/link";

type Node = {
  id: string;
  slug: string;
  name: string;
  level: number;
  listingCount: number;
  children: Node[];
};

/**
 * Inline expandable category tree for /kategori. Spec: a small chevron
 * next to the level-1 row reveals its sub-categories; another chevron on
 * each sub reveals its sub-sub. The whole leaf row is a link to
 * /kategori/<slug> so the buyer can both browse the tree AND jump
 * straight to listings without leaving the page.
 *
 * Stays as a complement to the kotak-kotak grid above — the grid is
 * scannable; this tree is for users who already know what they want
 * and prefer to drill in without a route change.
 */
export function CategoryTreeView({ roots }: { roots: Node[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-rule bg-panel">
      {roots.map((n, i) => (
        <Row key={n.id} node={n} depth={0} hasBorderTop={i > 0} />
      ))}
    </div>
  );
}

function Row({ node, depth, hasBorderTop }: { node: Node; depth: number; hasBorderTop: boolean }) {
  // Default closed. The buyer expands what interests them; otherwise the
  // whole tree would be a wall of text on first load.
  const [open, setOpen] = React.useState(false);
  const hasKids = node.children.length > 0;

  return (
    <div className={hasBorderTop ? "border-t border-rule" : ""}>
      <div
        className="flex items-center gap-2 px-4 py-3 transition-colors hover:bg-panel-2"
        style={{ paddingLeft: 16 + depth * 16 }}
      >
        {hasKids ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? `Tutup ${node.name}` : `Buka ${node.name}`}
            aria-expanded={open}
            className="grid h-6 w-6 shrink-0 place-items-center rounded text-fg-subtle transition-colors hover:bg-panel-2 hover:text-fg"
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={"transition-transform " + (open ? "rotate-90" : "")}
            >
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}

        <Link
          href={`/kategori/${node.slug}`}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
        >
          <span
            className={
              "truncate font-medium transition-colors hover:text-brand-500 " +
              (depth === 0 ? "text-base text-fg" : depth === 1 ? "text-sm text-fg" : "text-xs text-fg-muted")
            }
          >
            {node.name}
          </span>
          <span className="shrink-0 rounded-full bg-panel-2 px-2 py-0.5 font-mono text-[10px] text-fg-muted">
            {node.listingCount.toLocaleString("id-ID")}
          </span>
        </Link>
      </div>

      {hasKids && open && (
        <div className="bg-canvas/40">
          {node.children.map((c, i) => (
            <Row key={c.id} node={c} depth={depth + 1} hasBorderTop={i > 0} />
          ))}
        </div>
      )}
    </div>
  );
}
