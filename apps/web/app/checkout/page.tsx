import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CheckoutForm } from "@/components/checkout-form";
import { MultiCheckoutForm, type MultiCheckoutItem } from "@/components/multi-checkout-form";
import { serverApi } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/session";
import type { CartItem } from "@/lib/api/cart";
import type { ListingDetail } from "@hoobiq/types";

export const dynamic = "force-dynamic";

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

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string; qty?: string; cart?: string }>;
}) {
  const sp = await searchParams;
  const listingId = sp.listing?.trim();
  const qty = Math.max(1, Math.min(10, Number(sp.qty ?? 1) || 1));
  // Multi-item path — comma-separated cart item ids from /keranjang's
  // checkbox selection. When present, takes precedence over the
  // single-listing query so a buyer that ticks 3 items doesn't get
  // dropped into a single-item form for whichever happened to be first.
  const cartIds = (sp.cart ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const me = await getSessionUser();
  if (!me) {
    const next = cartIds.length
      ? `/checkout?cart=${encodeURIComponent(cartIds.join(","))}`
      : `/checkout?listing=${listingId ?? ""}`;
    redirect(`/masuk?next=${encodeURIComponent(next)}`);
  }

  if (!listingId && cartIds.length === 0) {
    return (
      <AppShell active="Marketplace">
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <p className="text-base font-medium text-fg">Pilih barang dulu dari marketplace.</p>
          <Link href="/marketplace" className="mt-4 inline-block text-sm text-brand-500">
            Buka marketplace
          </Link>
        </div>
      </AppShell>
    );
  }

  // API returns raw Prisma Address shape (name, line, postal); CheckoutForm
  // expects recipient/line1/postalCode. Normalize at the boundary.
  type RawAddress = {
    id: string; label: string; name: string; phone: string;
    line: string; city: string; province: string; postal: string;
    subdistrictId: number | null; primary: boolean;
  };

  // Multi-item branch — fetch the cart, filter to the selected ids,
  // group by seller, hand off to the dedicated MultiCheckoutForm.
  if (cartIds.length > 0) {
    const [cartRes, addressesRes] = await Promise.all([
      serverApi<{ items: CartItem[] }>("/cart"),
      serverApi<{ items: RawAddress[] }>("/addresses"),
    ]);
    const allItems = cartRes?.items ?? [];
    const selectedSet = new Set(cartIds);
    const items: MultiCheckoutItem[] = allItems
      .filter((it) => selectedSet.has(it.id) && it.available)
      .map((it) => ({
        cartItemId: it.id,
        listingId: it.listing.id,
        listingSlug: it.listing.slug,
        title: it.listing.title,
        cover: it.listing.cover,
        priceIdr: it.listing.priceIdr,
        qty: it.qty,
        weightGrams: it.listing.weightGrams,
        couriers: it.listing.couriers,
        originSubdistrictId: it.listing.originSubdistrictId,
        seller: it.listing.seller,
      }));

    if (items.length === 0) {
      return (
        <AppShell active="Marketplace">
          <div className="mx-auto max-w-xl px-6 py-16 text-center">
            <p className="text-base font-medium text-fg">
              Tidak ada item terpilih yang masih tersedia.
            </p>
            <Link href="/keranjang" className="mt-4 inline-block text-sm text-brand-500">
              Kembali ke keranjang
            </Link>
          </div>
        </AppShell>
      );
    }

    const addresses = (addressesRes?.items ?? []).map((a) => ({
      id: a.id,
      label: a.label,
      recipient: a.name,
      phone: a.phone,
      line1: a.line,
      city: a.city,
      province: a.province,
      postalCode: a.postal,
      subdistrictId: a.subdistrictId,
      primary: a.primary,
    }));

    return (
      <AppShell active="Marketplace">
        <div className="px-4 pb-12 sm:px-6 lg:px-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-flame-500">
            Hoobiq Pay · Multi-item checkout
          </span>
          <h1 className="mt-2 text-3xl font-bold text-fg">
            Selesaikan pembelian ({items.length} item).
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Pesanan dari beberapa seller akan dipecah menjadi beberapa transaksi.
            Pembayaran kamu tetap aman lewat Hoobiq Pay sampai barang diterima.
          </p>
          <MultiCheckoutForm items={items} addresses={addresses} />
        </div>
      </AppShell>
    );
  }

  const [listing, addressesRes] = await Promise.all([
    serverApi<ListingDetail>(`/listings/${encodeURIComponent(listingId!)}`),
    serverApi<{ items: RawAddress[] }>("/addresses"),
  ]);

  if (!listing) {
    return (
      <AppShell active="Marketplace">
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <p className="text-base font-medium text-fg">Listing tidak ditemukan.</p>
          <Link href="/marketplace" className="mt-4 inline-block text-sm text-brand-500">
            Kembali ke marketplace
          </Link>
        </div>
      </AppShell>
    );
  }

  if (listing.seller.username === me.username) {
    return (
      <AppShell active="Marketplace">
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <p className="text-base font-medium text-fg">Tidak bisa membeli listing sendiri.</p>
          <Link href={`/listing/${listing.slug}`} className="mt-4 inline-block text-sm text-brand-500">
            Kembali ke listing
          </Link>
        </div>
      </AppShell>
    );
  }

  const addresses: Address[] = (addressesRes?.items ?? []).map((a) => ({
    id: a.id,
    label: a.label,
    recipient: a.name,
    phone: a.phone,
    line1: a.line,
    line2: null,
    city: a.city,
    province: a.province,
    postalCode: a.postal,
    subdistrictId: a.subdistrictId,
    primary: a.primary,
  }));

  return (
    <AppShell active="Marketplace">
      <div className="mx-auto max-w-[1100px] px-6 pb-8 lg:px-10">
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">Checkout</h1>

        <CheckoutForm
          listing={{
            id: listing.id,
            title: listing.title,
            slug: listing.slug,
            priceIdr: listing.priceIdr,
            condition: listing.condition,
            cover: listing.cover,
            stock: listing.stock,
            category: listing.category,
            seller: listing.seller,
            weightGrams: listing.weightGrams,
            couriers: listing.couriers ?? [],
            originSubdistrictId: listing.originSubdistrictId ?? null,
          }}
          qty={qty}
          addresses={addresses}
        />
      </div>
    </AppShell>
  );
}
