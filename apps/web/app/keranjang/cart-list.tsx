"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cartApi, type CartItem } from "@/lib/api/cart";
import { emitCartChanged } from "@/lib/cart-events";
import { conditionBadge } from "@/lib/condition-badge";

/**
 * Cart with marketplace-style seller grouping + checkbox selection
 * (Shopee/Tokopedia pattern). Selecting a seller checkbox toggles all
 * of that seller's items; the global "pilih semua" toggles every
 * available item across all sellers. Subtotal/shipping summary in the
 * sticky right-hand sidebar reflects only checked items, and the
 * "Lanjut ke Checkout" CTA hands the selected cart-item ids to the
 * checkout page via ?cart=… so the multi-item flow can pick them up.
 *
 * Unavailable items (sold out, hidden, deleted) render dimmed with a
 * "Hapus" CTA and cannot be selected — they short-circuit the
 * "select all" toggles, just like Shopee greys them out.
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

  // Selection state — Set of cart item ids the buyer has ticked.
  // Default: every available item starts ticked, matching the spec's
  // "expected: all valid items proceed to checkout" intent.
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(initialItems.filter((i) => i.available).map((i) => i.id)),
  );
  const _initialSubtotal = initialSubtotal;
  void _initialSubtotal;

  // Group items by seller username so the cart renders one card per
  // seller. Order preserved by first-appearance so the buyer's mental
  // model (most recently added at top) stays intact across re-renders.
  const groups = React.useMemo(() => {
    const order: string[] = [];
    const byUsername = new Map<string, { seller: CartItem["listing"]["seller"]; items: CartItem[] }>();
    for (const it of items) {
      const u = it.listing.seller.username;
      if (!byUsername.has(u)) {
        order.push(u);
        byUsername.set(u, { seller: it.listing.seller, items: [] });
      }
      byUsername.get(u)!.items.push(it);
    }
    return order.map((u) => byUsername.get(u)!);
  }, [items]);

  // Counts and totals across the current selection. The right-hand
  // summary reads from these, so subtotal updates instantly as the
  // buyer ticks/unticks rows.
  const totals = React.useMemo(() => {
    let count = 0;
    let qty = 0;
    let subtotalIdr = 0;
    for (const it of items) {
      if (!selected.has(it.id) || !it.available) continue;
      count += 1;
      qty += it.qty;
      subtotalIdr += it.listing.priceIdr * it.qty;
    }
    return { count, qty, subtotalIdr };
  }, [items, selected]);

  const allAvailableIds = React.useMemo(
    () => items.filter((i) => i.available).map((i) => i.id),
    [items],
  );
  const allChecked = allAvailableIds.length > 0 && allAvailableIds.every((id) => selected.has(id));
  const someChecked = totals.count > 0;

  function toggleOne(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSeller(group: typeof groups[number], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const it of group.items) {
        if (!it.available) continue;
        if (on) next.add(it.id);
        else next.delete(it.id);
      }
      return next;
    });
  }

  function toggleAll(on: boolean) {
    if (on) setSelected(new Set(allAvailableIds));
    else setSelected(new Set());
  }

  async function setQty(id: string, qty: number) {
    setBusy(id);
    setErr(null);
    const prev = items;
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
    setSelected((s) => {
      const next = new Set(s); next.delete(id); return next;
    });
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

  // "Lanjut ke checkout" — pass selected cart item ids to the
  // checkout page so it can pick exactly those rows. Items not
  // ticked stay in the cart, untouched.
  const checkoutHref = someChecked
    ? `/checkout?cart=${encodeURIComponent(Array.from(selected).join(","))}`
    : "#";

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        {err && (
          <p role="alert" className="rounded-md border border-flame-400/40 bg-flame-400/10 px-3 py-2 text-xs text-flame-600">
            {err}
          </p>
        )}

        {/* Global "Pilih semua" header — mirrors the marketplace
            cart pattern. Indeterminate state when some-but-not-all
            available items are ticked. */}
        <div className="flex items-center justify-between gap-3 rounded-md border border-rule bg-panel px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-fg">
            <Checkbox
              checked={allChecked}
              indeterminate={!allChecked && someChecked}
              disabled={allAvailableIds.length === 0}
              onChange={(on) => toggleAll(on)}
            />
            <span>Pilih semua ({allAvailableIds.length})</span>
          </label>
          {totals.count > 0 && (
            <p className="text-xs text-fg-muted">
              {totals.count} item terpilih
            </p>
          )}
        </div>

        {groups.map((g) => {
          const groupAvailable = g.items.filter((i) => i.available);
          const groupChecked =
            groupAvailable.length > 0
            && groupAvailable.every((i) => selected.has(i.id));
          const groupSome =
            groupAvailable.some((i) => selected.has(i.id)) && !groupChecked;
          return (
            <section key={g.seller.username} className="rounded-md border border-rule bg-panel">
              {/* Seller header — checkbox here selects/deselects every
                  available item under this seller in one go. */}
              <header className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-fg">
                  <Checkbox
                    checked={groupChecked}
                    indeterminate={groupSome}
                    disabled={groupAvailable.length === 0}
                    onChange={(on) => toggleSeller(g, on)}
                  />
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-subtle">
                      <path d="m2 7 1.5-4h17L22 7"/><path d="M4 12v9h16v-9"/><path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                    {g.seller.name ?? `@${g.seller.username}`}
                  </span>
                </label>
                {g.seller.city && (
                  <p className="text-[11px] text-fg-subtle">{g.seller.city}</p>
                )}
              </header>

              <ul className="divide-y divide-rule">
                {g.items.map((it) => {
                  const cond = conditionBadge(it.listing.condition);
                  const itemBusy = busy === it.id;
                  const lineIdr = it.listing.priceIdr * it.qty;
                  const isChecked = selected.has(it.id);
                  return (
                    <li
                      key={it.id}
                      className={
                        "flex gap-3 px-4 py-4 transition-opacity " +
                        (it.available
                          ? isChecked ? "" : "opacity-70"
                          : "opacity-50")
                      }
                    >
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <Checkbox
                          checked={isChecked && it.available}
                          disabled={!it.available}
                          onChange={(on) => toggleOne(it.id, on)}
                        />
                      </div>

                      <Link
                        href={`/listing/${it.listing.slug}`}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-rule bg-panel-2"
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
                        <p className="mt-1 inline-flex items-center gap-2 text-[11px] text-fg-subtle">
                          <span className="rounded border border-rule px-1.5 py-0.5">{cond.label}</span>
                          <span>Rp {it.listing.priceIdr.toLocaleString("id-ID")} / pcs</span>
                        </p>

                        {!it.available && (
                          <p className="mt-2 text-[11px] font-medium text-flame-600">
                            Listing sudah tidak tersedia. Hapus dari keranjang.
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-2">
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
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-md border border-rule bg-panel p-5">
          <h2 className="text-sm font-bold text-fg">Ringkasan pesanan</h2>
          <p className="mt-1 text-[11px] text-fg-subtle">
            {totals.count > 0
              ? `${totals.count} item · ${totals.qty} pcs terpilih`
              : "Pilih produk yang ingin kamu checkout"}
          </p>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">Subtotal</dt>
              <dd className="font-bold text-fg">
                Rp {totals.subtotalIdr.toLocaleString("id-ID")}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-[11px] text-fg-subtle">
            Ongkir + biaya layanan dihitung di halaman checkout setelah kamu
            pilih alamat dan kurir.
          </p>

          <Link
            href={checkoutHref}
            aria-disabled={!someChecked}
            onClick={(e) => { if (!someChecked) e.preventDefault(); }}
            className={
              "mt-4 inline-flex h-11 w-full items-center justify-center rounded-md text-sm font-semibold transition-colors " +
              (someChecked
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "cursor-not-allowed bg-panel-2 text-fg-subtle")
            }
          >
            {someChecked
              ? `Lanjut ke Checkout (${totals.count})`
              : "Pilih dulu produknya"}
          </Link>
          <p className="mt-2 text-[10px] text-fg-subtle">
            Item yang tidak dicentang tetap di keranjang dan bisa di-checkout
            nanti.
          </p>
        </div>
      </aside>
    </div>
  );
}

/**
 * Tiny styled checkbox with indeterminate support. Native input is
 * visually hidden and replaced with a square box so the visual
 * weight matches the rest of the form chrome (rounded-md, brand-400
 * accent on check).
 */
function Checkbox({
  checked,
  indeterminate = false,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span
        className={
          "h-5 w-5 rounded border-2 transition-colors " +
          (disabled
            ? "border-rule bg-panel-2"
            : checked || indeterminate
            ? "border-brand-500 bg-brand-500"
            : "border-rule bg-canvas peer-hover:border-brand-400")
        }
      />
      {checked && !indeterminate && (
        <svg
          className="pointer-events-none absolute h-3 w-3 text-white"
          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m3 8 3 3 7-7" />
        </svg>
      )}
      {indeterminate && (
        <span className="pointer-events-none absolute h-0.5 w-2.5 rounded bg-white" />
      )}
    </span>
  );
}
