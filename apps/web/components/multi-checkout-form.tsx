"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import { cartApi } from "@/lib/api/cart";
import { emitCartChanged } from "@/lib/cart-events";
import { Spinner } from "./spinner";

/**
 * One row in the multi-item cart-driven checkout. Carries everything
 * needed both for the rendered seller-grouped summary AND for the
 * per-item POST /orders/checkout call when the buyer submits.
 */
export type MultiCheckoutItem = {
  cartItemId: string;
  listingId: string;
  listingSlug: string;
  title: string;
  cover: string | null;
  priceIdr: number;
  qty: number;
  seller: { username: string; name: string | null; city: string | null };
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

/**
 * Multi-item checkout — V1.
 *
 * To avoid a deep refactor of the existing single-item Order model
 * (one Order row = one listing), we orchestrate from the client: the
 * single submit calls POST /orders/checkout once per cart item with
 * the same address. Each call creates its own Order + Midtrans Snap
 * charge in the API. Once all calls succeed we wipe those cart
 * items and bounce the buyer to the FIRST charge's redirect URL;
 * the subsequent orders sit at "pending_payment" in /pesanan and
 * the buyer can pay them one by one.
 *
 * V1 ships with placeholder zero-cost shipping (and the listing's
 * first available courier) so the Phase-3 multi-seller-shipping
 * cost calc doesn't gate this checkout. Buyer is told upfront that
 * shipping for each seller will be confirmed before payment.
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
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });

  // Group by seller for display. Order preserved by first-appearance.
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

  const subtotalIdr = items.reduce((s, it) => s + it.priceIdr * it.qty, 0);

  function submit() {
    if (!addressId) {
      setErr("Pilih alamat pengiriman dulu.");
      return;
    }
    if (items.length === 0) {
      setErr("Tidak ada item untuk di-checkout.");
      return;
    }
    setErr(null);
    setProgress({ done: 0, total: items.length });

    start(async () => {
      const created: Array<{ humanId: string; paymentRedirectUrl: string }> = [];
      try {
        // Sequential — keeps the Midtrans Snap calls predictable and
        // surfaces the first failure inline instead of a Promise.all
        // race that aborts mid-stream with N partial successes.
        for (let i = 0; i < items.length; i++) {
          const it = items[i]!;
          const res = await api<{ humanId: string; paymentRedirectUrl: string }>(
            "/orders/checkout",
            {
              method: "POST",
              body: {
                listingId: it.listingId,
                qty: it.qty,
                addressId,
                // Placeholder: zero-cost shipping + a courier-of-record
                // string so the existing zod accepts it. The seller
                // confirms the actual courier + ongkir on order detail
                // before shipping. Phase-3 will move courier + cost
                // selection into this form.
                courierCode: "tbd",
                shippingCents: 0,
                insurance: false,
                payMethod: "page" as const,
              },
            },
          );
          created.push(res);
          setProgress({ done: i + 1, total: items.length });

          // Pop the cart item now so the user doesn't go back to /keranjang
          // and see ghost rows for already-paid items. Failures during
          // this best-effort cleanup don't block the flow.
          cartApi.remove(it.cartItemId).catch(() => undefined);
        }
        emitCartChanged();
        // Redirect to the first Snap so the buyer can start paying.
        // The remaining orders show up in /pesanan as pending_payment
        // for them to clear one-by-one.
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
              </Link>
              {" "}dulu sebelum checkout.
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
                    <p className="text-fg-muted">
                      {a.recipient} · {a.phone}
                    </p>
                    <p className="mt-0.5 text-fg-muted">
                      {a.line1}, {a.city}, {a.province} {a.postalCode}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* Per-seller summary */}
        {groups.map((g) => {
          const sellerSubtotal = g.items.reduce((s, it) => s + it.priceIdr * it.qty, 0);
          return (
            <section key={g.seller.username} className="rounded-md border border-rule bg-panel">
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
                  <li key={it.cartItemId} className="flex gap-3 px-5 py-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-rule bg-panel-2">
                      {it.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="line-clamp-2 text-sm font-semibold text-fg">{it.title}</p>
                      <p className="mt-1 text-[11px] text-fg-subtle">
                        {it.qty} pcs · Rp {it.priceIdr.toLocaleString("id-ID")} / pcs
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-fg">
                      Rp {(it.priceIdr * it.qty).toLocaleString("id-ID")}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <p className="rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          Catatan V1: ongkir tiap pesanan dikonfirmasi seller setelah pembayaran.
          Tiap seller di-checkout sebagai pesanan terpisah supaya status
          pengiriman bisa di-track per toko.
        </p>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-md border border-rule bg-panel p-5">
          <h2 className="text-sm font-bold text-fg">Total bayar</h2>

          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">{items.length} item</dt>
              <dd className="font-bold text-fg">
                Rp {subtotalIdr.toLocaleString("id-ID")}
              </dd>
            </div>
            <div className="flex justify-between text-xs text-fg-subtle">
              <dt>Ongkir + biaya layanan</dt>
              <dd>dihitung di transaksi</dd>
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
            disabled={pending || addresses.length === 0 || !addressId}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-fg-subtle"
          >
            {pending ? (
              <>
                <Spinner size={14} />
                <span>
                  Memproses {progress.done}/{progress.total}…
                </span>
              </>
            ) : (
              <>Bayar sekarang ({items.length} pesanan)</>
            )}
          </button>
          <p className="mt-2 text-[10px] text-fg-subtle">
            Pesanan kamu masuk ke /pesanan setelah dibuat. Pembayaran pertama
            dibuka otomatis; sisanya bisa dibayar satu per satu dari halaman
            pesanan.
          </p>
        </div>
      </aside>
    </div>
  );
}
