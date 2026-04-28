import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CheckoutForm } from "@/components/checkout-form";
import { serverApi } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/session";
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
  primary: boolean;
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string; qty?: string }>;
}) {
  const sp = await searchParams;
  const listingId = sp.listing?.trim();
  const qty = Math.max(1, Math.min(10, Number(sp.qty ?? 1) || 1));

  const me = await getSessionUser();
  if (!me) redirect(`/masuk?next=${encodeURIComponent(`/checkout?listing=${listingId ?? ""}`)}`);

  if (!listingId) {
    return (
      <AppShell active="Marketplace">
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <p className="text-base font-medium text-fg">Pilih barang dulu dari marketplace.</p>
          <Link href="/marketplace" className="mt-4 inline-block text-sm text-brand-500 hover:underline">
            Buka marketplace →
          </Link>
        </div>
      </AppShell>
    );
  }

  const [listing, addressesRes] = await Promise.all([
    serverApi<ListingDetail>(`/listings/${encodeURIComponent(listingId)}`),
    serverApi<{ items: Address[] }>("/addresses"),
  ]);

  if (!listing) {
    return (
      <AppShell active="Marketplace">
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <p className="text-base font-medium text-fg">Listing tidak ditemukan.</p>
          <Link href="/marketplace" className="mt-4 inline-block text-sm text-brand-500 hover:underline">
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
          <Link href={`/listing/${listing.slug}`} className="mt-4 inline-block text-sm text-brand-500 hover:underline">
            Kembali ke listing
          </Link>
        </div>
      </AppShell>
    );
  }

  const addresses = addressesRes?.items ?? [];

  return (
    <AppShell active="Marketplace">
      <div className="mx-auto max-w-[1100px] px-6 pb-8 lg:px-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-flame-500">
          Hoobiq Pay · Checkout aman
        </span>
        <h1 className="mt-2 text-3xl font-bold text-fg">Selesaikan pembelian.</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Pembayaran kamu aman lewat Hoobiq Pay sampai barang diterima dengan baik.
        </p>

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
          }}
          qty={qty}
          addresses={addresses}
        />
      </div>
    </AppShell>
  );
}
