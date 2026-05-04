import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { UploadForm, type UploadFormExisting } from "@/components/upload-form";
import { serverApi } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/session";
import type { ListingDetail } from "@hoobiq/types";

export const dynamic = "force-dynamic";

type Node = { id: string; slug: string; name: string; level: number; children: Node[] };

export default async function EditListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await getSessionUser();
  if (!me) redirect(`/masuk?next=/jual/${encodeURIComponent(slug)}/edit`);

  type RawAddress = {
    id: string; label: string; line: string;
    subdistrict?: string | null; district?: string | null;
    city: string; province: string; postal: string;
    subdistrictId: number | null; primary: boolean;
  };

  const [listing, tree, addressesRes] = await Promise.all([
    serverApi<ListingDetail>(`/listings/${encodeURIComponent(slug)}`),
    serverApi<Node[]>("/categories", { revalidate: 60 }),
    serverApi<{ items: RawAddress[] }>("/addresses").catch(() => null),
  ]);
  const primary = (addressesRes?.items ?? []).find((a) => a.primary) ?? (addressesRes?.items ?? [])[0] ?? null;
  const pickupLabel = primary
    ? [primary.subdistrict, primary.district, primary.city, primary.province, primary.postal]
        .filter((s): s is string => !!s && s.trim().length > 0)
        .join(", ")
    : null;
  if (!listing) notFound();
  if (listing.seller.username !== me.username) {
    return (
      <AppShell active="Marketplace">
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <p className="text-base font-medium text-fg">Kamu bukan pemilik listing ini.</p>
          <Link href="/marketplace" className="mt-4 inline-block text-sm text-brand-500">
            Kembali ke marketplace
          </Link>
        </div>
      </AppShell>
    );
  }

  const existing: UploadFormExisting = {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    description: listing.description,
    priceIdr: listing.priceIdr,
    compareAtIdr: listing.compareAtIdr ?? null,
    brand: listing.brand ?? null,
    variant: listing.variant ?? null,
    warranty: listing.warranty ?? null,
    stock: listing.stock,
    weightGrams: listing.weightGrams,
    condition: listing.condition,
    images: listing.images,
    categoryId: listing.category.id,
    couriers: listing.couriers ?? [],
    // Origin label isn't persisted — just the subdistrict id. Show "(tersimpan)"
    // placeholder so the seller can either keep or repick. Repicking gives us
    // a fresh Destination object with the label.
    origin: listing.originSubdistrictId
      ? { id: listing.originSubdistrictId, label: "(lokasi tersimpan)", subdistrict: "", district: "", city: "", province: "", postalCode: "" }
      : null,
    tradeable: listing.tradeable ?? false,
  };

  return (
    <AppShell active="Marketplace">
      <div className="px-4 pb-12 sm:px-6 lg:px-10">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-fg md:text-4xl">Edit listing</h1>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted md:text-base">
              Perubahan akan langsung tampil di marketplace setelah disimpan.
            </p>
          </div>
          <PickupHeader label={pickupLabel} />
        </header>
        <UploadForm tree={tree ?? []} existing={existing} />
      </div>
    </AppShell>
  );
}

function PickupHeader({ label }: { label: string | null }) {
  return (
    <div className="flex max-w-xs shrink-0 items-start gap-2 rounded-xl border border-rule bg-panel-2/60 px-3 py-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500/15 text-brand-500">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">Lokasi pickup</p>
        <p className="line-clamp-2 text-xs text-fg">
          {label ?? <span className="text-flame-600">Belum diatur</span>}
        </p>
        <Link
          href="/pengaturan/alamat"
          className="mt-1 inline-block text-[11px] font-semibold text-brand-500 hover:underline"
        >
          {label ? "Ubah" : "Atur sekarang"} →
        </Link>
      </div>
    </div>
  );
}
