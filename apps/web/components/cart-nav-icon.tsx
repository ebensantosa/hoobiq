"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cartApi } from "@/lib/api/cart";
import { onCartChanged } from "@/lib/cart-events";

/**
 * Cart icon in the top nav with a live count badge. Refetches the count
 * whenever the route changes (cheap GET /cart/count) AND whenever any
 * client surface emits the `hoobiq:cart:changed` event after an
 * add/update/remove. That removes the "I need to reload to see the
 * badge" feel — the icon now updates the moment the buyer hits "+".
 */
export function CartNavIcon() {
  const pathname = usePathname();
  const [count, setCount] = React.useState(0);

  const refetch = React.useCallback(() => {
    let alive = true;
    cartApi.count()
      .then((r) => { if (alive) setCount(r.totalQty); })
      .catch(() => { /* anonymous = no count, keep 0 */ });
    return () => { alive = false; };
  }, []);

  React.useEffect(() => refetch(), [pathname, refetch]);
  React.useEffect(() => onCartChanged(refetch), [refetch]);

  return (
    <Link
      href="/keranjang"
      aria-label="Keranjang"
      className="relative grid h-10 w-10 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-panel hover:text-fg"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1.5" />
        <circle cx="18" cy="21" r="1.5" />
        <path d="M3 3h2l3.6 11.59a2 2 0 0 0 2 1.41h7.7a2 2 0 0 0 2-1.59L23 6H6" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-brand-500 px-1 font-mono text-[9px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
