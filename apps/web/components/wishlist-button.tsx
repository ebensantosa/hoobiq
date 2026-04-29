"use client";
import * as React from "react";
import { wishlistApi, type WishlistItem } from "@/lib/api/wishlist";
import { ApiError } from "@/lib/api/client";
import { useToast } from "./toast-provider";

/**
 * Heart-toggle wishlist button. Mounts on listing cards (compact icon)
 * and on the listing detail page (full button with label). Loads the
 * user's wishlist once on mount to know the initial saved state, then
 * optimistically toggles on click.
 */
export function WishlistButton({
  listingId,
  variant = "full",
}: {
  listingId: string;
  variant?: "full" | "icon";
}) {
  const toast = useToast();
  const [saved, setSaved] = React.useState<boolean | null>(null);
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    let alive = true;
    wishlistApi.list()
      .then((res) => {
        if (!alive) return;
        const has = res.items.some((w: WishlistItem) => w.listing.id === listingId);
        setSaved(has);
      })
      .catch(() => { if (alive) setSaved(false); });
    return () => { alive = false; };
  }, [listingId]);

  function toggle(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (saved === null) return;
    const next = !saved;
    setSaved(next);
    start(async () => {
      try {
        if (next) await wishlistApi.add(listingId);
        else      await wishlistApi.remove(listingId);
        if (next) toast.success("Tersimpan ke wishlist", "");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
          window.location.href = `/masuk?next=${encodeURIComponent(here)}`;
          return;
        }
        setSaved(!next);
        toast.error("Gagal", "Coba lagi sebentar.");
      }
    });
  }

  const isSaved = saved === true;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={isSaved ? "Hapus dari wishlist" : "Tambah ke wishlist"}
        aria-pressed={isSaved}
        disabled={pending || saved === null}
        className={
          "grid h-9 w-9 place-items-center rounded-full border bg-canvas/85 backdrop-blur transition-colors " +
          (isSaved
            ? "border-flame-400/60 text-flame-500"
            : "border-rule text-fg-subtle hover:border-flame-400/60 hover:text-flame-500")
        }
      >
        <Heart filled={isSaved} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isSaved}
      disabled={pending || saved === null}
      className={
        "inline-flex h-12 items-center justify-center gap-2 rounded-md border px-5 text-sm font-semibold transition-colors disabled:opacity-60 " +
        (isSaved
          ? "border-flame-400/60 bg-flame-400/10 text-flame-600 dark:text-flame-300 hover:bg-flame-400/15"
          : "border-rule bg-panel text-fg hover:border-flame-400/60 hover:text-flame-500")
      }
    >
      <Heart filled={isSaved} />
      {isSaved ? "Tersimpan" : "Wishlist"}
    </button>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}
