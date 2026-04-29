"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { cartApi } from "@/lib/api/cart";
import { ApiError } from "@/lib/api/client";

/**
 * Compact "+ Keranjang" pill rendered on the listing card. Clicking it
 * fires POST /cart and shows a brief toast-style confirmation inline.
 * Does NOT navigate — staying on the grid lets the buyer keep adding
 * items. The cart count in the nav refreshes via router.refresh().
 *
 * Disabled for the listing's owner and for sold-out items so the
 * card layout stays consistent (button always present, just inert).
 */
export function CartButton({
  listingId,
  ownListing,
  outOfStock,
  size = "md",
}: {
  listingId: string;
  ownListing?: boolean;
  outOfStock?: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [done, setDone] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const disabled = !!ownListing || !!outOfStock || pending;
  const reason = ownListing ? "Listing kamu sendiri" : outOfStock ? "Stok habis" : undefined;

  function add(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setErr(null);
    start(async () => {
      try {
        await cartApi.add(listingId, 1);
        setDone(true);
        // Brief check; revert so the button is reusable for variants
        // the buyer might want to add later.
        window.setTimeout(() => setDone(false), 1500);
        router.refresh();
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal tambah ke keranjang.");
        window.setTimeout(() => setErr(null), 2000);
      }
    });
  }

  const cls =
    "inline-flex items-center justify-center gap-1 rounded-md border font-semibold transition-colors " +
    (size === "sm" ? "h-7 px-2 text-[10px]" : "h-9 px-3 text-xs") +
    " " +
    (disabled
      ? "cursor-not-allowed border-rule bg-panel-2 text-fg-subtle"
      : done
        ? "border-emerald-400 bg-emerald-500/10 text-emerald-600"
        : "border-rule bg-panel text-fg hover:border-brand-400/60 hover:bg-brand-400/5 hover:text-brand-500");

  return (
    <button
      type="button"
      onClick={add}
      disabled={disabled}
      title={reason ?? (err ?? "Tambah ke keranjang")}
      className={cls}
      aria-label="Tambah ke keranjang"
    >
      {done ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>Ditambah</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1.5" />
            <circle cx="18" cy="21" r="1.5" />
            <path d="M3 3h2l3.6 11.59a2 2 0 0 0 2 1.41h7.7a2 2 0 0 0 2-1.59L23 6H6" />
          </svg>
          <span>Keranjang</span>
        </>
      )}
    </button>
  );
}
