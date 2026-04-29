"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Top-of-feed tab strip — "For You · Following · Marketplace". Mirrors
 * the layout pattern from the design reference: a single switch row
 * that doubles as the buyer's mental map of what they're browsing.
 *
 *   For You    → default feed (?tab unset / ?tab=foryou)
 *   Following  → posts filtered to people you follow (gracefully falls
 *                back to all posts until the follow graph lands)
 *   Marketplace → bounces to /marketplace (cross-surface link)
 *
 * The active state uses a brand-tinted underline + filled pill so it
 * reads as a real tab on both light and dark themes.
 */
export function FeedTabs() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const tab = sp.get("tab") ?? "foryou";

  const items = [
    { key: "foryou",    label: "For You",     href: makeHref(pathname, sp, { tab: null }) },
    { key: "following", label: "Following",   href: makeHref(pathname, sp, { tab: "following" }) },
    { key: "market",    label: "Marketplace", href: "/marketplace" },
  ];

  return (
    <div className="-mx-1 flex items-center gap-1 overflow-x-auto rounded-md border border-rule bg-panel p-1">
      {items.map((it) => {
        const active = it.key === "market"
          ? false
          : (it.key === "foryou" && tab !== "following") || (it.key === "following" && tab === "following");
        return (
          <Link
            key={it.key}
            href={it.href}
            className={
              "shrink-0 rounded-sm px-4 py-2 text-sm font-semibold transition-colors " +
              (active
                ? "bg-brand-500 text-white shadow-sm"
                : "text-fg-muted hover:bg-panel-2 hover:text-fg")
            }
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}

function makeHref(pathname: string, sp: ReturnType<typeof useSearchParams>, patch: Record<string, string | null>) {
  const params = new URLSearchParams(sp.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) params.delete(k);
    else params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
