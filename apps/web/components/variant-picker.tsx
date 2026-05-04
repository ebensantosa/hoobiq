"use client";
import * as React from "react";
import Link from "next/link";

type Variant = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  priceIdr?: number | null;
  stock: number;
};

/**
 * Buyer-side variant picker rendered on the listing detail page when
 * `listing.hasVariants`. Selecting a chip locks the active variant id
 * into the "Beli sekarang" URL so the checkout knows which SKU to
 * decrement. Empty / unselected state disables the buy button — the
 * server rejects checkouts without a variant id when the listing has
 * variants anyway, but it's friendlier to gate it client-side too.
 */
export function VariantPicker({
  groupName,
  variants,
  basePriceIdr,
  buyHref,
  loginHref,
  isLoggedIn,
  ownListing,
}: {
  groupName: string;
  variants: Variant[];
  basePriceIdr: number;
  /** Buy link without variant query param — picker appends `&variant=<id>`. */
  buyHref: string;
  /** Where to send anonymous buyers — same as the Beli button's anonymous fallback. */
  loginHref: string;
  isLoggedIn: boolean;
  ownListing: boolean;
}) {
  const firstAvailable = variants.find((v) => v.stock > 0);
  const [picked, setPicked] = React.useState<string | null>(firstAvailable?.id ?? null);
  const sel = variants.find((v) => v.id === picked) ?? null;
  const price = sel?.priceIdr ?? basePriceIdr;
  const stockOk = !!sel && sel.stock > 0;

  const finalHref = sel
    ? `${buyHref}${buyHref.includes("?") ? "&" : "?"}variant=${encodeURIComponent(sel.id)}`
    : buyHref;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">
          {groupName || "Variasi"}{sel ? ` · ${sel.name}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {variants.map((v) => {
            const active = v.id === picked;
            const disabled = v.stock <= 0;
            return (
              <button
                key={v.id}
                type="button"
                disabled={disabled}
                onClick={() => setPicked(v.id)}
                className={
                  "group flex min-w-[88px] items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs font-semibold transition-all " +
                  (disabled
                    ? "cursor-not-allowed border-rule bg-panel-2/30 text-fg-subtle line-through"
                    : active
                      ? "border-brand-500 bg-brand-500/10 text-fg shadow-sm"
                      : "border-rule bg-panel text-fg-muted hover:border-brand-400/60 hover:text-fg")
                }
                title={disabled ? "Stok habis" : v.description ?? undefined}
              >
                {v.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                ) : (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-panel-2 text-[10px] font-bold text-fg-subtle">
                    {v.name[0]?.toUpperCase()}
                  </span>
                )}
                <span className="flex flex-col">
                  <span>{v.name}</span>
                  <span className="text-[10px] font-normal text-fg-subtle">
                    {disabled ? "Habis" : `Stok ${v.stock}`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-rule bg-panel/40 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">Harga aktif</p>
        <p className="mt-0.5 text-2xl font-extrabold text-brand-600 dark:text-brand-400">
          Rp {price.toLocaleString("id-ID")}
        </p>
        {sel?.description && (
          <p className="mt-1 text-xs text-fg-muted">{sel.description}</p>
        )}
      </div>

      {ownListing ? (
        <button disabled className="inline-flex h-12 items-center justify-center rounded-md bg-panel-2 px-6 text-sm font-semibold text-fg-subtle">
          Listing kamu
        </button>
      ) : !stockOk ? (
        <button disabled className="inline-flex h-12 items-center justify-center rounded-md bg-panel-2 px-6 text-sm font-semibold text-fg-subtle">
          Pilih variasi yang masih tersedia
        </button>
      ) : (
        <Link
          href={isLoggedIn ? finalHref : loginHref}
          className="inline-flex h-12 items-center justify-center rounded-md bg-brand-500 px-6 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Beli sekarang
        </Link>
      )}
    </div>
  );
}
