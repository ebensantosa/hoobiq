"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { cartApi } from "@/lib/api/cart";
import { ApiError } from "@/lib/api/client";
import { emitCartChanged } from "@/lib/cart-events";
import { useToast } from "./toast-provider";

/**
 * Compact "+ Keranjang" pill rendered on the listing card. Clicking it
 * fires POST /cart, broadcasts a window event so the nav badge updates
 * instantly, and opens a small confirmation modal asking the buyer if
 * they want to head to /keranjang or keep shopping. No reload needed.
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
  const toast = useToast();
  const [pending, setPending] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);

  const disabled = !!ownListing || !!outOfStock || pending;
  const reason = ownListing ? "Listing kamu sendiri" : outOfStock ? "Stok habis" : undefined;

  function add(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setPending(true);
    cartApi.add(listingId, 1)
      .then(() => {
        // Notify the nav badge + any other cart-aware surface to refetch.
        emitCartChanged();
        setShowModal(true);
      })
      .catch((err) => {
        const msg =
          err instanceof ApiError ? err.message :
          err instanceof Error ? err.message :
          "Gagal tambah ke keranjang.";
        toast.error("Gagal tambah ke keranjang", msg);
      })
      .finally(() => setPending(false));
  }

  const cls =
    "inline-flex items-center justify-center gap-1 rounded-md border font-semibold transition-colors " +
    (size === "sm" ? "h-7 px-2 text-[10px]" : "h-9 px-3 text-xs") +
    " " +
    (disabled
      ? "cursor-not-allowed border-rule bg-panel-2 text-fg-subtle"
      : "border-rule bg-panel text-fg hover:border-brand-400/60 hover:bg-brand-400/5 hover:text-brand-500");

  return (
    <>
      <button
        type="button"
        onClick={add}
        disabled={disabled}
        title={reason ?? "Tambah ke keranjang"}
        className={cls}
        aria-label="Tambah ke keranjang"
      >
        {pending ? (
          <>
            <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Menambah…</span>
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

      {showModal && <AddedModal onClose={() => setShowModal(false)} />}
    </>
  );
}

function AddedModal({ onClose }: { onClose: () => void }) {
  // Render into document.body via a portal — the listing card uses
  // `transform` for its hover lift + `overflow-hidden` for clipping, and
  // a transformed ancestor traps `position: fixed` descendants inside
  // its own box (CSS spec). Without the portal the modal renders
  // *inside* the card that opened it, looking like a tiny tooltip.
  // SSR guard: the portal can only attach after the document exists.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  // Close on Esc + lock body scroll while open.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!mounted) return null;

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-added-title"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-t-2xl bg-panel shadow-2xl sm:rounded-2xl"
      >
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <div>
            <p id="cart-added-title" className="text-base font-bold text-fg">
              Berhasil ditambahkan ke keranjang
            </p>
            <p className="mt-1 text-xs text-fg-muted">
              Mau cek keranjang sekarang atau lanjut belanja dulu?
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-rule p-4 sm:flex-row-reverse">
          <Link
            href="/keranjang"
            onClick={onClose}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Lihat keranjang
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-rule bg-panel px-4 text-sm font-semibold text-fg-muted transition-colors hover:border-brand-400/60 hover:text-fg"
          >
            Lanjut belanja
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
