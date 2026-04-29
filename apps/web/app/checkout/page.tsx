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
  subdistrictId: number | null;
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
  const [listing, addressesRes] = await Promise.all([
    serverApi<ListingDetail>(`/listings/${encodeURIComponent(listingId)}`),
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
