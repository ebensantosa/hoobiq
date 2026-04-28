"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";

type Address = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string;
  subdistrictId: number | null;
  primary: boolean;
};

type Listing = {
  id: string;
  title: string;
  slug: string;
  priceIdr: number;
  condition: string;
  cover: string | null;
  stock: number;
  category: { name: string; slug: string };
  seller: { username: string; city: string | null; trustScore: number };
  weightGrams: number;
  couriers: string[];
  originSubdistrictId: number | null;
};

type CostOption = {
  courier: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};

const PLATFORM_FEE_BPS = 200; // 2%
const PAY_FEE_BPS = 100;      // 1%
const INSURANCE_FLAT_IDR = 15_000;

export function CheckoutForm({
  listing, qty: initialQty, addresses,
}: {
  listing: Listing;
  qty: number;
  addresses: Address[];
}) {
  const router = useRouter();
  const [qty, setQty] = React.useState(Math.min(initialQty, listing.stock));
  const [addressId, setAddressId] = React.useState<string | null>(
    addresses.find((a) => a.primary)?.id ?? addresses[0]?.id ?? null
  );
  const [insurance, setInsurance] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Real ongkir from RajaOngkir/Komerce. Fetched whenever buyer changes
  // address — listing.couriers, listing.originSubdistrictId, and
  // address.subdistrictId all need to be set or we surface a clear message
  // instead of falling back to fake numbers.
  const [costOptions, setCostOptions] = React.useState<CostOption[]>([]);
  const [costLoading, setCostLoading] = React.useState(false);
  const [costErr, setCostErr] = React.useState<string | null>(null);
  const [pickedCourier, setPickedCourier] = React.useState<string | null>(null);
  const [payMethod, setPayMethod] = React.useState<"page" | "qris">("page");

  const selectedAddress = addresses.find((a) => a.id === addressId) ?? null;

  React.useEffect(() => {
    setCostErr(null); setCostOptions([]); setPickedCourier(null);
    if (!selectedAddress) return;
    if (listing.couriers.length === 0) {
      setCostErr("Seller belum konfigurasi ekspedisi untuk listing ini.");
      return;
    }
    if (!listing.originSubdistrictId) {
      setCostErr("Seller belum set lokasi pickup. Hubungi seller.");
      return;
    }
    if (!selectedAddress.subdistrictId) {
      setCostErr("Alamat ini belum punya kelurahan/kecamatan. Edit alamat dulu.");
      return;
    }
    setCostLoading(true);
    api<{ items: CostOption[] }>("/shipping/cost", {
      method: "POST",
      body: {
        originId: listing.originSubdistrictId,
        destinationId: selectedAddress.subdistrictId,
        weightGrams: Math.max(100, listing.weightGrams * qty),
        couriers: listing.couriers,
      },
    })
      .then((res) => {
        setCostOptions(res.items);
        if (res.items[0]) setPickedCourier(`${res.items[0].courier}-${res.items[0].service}`);
      })
      .catch((e) => setCostErr(e instanceof Error ? e.message : "Gagal hitung ongkir."))
      .finally(() => setCostLoading(false));
  }, [addressId, listing.couriers, listing.originSubdistrictId, listing.weightGrams, qty, selectedAddress]);

  const selectedCost = costOptions.find((o) => `${o.courier}-${o.service}` === pickedCourier) ?? null;

  const subtotal     = listing.priceIdr * qty;
  const shippingIdr  = selectedCost?.cost ?? 0;
  const platformFee  = Math.round((subtotal * PLATFORM_FEE_BPS) / 10_000);
  const payFee       = Math.round((subtotal * PAY_FEE_BPS) / 10_000);
  const insuranceIdr = insurance ? INSURANCE_FLAT_IDR : 0;
  const total        = subtotal + shippingIdr + platformFee + payFee + insuranceIdr;

  async function submit() {
    if (pending) return;
    if (!addressId) {
      setErr("Pilih atau tambah alamat dulu.");
      return;
    }
    if (!selectedCost) {
      setErr(costErr ?? "Pilih ekspedisi dulu.");
      return;
    }
    setErr(null);
    setPending(true);
    try {
      const res = await api<{ humanId: string; paymentRedirectUrl: string }>("/orders/checkout", {
        method: "POST",
        body: {
          listingId: listing.id,
          qty,
          addressId,
          courierCode: `${selectedCost.courier}-${selectedCost.service.toLowerCase()}`,
          shippingCents: selectedCost.cost * 100,
          insurance,
          payMethod,
        },
      });
      // Pass selected method to wait page so it can auto-fire the right
      // Komerce charge without showing a second picker.
      router.push(`/checkout/${encodeURIComponent(res.humanId)}/wait?m=${payMethod}`);
    } catch (e) {
      setErr(
        e instanceof ApiError ? e.message :
        e instanceof Error ? e.message :
        "Gagal memproses checkout."
      );
      setPending(false);
    }
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-8">
        {/* Item */}
        <Card>
          <div className="flex items-center gap-4 p-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-panel-2">
              {listing.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.cover} alt={listing.title} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-brand-400/20 to-flame-400/10" />
              )}
              <Badge tone={listing.condition === "MINT" ? "mint" : "near"} size="xs" className="absolute left-1.5 top-1.5">
                {listing.condition.replace("_", " ")}
              </Badge>
            </div>
            <div className="flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
                {listing.category.name}
              </p>
              <p className="mt-1 font-medium text-fg">{listing.title}</p>
              <p className="mt-1 text-xs text-fg-muted">
                Dari @{listing.seller.username}{listing.seller.city ? ` · ${listing.seller.city}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="text-lg font-bold text-brand-500">Rp {listing.priceIdr.toLocaleString("id-ID")}</p>
              {listing.stock > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="h-7 w-7 rounded-md border border-rule text-fg-muted hover:bg-panel-2"
                  >−</button>
                  <span className="font-mono text-sm">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(listing.stock, q + 1))}
                    className="h-7 w-7 rounded-md border border-rule text-fg-muted hover:bg-panel-2"
                  >+</button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Address */}
        <Section
          title="Alamat pengiriman"
          action={
            <Link href="/pengaturan/alamat" className="text-xs text-brand-500 hover:underline">
              Kelola alamat
            </Link>
          }
        >
          {addresses.length === 0 ? (
            <Card>
              <div className="p-5 text-center">
                <p className="text-sm font-medium text-fg">Belum ada alamat tersimpan.</p>
                <p className="mt-1 text-xs text-fg-muted">Tambah dulu di pengaturan agar checkout bisa lanjut.</p>
                <Link
                  href={`/pengaturan/alamat?next=${encodeURIComponent(`/checkout?listing=${listing.id}`)}`}
                  className="mt-3 inline-block rounded-lg bg-brand-400 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
                >
                  + Tambah alamat
                </Link>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {addresses.map((a) => (
                <Card key={a.id} className={addressId === a.id ? "border-brand-400 bg-brand-400/5" : ""}>
                  <label className="flex cursor-pointer items-start gap-4 p-4">
                    <input
                      type="radio"
                      name="addr"
                      checked={addressId === a.id}
                      onChange={() => setAddressId(a.id)}
                      className="mt-1 h-4 w-4 accent-brand-400"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-fg">
                        {a.label}
                        {a.primary && <Badge tone="mint" size="xs" className="ml-2">Utama</Badge>}
                      </p>
                      <p className="mt-1 text-sm text-fg">{a.recipient} · {a.phone}</p>
                      <p className="mt-0.5 text-xs text-fg-muted">
                        {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.province} {a.postalCode}
                      </p>
                    </div>
                  </label>
                </Card>
              ))}
            </div>
          )}
        </Section>

        {/* Shipping — real ongkir from RajaOngkir/Komerce */}
        <Section title="Metode pengiriman">
          {costLoading ? (
            <Card><div className="p-5 text-center text-sm text-fg-muted">Menghitung ongkir…</div></Card>
          ) : costErr ? (
            <Card><div className="p-5 text-center text-sm text-flame-600">{costErr}</div></Card>
          ) : costOptions.length === 0 ? (
            <Card><div className="p-5 text-center text-sm text-fg-muted">Pilih alamat dulu untuk hitung ongkir.</div></Card>
          ) : (
            <div className="flex flex-col gap-3">
              {costOptions.map((c) => {
                const id = `${c.courier}-${c.service}`;
                return (
                  <Card key={id} className={pickedCourier === id ? "border-brand-400 bg-brand-400/5" : ""}>
                    <label className="flex cursor-pointer items-center gap-4 p-4">
                      <input
                        type="radio"
                        name="ship"
                        checked={pickedCourier === id}
                        onChange={() => setPickedCourier(id)}
                        className="h-4 w-4 accent-brand-400"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-fg uppercase">{c.courier} · {c.service}</p>
                        <p className="mt-0.5 text-xs text-fg-muted">{c.description} · {c.etd} hari</p>
                      </div>
                      <p className="font-mono text-sm text-fg">Rp {c.cost.toLocaleString("id-ID")}</p>
                    </label>
                  </Card>
                );
              })}
            </div>
          )}
        </Section>

        {/* Insurance */}
        <Section title="Tambahan">
          <Card>
            <label className="flex cursor-pointer items-center gap-4 p-4">
              <input
                type="checkbox"
                checked={insurance}
                onChange={(e) => setInsurance(e.target.checked)}
                className="h-4 w-4 accent-brand-400"
              />
              <div className="flex-1">
                <p className="font-medium text-fg">Asuransi paket</p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  Klaim 100% nilai listing kalau paket hilang/rusak total.
                </p>
              </div>
              <p className="font-mono text-sm text-fg">Rp {INSURANCE_FLAT_IDR.toLocaleString("id-ID")}</p>
            </label>
          </Card>
        </Section>

        {/* Payment method picker — fires the chosen Komerce flow on submit */}
        <Section title="Metode pembayaran">
          <div className="flex flex-col gap-3">
            <Card className={payMethod === "page" ? "border-brand-400 bg-brand-400/5" : ""}>
              <label className="flex cursor-pointer items-center gap-4 p-4">
                <input
                  type="radio"
                  name="paymethod"
                  checked={payMethod === "page"}
                  onChange={() => setPayMethod("page")}
                  className="h-4 w-4 accent-brand-400"
                />
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-400/10 text-brand-500">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/></svg>
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-fg">Payment Page (VA / E-wallet / Bank)</p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    Klik bayar → diarahkan ke halaman Komerce, pilih bank/e-wallet di sana.
                  </p>
                </div>
              </label>
            </Card>
            <Card className={payMethod === "qris" ? "border-brand-400 bg-brand-400/5" : ""}>
              <label className="flex cursor-pointer items-center gap-4 p-4">
                <input
                  type="radio"
                  name="paymethod"
                  checked={payMethod === "qris"}
                  onChange={() => setPayMethod("qris")}
                  className="h-4 w-4 accent-brand-400"
                />
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-400/10 text-brand-500">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14h1v1h-1zM14 20h3v1h-3zM20 17h1v4M17 20h3"/></svg>
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-fg">QRIS</p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    Scan QR dari aplikasi mobile banking / e-wallet apa saja.
                  </p>
                </div>
              </label>
            </Card>
          </div>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <div className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Ringkasan</h3>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <Row label={`Subtotal${qty > 1 ? ` (×${qty})` : ""}`} value={`Rp ${subtotal.toLocaleString("id-ID")}`} />
              <Row label={`Ongkir${selectedCost ? ` ${selectedCost.courier.toUpperCase()} ${selectedCost.service}` : ""}`} value={`Rp ${shippingIdr.toLocaleString("id-ID")}`} />
              <Row label="Biaya platform (2%)" value={`Rp ${platformFee.toLocaleString("id-ID")}`} />
              <Row label="Biaya Hoobiq Pay (1%)" value={`Rp ${payFee.toLocaleString("id-ID")}`} />
              {insuranceIdr > 0 && <Row label="Asuransi" value={`Rp ${insuranceIdr.toLocaleString("id-ID")}`} />}
            </dl>
            <div className="mt-5 flex items-end justify-between border-t border-rule pt-5">
              <span className="text-sm text-fg-muted">Total bayar</span>
              <span className="text-3xl font-bold text-fg">Rp {total.toLocaleString("id-ID")}</span>
            </div>

            <div className="mt-5 rounded-xl border border-brand-400/30 bg-brand-400/5 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-fg">
                <span className="text-brand-400">◆</span> Pembayaran aman lewat Hoobiq Pay
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
                Pembayaran kamu aman sampai barang diterima. Klaim refund otomatis kalau barang tidak sesuai.
              </p>
            </div>

            {err && (
              <p role="alert" className="mt-4 rounded-lg border border-flame-400/30 bg-flame-400/10 px-3 py-2 text-xs text-flame-600">
                {err}
              </p>
            )}

            <Button
              variant="primary"
              size="lg"
              className="mt-5 w-full"
              onClick={submit}
              disabled={pending || !selectedAddress}
            >
              {pending ? "Memproses…" : "Lanjut ke pembayaran"}
            </Button>
            <p className="mt-3 text-center text-xs text-fg-subtle">
              Dengan klik bayar, kamu setuju dengan{" "}
              <Link href="/syarat" className="text-brand-400 hover:underline">Ketentuan Transaksi</Link>.
            </p>
          </div>
        </Card>
      </aside>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="font-mono text-fg">{value}</dd>
    </div>
  );
}
