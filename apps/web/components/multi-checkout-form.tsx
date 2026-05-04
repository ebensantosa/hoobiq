"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import { cartApi } from "@/lib/api/cart";
import { emitCartChanged } from "@/lib/cart-events";
import { Spinner } from "./spinner";

/** One row in the multi-item cart-driven checkout. */
export type MultiCheckoutItem = {
  cartItemId: string;
  listingId: string;
  listingSlug: string;
  /** Pre-selected variant id (single-item path with `?variant=` in URL). */
  variantId?: string | null;
  title: string;
  cover: string | null;
  priceIdr: number;
  qty: number;
  weightGrams: number;
  couriers: string[];
  originSubdistrictId: number | null;
  seller: { id: string; username: string; name: string | null; city: string | null };
};

type Address = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  city: string;
  province: string;
  postalCode: string;
  subdistrictId: number | null;
  primary: boolean;
};

/** Ongkir option returned by /shipping/cost. */
type CourierQuote = {
  courier: string;
  service: string;
  description: string;
  cost: number;   // IDR rupiah
  etd: string;
};

/**
 * Multi-item checkout — V2.
 *
 * Items group by seller. Each group has its own courier picker that
 * fetches /shipping/cost using:
 *   - origin: the originSubdistrictId of the group's first listing
 *     (a single seller posts from one warehouse — listings inside a
 *      group share an origin in practice).
 *   - destination: address.subdistrictId (selected up top).
 *   - weightGrams: SUM of all items × qty in the group.
 *   - couriers: union of all couriers across the group's listings.
 * The buyer picks one quote per group; the form totals every group's
 * pick into a single grand-total before the buyer commits.
 *
 * Submit orchestrates client-side: one POST /orders/checkout per cart
 * item, threading through the per-group courier + the per-item share
 * of the group's ongkir cost. Cart items are popped after each
 * successful order. After the loop the buyer is redirected to the
 * first Snap URL; the rest sit at "pending_payment" and can be
 * resumed individually from /pesanan.
 */
