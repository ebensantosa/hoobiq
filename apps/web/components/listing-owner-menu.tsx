"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listingsWriteApi } from "@/lib/api/listings-write";

/**
 * Owner-only kebab menu for marketplace cards. Sits absolutely over the
 * card link — kept as a sibling to avoid nesting a button inside an anchor.
 */
export function ListingOwnerMenu({
  listingId,
  slug,
  onRemoved,
}: {
  listingId: string;
  slug: string;
  onRemoved?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function remove() {
    if (pending) return;
    if (!window.confirm("Hapus listing ini? Tindakan tidak bisa dibatalkan.")) return;
    setPending(true);
    try {
      await listingsWriteApi.remove(listingId);
      setOpen(false);
      if (onRemoved) onRemoved();
      else router.refresh();
    } catch {
      alert("Gagal menghapus listing.");
      setPending(false);
    }
  }

  return (
    <div ref={ref} className="absolute right-2 top-2 z-10">
      <button
        type="button"
        aria-label="Lainnya"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>
      {open && (
        <div
          role="menu"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-rule bg-panel shadow-xl ring-1 ring-black/5 origin-top-right animate-menu-pop"
        >
          <Link
            role="menuitem"
            href={`/jual/${slug}/edit`}
            className="block px-4 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-panel-2 hover:text-fg"
          >
            Edit listing
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={remove}
            disabled={pending}
            className="block w-full px-4 py-2 text-left text-sm text-flame-400 transition-colors hover:bg-panel-2 disabled:opacity-50"
          >
            {pending ? "Menghapus…" : "Hapus"}
          </button>
        </div>
      )}
    </div>
  );
}
