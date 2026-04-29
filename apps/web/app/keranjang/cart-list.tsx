"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cartApi, type CartItem } from "@/lib/api/cart";
import { emitCartChanged } from "@/lib/cart-events";
import { conditionBadge } from "@/lib/condition-badge";

/**
 * Client cart with optimistic qty updates + remove. Server provides the
 * initial snapshot (SSR for fast first paint); this component owns
 * mutations after that. Subtotal recalculates locally so the buyer
 * sees the impact of every qty change before the server round-trip
 * settles.
 *
 * Unavailable items (sold out, hidden, deleted) render with a muted
 * style and a "Hapus" CTA — they're not selectable for checkout.
 */
export function CartList({
  initialItems,
  initialSubtotal,
}: {
  initialItems: CartItem[];
  initialSubtotal: number;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const subtotal = React.useMemo(
    () => items.filter((i) => i.available).reduce((acc, i) => acc + i.listing.priceIdr * i.qty, 0),
    [items],
  );
  const _initialSubtotal = initialSubtotal; // keep prop typed even if unused
  void _initialSubtotal;

  async function setQty(id: string, qty: number) {
    setBusy(id);
    setErr(null);
    const prev = items;
    // Optimistic — bump locally first so the subtotal updates instantly.
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, qty } : i)));
    try {
      await cartApi.update(id, qty);
      emitCartChanged();
    } catch (e) {
      setItems(prev);
      setErr(e instanceof Error ? e.message : "Gagal update qty.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    setErr(null);
    const prev = items;
    setItems((arr) => arr.filter((i) => i.id !== id));
    try {
      await cartApi.remove(id);
      emitCartChanged();
      router.refresh();
    } catch (e) {
      setItems(prev);
      setErr(e instanceof Error ? e.message : "Gagal hapus item.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3">
        {err && (
          <p role="alert" className="rounded-md border border-flame-400/40 bg-flame-400/10 px-3 py-2 text-xs text-flame-600">
            {err}
          </p>
        )}
        {items.map((it) => {
          const cond = conditionBadge(it.listing.condition);
          const itemBusy = busy === it.id;
          const lineIdr = it.listing.priceIdr * it.qty;
          return (
            <article
              key={it.id}
              className={
                "flex gap-4 rounded-md border border-rule bg-panel p-4 " +
                (it.available ? "" : "opacity-60")
              }
            >
              <Link
                href={`/listing/${it.listing.slug}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-rule bg-panel-2"
              >
                {it.listing.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.listing.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link href={`/listing/${it.listing.slug}`} className="text-sm font-semibold text-fg hover:text-brand-500">
                    {it.listing.title}
                  </Link>
                  <p className="text-sm font-extrabold text-fg">
                    Rp {lineIdr.toLocaleString("id-ID")}
                  </p>
                </div>
                <p className="mt-1 text-xs text-fg-muted">
                  {it.listing.seller.name ?? it.listing.seller.username}
                  {it.listing.seller.city ? ` · ${it.listing.seller.city}` : ""}
                </p>
                <p className="mt-1 inline-flex items-center gap-2 text-[11px] text-fg-subtle">
                  <span className="rounded border border-rule px-1.5 py-0.5">{cond.label}</span>
                  <span>Rp {it.listing.priceIdr.toLocaleString("id-ID")} / pcs</span>
                </p>

                {!it.available && (
                  <p className="mt-2 text-[11px] font-medium text-flame-600">
                    Listing sudah tidak tersedia. Hapus dari keranjang.
                  </p>
                )}

                <div className="mt-3 flex items-center gap-2">
                  {it.available && (
                    <div className="inline-flex h-8 items-center overflow-hidden rounded-md border border-rule">
                      <button
                        type="button"
                        disabled={itemBusy || it.qty <= 1}
                        onClick={() => setQty(it.id, Math.max(1, it.qty - 1))}
                        aria-label="Kurangi"
                        className="grid h-8 w-8 place-items-center text-fg-muted transition-colors hover:bg-panel-2 hover:text-fg disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="grid h-8 min-w-[2rem] place-items-center px-1 font-mono text-sm tabular-nums text-fg">
                        {it.qty}
                      </span>
                      <button
                        type="button"
                        disabled={itemBusy || it.qty >= it.listing.stock}
                        onClick={() => setQty(it.id, Math.min(it.listing.stock, it.qty + 1))}
                        aria-label="Tambah"
                        className="grid h-8 w-8 place-items-center text-fg-muted transition-colors hover:bg-panel-2 hover:text-fg disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(it.id)}
                    disabled={itemBusy}
                    className="text-xs font-semibold text-flame-600 disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-md border border-rule bg-panel p-5">
          <h2 className="text-sm font-bold text-fg">Ringkasan</h2>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-fg-muted">Subtotal</span>
            <span className="font-bold text-fg">Rp {subtotal.toLocaleString("id-ID")}</span>
          </div>
          <p className="mt-2 text-[11px] text-fg-subtle">
            Ongkir + biaya layanan dihitung di halaman checkout setelah kamu
            pilih alamat dan kurir.
          </p>
          {(() => {
            const firstAvailable = items.find((i) => i.available);
            const enabled = !!firstAvailable;
            return (
              <Link
                href={firstAvailable ? `/checkout?listing=${encodeURIComponent(firstAvailable.listing.slug)}` : "#"}
                aria-disabled={!enabled}
                onClick={(e) => { if (!enabled) e.preventDefault(); }}
                className={
                  "mt-4 inline-flex h-11 w-full items-center justify-center rounded-md text-sm font-semibold " +
                  (enabled
                    ? "bg-brand-500 text-white hover:bg-brand-600"
                    : "cursor-not-allowed bg-panel-2 text-fg-subtle")
                }
              >
                Lanjut ke checkout
              </Link>
            );
          })()}
          <p className="mt-2 text-[10px] text-fg-subtle">
            Catatan: checkout bertahap per item — kamu akan dipandu lewat tiap
            listing di keranjang.
          </p>
        </div>
      </aside>
    </div>
  );
}
