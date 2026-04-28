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
};

type CourierCode = "jne-reg" | "jnt" | "sicepat" | "gosend";

const COURIERS: Array<{ code: CourierCode; name: string; price: number; eta: string }> = [
  { code: "jne-reg",  name: "JNE REG",        price: 18_000, eta: "2–3 hari" },
  { code: "jnt",      name: "J&T Express",    price: 25_000, eta: "1–2 hari" },
  { code: "sicepat",  name: "SiCepat REG",    price: 22_000, eta: "2–3 hari" },
  { code: "gosend",   name: "GoSend Same Day", price: 48_000, eta: "Hari ini · Jabodetabek" },
];

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
  const [courier, setCourier] = React.useState<CourierCode>("jne-reg");
  const [insurance, setInsurance] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const subtotal     = listing.priceIdr * qty;
  const shippingIdr  = COURIERS.find((c) => c.code === courier)?.price ?? 0;
  const platformFee  = Math.round((subtotal * PLATFORM_FEE_BPS) / 10_000);
  const payFee       = Math.round((subtotal * PAY_FEE_BPS) / 10_000);
  const insuranceIdr = insurance ? INSURANCE_FLAT_IDR : 0;
  const total        = subtotal + shippingIdr + platformFee + payFee + insuranceIdr;

  const selectedAddress = addresses.find((a) => a.id === addressId) ?? null;

  async function submit() {
    if (pending) return;
    if (!addressId) {
      setErr("Pilih atau tambah alamat dulu.");
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
          courierCode: courier,
          insurance,
        },
      });
      router.push(`/checkout/${encodeURIComponent(res.humanId)}/wait`);
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

        {/* Shipping */}
        <Section title="Metode pengiriman">
          <div className="flex flex-col gap-3">
            {COURIERS.map((c) => (
              <Card key={c.code} className={courier === c.code ? "border-brand-400 bg-brand-400/5" : ""}>
                <label className="flex cursor-pointer items-center gap-4 p-4">
                  <input
                    type="radio"
                    name="ship"
                    checked={courier === c.code}
                    onChange={() => setCourier(c.code)}
                    className="h-4 w-4 accent-brand-400"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-fg">{c.name}</p>
                    <p className="mt-0.5 text-xs text-fg-muted">{c.eta}</p>
                  </div>
                  <p className="font-mono text-sm text-fg">Rp {c.price.toLocaleString("id-ID")}</p>
                </label>
              </Card>
            ))}
          </div>
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

        {/* Payment method (display-only — Hoobiq Pay handles routing) */}
        <Section title="Metode pembayaran">
          <Card>
            <div className="flex items-center gap-3 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-400/10 text-brand-500">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/></svg>
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-fg">Hoobiq Pay (escrow)</p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  VA / e-wallet / QRIS — pilih saat lanjut ke pembayaran.
                </p>
              </div>
            </div>
          </Card>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <div className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Ringkasan</h3>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <Row label={`Subtotal${qty > 1 ? ` (×${qty})` : ""}`} value={`Rp ${subtotal.toLocaleString("id-ID")}`} />
              <Row label={`Ongkir ${COURIERS.find((c) => c.code === courier)?.name}`} value={`Rp ${shippingIdr.toLocaleString("id-ID")}`} />
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
