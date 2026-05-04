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

  const [listing, tree] = await Promise.all([
    serverApi<ListingDetail>(`/listings/${encodeURIComponent(slug)}`),
    serverApi<Node[]>("/categories", { revalidate: 60 }),
  ]);
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
        <header className="border-b border-rule pb-8">
          <h1 className="text-3xl font-bold text-fg md:text-4xl">Edit listing</h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted md:text-base">
            Perubahan akan langsung tampil di marketplace setelah disimpan.
          </p>
        </header>
        <UploadForm tree={tree ?? []} existing={existing} />
      </div>
    </AppShell>
  );
}