export function MultiCheckoutForm({
  items,
  addresses,
}: {
  items: MultiCheckoutItem[];
  addresses: Address[];
}) {
  const router = useRouter();
  const primaryAddressId = addresses.find((a) => a.primary)?.id ?? addresses[0]?.id ?? "";
  const [addressId, setAddressId] = React.useState(primaryAddressId);
  const selectedAddress = addresses.find((a) => a.id === addressId) ?? null;

  // Group by seller — preserve first-appearance order so the layout
  // doesn't reshuffle as the buyer ticks/unticks rows.
  const groups = React.useMemo(() => {
    const order: string[] = [];
    const byUsername = new Map<string, { seller: MultiCheckoutItem["seller"]; items: MultiCheckoutItem[] }>();
    for (const it of items) {
      const u = it.seller.username;
      if (!byUsername.has(u)) {
        order.push(u);
        byUsername.set(u, { seller: it.seller, items: [] });
      }
      byUsername.get(u)!.items.push(it);
    }
    return order.map((u) => byUsername.get(u)!);
  }, [items]);

  // Per-seller courier selection. `quotes` holds the API response
  // for each group (keyed by seller username); `picks` holds the
  // chosen courier code + cost for each group.
  type GroupKey = string;
  const [quotes, setQuotes] = React.useState<Record<GroupKey, CourierQuote[]>>({});
  const [picks, setPicks] = React.useState<Record<GroupKey, CourierQuote | null>>({});
  const [quoteErrs, setQuoteErrs] = React.useState<Record<GroupKey, string | null>>({});
  const [quoteLoading, setQuoteLoading] = React.useState<Record<GroupKey, boolean>>({});

  // Fetch quotes whenever the destination address or the items change.
  // One request per seller group — keeps cache hits high (the cached
  // key on the server includes origin/destination/weight/couriers).
  React.useEffect(() => {
    if (!selectedAddress?.subdistrictId) {
      setQuotes({});
      setPicks({});
      setQuoteErrs({});
      return;
    }
    let cancelled = false;
    async function run() {
      const nextQuotes: Record<GroupKey, CourierQuote[]> = {};
      const nextErrs: Record<GroupKey, string | null> = {};
      const nextLoading: Record<GroupKey, boolean> = {};
      for (const g of groups) {
        nextLoading[g.seller.username] = true;
      }
      setQuoteLoading(nextLoading);

      for (const g of groups) {
        const origin = g.items.find((it) => it.originSubdistrictId)?.originSubdistrictId ?? null;
        const couriers = Array.from(
          new Set(g.items.flatMap((it) => it.couriers).filter(Boolean)),
        );
        const weight = g.items.reduce((s, it) => s + it.weightGrams * it.qty, 0);
        if (!origin || couriers.length === 0 || weight < 100) {
          nextErrs[g.seller.username] = !origin
            ? `Seller belum set lokasi pickup. Hubungi @${g.seller.username}.`
            : couriers.length === 0
            ? "Seller belum set kurir. Hubungi seller untuk konfirmasi."
            : "Berat paket di bawah minimum kalkulasi (100gr).";
          nextQuotes[g.seller.username] = [];
          continue;
        }
        try {
          const res = await api<{ items: CourierQuote[] }>("/shipping/cost", {
            method: "POST",
            body: {
              originId: origin,
              destinationId: selectedAddress!.subdistrictId,
              weightGrams: weight,
              couriers,
            },
          });
          nextQuotes[g.seller.username] = res.items;
          nextErrs[g.seller.username] = res.items.length === 0 ? "Tidak ada layanan pengiriman tersedia." : null;
        } catch (e) {
          nextErrs[g.seller.username] = e instanceof Error ? e.message : "Gagal hitung ongkir.";
          nextQuotes[g.seller.username] = [];
        }
      }
      if (cancelled) return;
      setQuotes(nextQuotes);
      setQuoteErrs(nextErrs);
      setQuoteLoading({});
      // Preselect cheapest option per group when available; resets if
      // the address change invalidated the previous pick.
      setPicks((prev) => {
        const next: Record<GroupKey, CourierQuote | null> = {};
        for (const g of groups) {
          const list = nextQuotes[g.seller.username] ?? [];
          const prevPick = prev[g.seller.username];
          const stillValid = prevPick && list.find(
            (q) => q.courier === prevPick.courier && q.service === prevPick.service,
          );
          next[g.seller.username] = stillValid
            ?? (list.length > 0
              ? list.slice().sort((a, b) => a.cost - b.cost)[0]!
              : null);
        }
        return next;
      });
    }
    run();
    return () => { cancelled = true; };
  }, [groups, selectedAddress?.subdistrictId, selectedAddress]);

  function pickCourier(group: GroupKey, q: CourierQuote) {
    setPicks((p) => ({ ...p, [group]: q }));
  }

  // Totals — itemSubtotal is straightforward; shippingTotal sums the
  // per-group picks. allGroupsHavePick gates the submit button so the
  // buyer can't proceed with a missing-courier group.
  const itemSubtotal = items.reduce((s, it) => s + it.priceIdr * it.qty, 0);
  const shippingTotal = groups.reduce(
    (s, g) => s + (picks[g.seller.username]?.cost ?? 0),
    0,
  );
  const allGroupsHavePick = groups.every((g) => !!picks[g.seller.username]);

  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });

  function submit() {
    if (!addressId) {
      setErr("Pilih alamat pengiriman dulu.");
      return;
    }
    if (!allGroupsHavePick) {
      setErr("Pilih kurir untuk setiap toko dulu.");
      return;
    }
    setErr(null);
    setProgress({ done: 0, total: items.length });

    start(async () => {
      const created: Array<{ humanId: string; paymentRedirectUrl: string }> = [];
      try {
        for (let i = 0; i < items.length; i++) {
          const it = items[i]!;
          const groupKey = it.seller.username;
          const pick = picks[groupKey]!;
          // Split the group's ongkir across that group's items so each
          // Order row carries its share. Last item picks up rounding
          // remainder so the per-item parts re-sum to the group total.
          const groupItems = items.filter((x) => x.seller.username === groupKey);
          const idxInGroup = groupItems.findIndex((x) => x.cartItemId === it.cartItemId);
          const isLastInGroup = idxInGroup === groupItems.length - 1;
          const perItem = Math.floor(pick.cost / groupItems.length);
          const remainder = pick.cost - perItem * groupItems.length;
          const itemShipping = isLastInGroup ? perItem + remainder : perItem;
          // /orders/checkout stores shippingCents — convert IDR → cents.
          const res = await api<{ humanId: string; paymentRedirectUrl: string }>(
            "/orders/checkout",
            {
              method: "POST",
              body: {
                listingId: it.listingId,
                ...(it.variantId && { variantId: it.variantId }),
                qty: it.qty,
                addressId,
                courierCode: pick.courier,
                shippingCents: itemShipping * 100,
                insurance: false,
                payMethod: "page" as const,
              },
            },
          );
          created.push(res);
          setProgress({ done: i + 1, total: items.length });
          cartApi.remove(it.cartItemId).catch(() => undefined);
        }
        emitCartChanged();
        if (created[0]) {
          window.location.href = created[0].paymentRedirectUrl;
        } else {
          router.push("/pesanan");
        }
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal membuat pesanan.";
        if (created.length > 0) {
          setErr(
            `${created.length}/${items.length} pesanan berhasil dibuat — sisanya gagal: ${msg}. ` +
            `Cek /pesanan untuk lanjut bayar yang sudah dibuat.`,
          );
        } else {
          setErr(msg);
        }
        setProgress({ done: 0, total: 0 });
      }
    });
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        {/* Address picker */}
        <section className="rounded-md border border-rule bg-panel p-5">
          <h2 className="text-sm font-bold text-fg">Alamat pengiriman</h2>
          {addresses.length === 0 ? (
            <p className="mt-3 text-sm text-fg-muted">
              Belum ada alamat tersimpan.{" "}
              <Link href="/pengaturan/alamat" className="font-semibold text-brand-500">
                Tambah alamat
              </Link>{" "}
              dulu sebelum checkout.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={
                    "flex cursor-pointer gap-3 rounded-md border p-3 text-sm transition-colors " +
                    (addressId === a.id
                      ? "border-brand-400/70 bg-brand-400/5"
                      : "border-rule bg-panel-2 hover:border-brand-400/40")
                  }
                >
                  <input
                    type="radio"
                    name="address"
                    value={a.id}
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                    className="mt-1 accent-brand-500"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-fg">
                      {a.label}
                      {a.primary && <span className="ml-2 rounded-sm bg-brand-400/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-brand-500">UTAMA</span>}
                    </p>
                    <p className="text-fg-muted">{a.recipient} · {a.phone}</p>
                    <p className="mt-0.5 text-fg-muted">
                      {a.line1}, {a.city}, {a.province} {a.postalCode}
                    </p>
                    {!a.subdistrictId && (
                      <p className="mt-1 text-[11px] font-medium text-flame-600">
                        Subdistrict belum di-set — ongkir tidak bisa dihitung. Edit alamat dulu.
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* Per-seller groups */}
        {groups.map((g) => {
          const groupKey = g.seller.username;
          const sellerSubtotal = g.items.reduce((s, it) => s + it.priceIdr * it.qty, 0);
          const list = quotes[groupKey] ?? [];
          const pick = picks[groupKey] ?? null;
          const error = quoteErrs[groupKey];
          const loading = quoteLoading[groupKey];
          return (
            <section key={groupKey} className="rounded-md border border-rule bg-panel">
              <header className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-fg">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-subtle">
                    <path d="m2 7 1.5-4h17L22 7"/><path d="M4 12v9h16v-9"/><path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  {g.seller.name ?? `@${g.seller.username}`}
                </p>
                <p className="text-xs text-fg-muted">
                  Subtotal Rp {sellerSubtotal.toLocaleString("id-ID")}
                </p>
              </header>

              <ul className="divide-y divide-rule">
                {g.items.map((it) => (
                  <li key={it.cartItemId} className="flex gap-3 px-5 py-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-rule bg-panel-2">
                      {it.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="line-clamp-2 text-sm font-semibold text-fg">{it.title}</p>
                      <p className="mt-0.5 text-[11px] text-fg-subtle">
                        {it.qty} pcs · Rp {it.priceIdr.toLocaleString("id-ID")} / pcs · {it.weightGrams} gr
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-fg">
                      Rp {(it.priceIdr * it.qty).toLocaleString("id-ID")}
                    </p>
                  </li>
                ))}
              </ul>

              {/* Courier picker */}
              <div className="border-t border-rule p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
                  Pengiriman dari {g.seller.name ?? `@${g.seller.username}`}
                </p>
                {loading ? (
                  <p className="mt-2 inline-flex items-center gap-2 text-xs text-fg-muted">
                    <Spinner size={12} /> Menghitung ongkir…
                  </p>
                ) : error ? (
                  <p className="mt-2 rounded-md border border-flame-400/40 bg-flame-400/10 p-2 text-xs text-flame-600">
                    {error}
                  </p>
                ) : list.length === 0 ? (
                  <p className="mt-2 text-xs text-fg-muted">
                    {selectedAddress?.subdistrictId
                      ? "Pilih alamat dulu."
                      : "Pilih alamat dengan subdistrict valid."}
                  </p>
                ) : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {list.map((q) => {
                      const id = `${q.courier}-${q.service}`;
                      const isPicked = pick?.courier === q.courier && pick?.service === q.service;
                      return (
                        <label
                          key={id}
                          className={
                            "flex cursor-pointer gap-2 rounded-md border p-2.5 text-xs transition-colors " +
                            (isPicked
                              ? "border-brand-400/70 bg-brand-400/5"
                              : "border-rule bg-panel-2 hover:border-brand-400/40")
                          }
                        >
                          <input
                            type="radio"
                            name={`courier-${groupKey}`}
                            checked={isPicked}
                            onChange={() => pickCourier(groupKey, q)}
                            className="mt-0.5 accent-brand-500"
                          />
                          <div className="flex-1">
                            <p className="font-semibold uppercase text-fg">
                              {q.courier} · {q.service}
                            </p>
                            <p className="text-[10px] text-fg-subtle">
                              {q.description} · est {q.etd} hari
                            </p>
                            <p className="mt-1 font-mono text-fg">
                              Rp {q.cost.toLocaleString("id-ID")}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-md border border-rule bg-panel p-5">
          <h2 className="text-sm font-bold text-fg">Total bayar</h2>

          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">{items.length} item</dt>
              <dd className="font-bold text-fg">
                Rp {itemSubtotal.toLocaleString("id-ID")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-muted">Ongkir ({groups.length} toko)</dt>
              <dd className="font-bold text-fg">
                {allGroupsHavePick
                  ? `Rp ${shippingTotal.toLocaleString("id-ID")}`
                  : "—"}
              </dd>
            </div>
            <div className="border-t border-rule pt-2 flex justify-between text-base">
              <dt className="font-semibold text-fg">Total</dt>
              <dd className="font-extrabold text-fg">
                {allGroupsHavePick
                  ? `Rp ${(itemSubtotal + shippingTotal).toLocaleString("id-ID")}`
                  : "Pilih kurir dulu"}
              </dd>
            </div>
          </dl>

          {err && (
            <p role="alert" className="mt-4 rounded-md border border-flame-400/40 bg-flame-400/10 p-2 text-xs text-flame-600">
              {err}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={
              pending
              || addresses.length === 0
              || !addressId
              || !allGroupsHavePick
            }
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-fg-subtle"
          >
            {pending ? (
              <>
                <Spinner size={14} />
                <span>Memproses {progress.done}/{progress.total}…</span>
              </>
            ) : (
              <>Bayar sekarang ({groups.length} pesanan)</>
            )}
          </button>
          <p className="mt-2 text-[10px] text-fg-subtle">
            Tiap toko = 1 transaksi terpisah. Bayar pertama di-redirect otomatis;
            sisanya bisa dibayar dari halaman /pesanan.
          </p>
        </div>
      </aside>
    </div>
  );
}
