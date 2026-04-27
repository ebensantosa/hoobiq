"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Textarea } from "@hoobiq/ui";
import { ImageUpload } from "./image-upload";
import { listingsWriteApi } from "@/lib/api/listings-write";
import { uploadImages } from "@/lib/api/uploads";
import { ApiError } from "@/lib/api/client";

type Node = {
  id: string;
  slug: string;
  name: string;
  level: number;
  children: Node[];
};

const conditions = ["MINT", "NEAR_MINT", "EXCELLENT", "GOOD", "FAIR"] as const;

export type UploadFormExisting = {
  id: string;
  title: string;
  description: string;
  priceIdr: number;
  stock: number;
  weightGrams: number;
  condition: typeof conditions[number];
  images: string[];
  categoryId: string;
};

export function UploadForm({ tree, existing }: { tree: Node[]; existing?: UploadFormExisting }) {
  const router = useRouter();
  // Flatten leaf-or-mid categories (level >= 2 ideally, but allow level 1 as fallback)
  const flatCategories = React.useMemo(() => flatten(tree), [tree]);

  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [condition, setCondition] = React.useState<typeof conditions[number]>(existing?.condition ?? "MINT");
  const [images, setImages] = React.useState<string[]>(existing?.images ?? []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const priceIdr  = Number(fd.get("price") ?? 0);
    const stock     = Number(fd.get("stock") ?? 1);
    const weight    = Number(fd.get("weight") ?? 500);

    start(async () => {
      try {
        // Push fresh data: URLs to storage; reuse already-hosted https URLs.
        const uploadable = images.filter((s) => /^https?:\/\//.test(s) || s.startsWith("data:"));
        const finalImages = await uploadImages(uploadable);
        const payload = {
          title:        String(fd.get("title")       ?? "").trim(),
          description:  String(fd.get("description") ?? "").trim(),
          priceIdr,
          stock,
          condition,
          categoryId:   String(fd.get("categoryId")  ?? ""),
          images: finalImages,
          weightGrams:  weight,
        };
        const res = existing
          ? await listingsWriteApi.update(existing.id, payload)
          : await listingsWriteApi.create(payload);
        router.push(`/listing/${res.slug}`);
      } catch (e) {
        if (e instanceof ApiError && Array.isArray(e.details)) {
          const map: Record<string, string> = {};
          for (const d of e.details as Array<{ path: string; message: string }>) map[d.path] = d.message;
          setFieldErrors(map);
        }
        setErr(e instanceof ApiError ? e.message : "Gagal mengirim. Coba lagi.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="flex flex-col gap-6">
        <Card>
          <div className="space-y-5 p-6">
            <div>
              <Label>Foto barang</Label>
              <div className="mt-2">
                <ImageUpload value={images} onChange={setImages} max={8} />
              </div>
            </div>

            <Field label="Judul" hint="8–160 karakter, deskriptif, sebut variant kalau ada" error={fieldErrors.title}>
              <Input name="title" placeholder="Charizard VMAX Rainbow Rare · PSA 10" required minLength={8} maxLength={160} defaultValue={existing?.title} />
            </Field>

            <Field label="Kategori" error={fieldErrors.categoryId}>
              <select
                name="categoryId"
                required
                defaultValue={existing?.categoryId ?? ""}
                className="h-11 w-full rounded-xl border border-rule bg-panel px-3 text-sm text-fg focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              >
                <option value="">— Pilih kategori —</option>
                {flatCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.path}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Harga (Rp)" error={fieldErrors.priceIdr}>
                <Input name="price" type="number" min={1000} max={1_000_000_000} placeholder="850000" required defaultValue={existing?.priceIdr} />
              </Field>
              <Field label="Stok" error={fieldErrors.stock}>
                <Input name="stock" type="number" min={1} max={999} defaultValue={existing?.stock ?? 1} required />
              </Field>
              <Field label="Berat (gr)" error={fieldErrors.weightGrams}>
                <Input name="weight" type="number" min={10} max={50_000} defaultValue={existing?.weightGrams ?? 500} required />
              </Field>
            </div>

            <div>
              <Label>Kondisi</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {conditions.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCondition(c)}
                    className={
                      "rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors " +
                      (condition === c
                        ? "border-brand-400 bg-brand-400/10 text-brand-500"
                        : "border-rule text-fg-muted hover:border-brand-400/50")
                    }
                  >
                    {c.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Deskripsi" hint="Sebutkan asal-usul, kondisi spesifik, packing, dan kebijakan pengiriman/return" error={fieldErrors.description}>
              <Textarea name="description" rows={5} required minLength={20} maxLength={4000} defaultValue={existing?.description} />
            </Field>
          </div>
        </Card>

        {err && (
          <div role="alert" className="rounded-xl border border-flame-400/30 bg-flame-400/10 px-4 py-3 text-sm text-flame-600">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" size="md">Simpan draft</Button>
          <Button type="submit" variant="primary" size="md" disabled={pending}>
            {pending ? "Memproses…" : existing ? "Simpan perubahan" : "Publish listing"}
          </Button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <Card className="border-brand-400/30 bg-brand-400/5">
          <div className="p-5 text-sm">
            <p className="font-semibold text-fg">Tips listing yang laku</p>
            <ul className="mt-3 space-y-2 text-fg-muted">
              <li>• Foto pertama jadi cover — gunakan latar netral & cahaya cukup.</li>
              <li>• Deskripsi 100+ kata = peluang jadi 2× lebih tinggi.</li>
              <li>• Sebut kondisi spesifik (centering, edge, whitening untuk kartu).</li>
              <li>• Listing baru di-review otomatis dalam 5 menit.</li>
            </ul>
          </div>
        </Card>
      </aside>
    </form>
  );
}

function flatten(nodes: Node[], parents: string[] = []): Array<{ id: string; path: string }> {
  const out: Array<{ id: string; path: string }> = [];
  for (const n of nodes) {
    const path = [...parents, n.name].join(" › ");
    // Allow selecting at any level — server validates the cuid is a real category.
    out.push({ id: n.id, path });
    if (n.children?.length) out.push(...flatten(n.children, [...parents, n.name]));
  }
  return out;
}

function Field({
  label, hint, error, children,
}: {
  label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-fg-subtle">{hint}</p>}
      {error && <p className="text-xs text-flame-600">{error}</p>}
    </div>
  );
}
