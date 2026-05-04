import { AppShell } from "@/components/app-shell";
import { UploadForm, type UploadFormExisting } from "@/components/upload-form";
import { serverApi } from "@/lib/server/api";
import type { ListingDetail } from "@hoobiq/types";

export const dynamic = "force-dynamic";

type Node = {
  id: string;
  slug: string;
  name: string;
  level: number;
  children: Node[];
};

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ clone?: string }>;
}) {
  const sp = await searchParams;
  const cloneSlug = sp.clone?.trim();

  // Pull cloned listing in parallel with the category tree so the form
  // can be seeded with the spec-block fields (kategori, kondisi, brand,
  // dimensi, dll.) sambil tetap meninggalkan judul/deskripsi/foto/harga
  // kosong supaya seller wajib isi ulang per-SKU.
  const [tree, cloneSrc] = await Promise.all([
    serverApi<Node[]>("/categories", { revalidate: 60 }),
    cloneSlug ? serverApi<ListingDetail>(`/listings/${encodeURIComponent(cloneSlug)}`).catch(() => null) : Promise.resolve(null),
  ]);

  const clone: UploadFormExisting | undefined = cloneSrc
    ? {
        id: "",
        title: "",
        description: "",
        priceIdr: 0,
        compareAtIdr: null,
        brand: cloneSrc.brand ?? null,
        variant: cloneSrc.variant ?? null,
        warranty: cloneSrc.warranty ?? null,
        stock: 1,
        weightGrams: cloneSrc.weightGrams ?? 500,
        condition: "BRAND_NEW_SEALED" as UploadFormExisting["condition"],
        images: [],
        categoryId: cloneSrc.category.id,
        couriers: cloneSrc.couriers ?? [],
        origin: cloneSrc.originSubdistrictId
          ? { id: cloneSrc.originSubdistrictId, label: "(lokasi tersimpan)", subdistrict: "", district: "", city: "", province: "", postalCode: "" }
          : null,
        tradeable: cloneSrc.tradeable ?? true,
        showOnFeed: true,
        lengthCm: cloneSrc.lengthCm ?? null,
        widthCm:  cloneSrc.widthCm ?? null,
        heightCm: cloneSrc.heightCm ?? null,
      }
    : undefined;

  const isClone = !!clone;

  return (
    <AppShell active="Marketplace">
      <div className="px-4 pb-12 sm:px-6 lg:px-10">
        <header className="border-b border-rule pb-8">
          <h1 className="text-3xl font-bold text-fg md:text-4xl">
            {isClone ? "Salin produk" : "Pasang listing baru"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted md:text-base">
            {isClone
              ? "Spec dari listing sebelumnya udah keisi (kategori, kondisi, berat, brand, dll.). Isi judul, foto, harga, dan deskripsi yang baru."
              : "Foto jelas + deskripsi jujur = listing terjual lebih cepat. Listing masuk antrian moderasi sebelum tayang publik (biasanya < 5 menit)."}
          </p>
        </header>
        <UploadForm tree={tree ?? []} clone={clone} />
      </div>
    </AppShell>
  );
}
