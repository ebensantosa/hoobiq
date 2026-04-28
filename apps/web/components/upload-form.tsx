"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Textarea } from "@hoobiq/ui";
import { ImageUpload } from "./image-upload";
import { CourierPicker } from "./courier-picker";
import { DestinationPicker, type Destination } from "./destination-picker";
import { Spinner } from "./spinner";
import { listingsWriteApi } from "@/lib/api/listings-write";
import { uploadImage } from "@/lib/api/uploads";
import { ApiError } from "@/lib/api/client";
import type { CreateListingInput as CreateListingPayload } from "@hoobiq/types";

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
  couriers?: string[];
  origin?: Destination | null;
  tradeable?: boolean;
};

type FormState = {
  title: string;
  description: string;
  price: string;     // string so the empty state is "" not 0 / NaN
  stock: string;
  weight: string;
  categoryId: string;
};

type FieldKey = keyof FormState | "images" | "condition";
type Errors = Partial<Record<FieldKey | "form", string>>;

/**
 * Field-level validation. Mirrors the server zod schema (and stays a subset
 * of it). Runs on every change AND on submit — the goal is for users to
 * never hit a server bounce-back: rules pass on the client → request goes
 * out clean.
 */
function validate(state: FormState, images: string[], condition: string): Errors {
  const e: Errors = {};
  if (state.title.trim().length < 8)              e.title = "Minimal 8 karakter.";
  else if (state.title.trim().length > 160)       e.title = "Maksimal 160 karakter.";

  if (state.description.trim().length < 20)       e.description = "Minimal 20 karakter — jelaskan kondisi & packing.";
  else if (state.description.trim().length > 4000)e.description = "Maksimal 4000 karakter.";

  const price = Number(state.price);
  if (!Number.isFinite(price) || price < 1000)    e.price = "Harga minimal Rp 1.000.";
  else if (price > 1_000_000_000)                 e.price = "Harga terlalu besar.";

  const stock = Number(state.stock);
  if (!Number.isInteger(stock) || stock < 1)      e.stock = "Stok minimal 1.";
  else if (stock > 999)                           e.stock = "Maksimal 999.";

  const weight = Number(state.weight);
  if (!Number.isInteger(weight) || weight < 10)   e.weight = "Berat minimal 10 gr.";
  else if (weight > 50_000)                       e.weight = "Maksimal 50.000 gr.";

  if (!state.categoryId)                          e.categoryId = "Pilih kategori.";
  if (images.length === 0)                        e.images = "Upload minimal 1 foto.";
  if (!conditions.includes(condition as typeof conditions[number])) e.condition = "Pilih kondisi.";

  return e;
}

export function UploadForm({ tree, existing }: { tree: Node[]; existing?: UploadFormExisting }) {
  const router = useRouter();
  const flatCategories = React.useMemo(() => flatten(tree), [tree]);

  const [state, setState] = React.useState<FormState>({
    title:       existing?.title ?? "",
    description: existing?.description ?? "",
    price:       existing?.priceIdr != null ? String(existing.priceIdr) : "",
    stock:       String(existing?.stock ?? 1),
    weight:      String(existing?.weightGrams ?? 500),
    categoryId:  existing?.categoryId ?? "",
  });
  const [condition, setCondition] = React.useState<typeof conditions[number]>(existing?.condition ?? "MINT");
  const [images, setImages]       = React.useState<string[]>(existing?.images ?? []);
  const [imageErr, setImageErr]   = React.useState<string | null>(null);
  const [couriers, setCouriers]   = React.useState<string[]>(existing?.couriers ?? []);
  const [origin, setOrigin]       = React.useState<Destination | null>(existing?.origin ?? null);
  const [tradeable, setTradeable] = React.useState<boolean>(existing?.tradeable ?? false);

  // Track which fields the user has actually interacted with — we only
  // surface errors after they've been touched (avoids "all red on first
  // paint"). Submit attempt marks all as touched.
  const [touched, setTouched] = React.useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitErr, setSubmitErr] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  // Progress feedback during the multi-step submit so users know we're
  // doing something. Two stages: uploading images (with a count), then
  // creating the listing record.
  const [progress, setProgress] = React.useState<{ stage: "idle" | "images" | "save"; done: number; total: number }>({ stage: "idle", done: 0, total: 0 });

  const liveErrors = React.useMemo(() => validate(state, images, condition), [state, images, condition]);
  const showErr = (k: FieldKey) => (touched[k] || submitErr ? liveErrors[k] : undefined);
  const isValid = Object.keys(liveErrors).length === 0 && !imageErr;

  function set<K extends keyof FormState>(key: K, val: string) {
    setState((s) => ({ ...s, [key]: val }));
  }
  function blur(k: FieldKey) {
    setTouched((t) => ({ ...t, [k]: true }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitErr(null);
    setTouched({ title: true, description: true, price: true, stock: true, weight: true, categoryId: true, images: true, condition: true });

    if (!isValid) {
      setSubmitErr("Periksa lagi field yang ditandai merah.");
      return;
    }

    start(async () => {
      try {
        // Already-hosted URLs pass through unchanged; only data: URLs need
        // to actually round-trip to the server. Show a real "X of Y" count
        // so a slow upload doesn't feel frozen.
        const uploadable = images.filter((s) => /^https?:\/\//.test(s) || s.startsWith("data:"));
        const toUpload = uploadable.filter((s) => s.startsWith("data:"));
        const passthrough = uploadable.filter((s) => !s.startsWith("data:"));

        setProgress({ stage: "images", done: 0, total: toUpload.length });
        const uploaded: string[] = [];
        // Sequential, one-at-a-time, so the counter ticks up. Parallel
        // would finish a touch faster but the progress feedback would
        // jump from 0 to N in one frame and feel just as opaque.
        for (let i = 0; i < toUpload.length; i++) {
          const url = await uploadImage(toUpload[i]!);
          uploaded.push(url);
          setProgress({ stage: "images", done: i + 1, total: toUpload.length });
        }
        const finalImages = [...passthrough, ...uploaded];

        setProgress({ stage: "save", done: 0, total: 0 });
        const payload = {
          title:       state.title.trim(),
          description: state.description.trim(),
          priceIdr:    Number(state.price),
          stock:       Number(state.stock),
          condition,
          categoryId:  state.categoryId,
          images:      finalImages,
          weightGrams: Number(state.weight),
          couriers:    couriers as CreateListingPayload["couriers"],
          originSubdistrictId: origin?.id ?? null,
          tradeable,
        };
        const res = existing
          ? await listingsWriteApi.update(existing.id, payload)
          : await listingsWriteApi.create(payload);
        setProgress({ stage: "idle", done: 0, total: 0 });
        router.push(`/listing/${res.slug}`);
      } catch (e) {
        setProgress({ stage: "idle", done: 0, total: 0 });
        // Surface server validation errors in the same inline slots — never
        // throw an alert. ApiError.details (when present) maps zod paths to
        // human messages we can attach to fields.
        if (e instanceof ApiError && Array.isArray(e.details)) {
          for (const d of e.details as Array<{ path: string; message: string }>) {
            // No state slot for arbitrary server keys; stuff into top error
            // line instead. Common path → friendly message:
            setSubmitErr(`${d.path}: ${d.message}`);
          }
        } else {
          setSubmitErr(e instanceof ApiError ? e.message : "Gagal mengirim. Coba lagi.");
        }
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-6" noValidate>
      <Section title="Foto" subtitle="Foto pertama jadi cover.">
        <ImageUpload value={images} onChange={setImages} max={8} onError={setImageErr} />
        {showErr("images") && <FieldError>{showErr("images")}</FieldError>}
      </Section>

      <Section title="Detail produk" subtitle="Wajib diisi lengkap supaya pembeli yakin.">
        <Field label="Judul" hint="8–160 karakter, deskriptif. Sebut variant kalau ada." error={showErr("title")}>
          <Input
            value={state.title}
            onChange={(e) => set("title", e.target.value)}
            onBlur={() => blur("title")}
            placeholder="Charizard VMAX Rainbow Rare · PSA 10"
            invalid={!!showErr("title")}
          />
        </Field>

        <Field label="Kategori" error={showErr("categoryId")}>
          <select
            value={state.categoryId}
            onChange={(e) => { set("categoryId", e.target.value); blur("categoryId"); }}
            onBlur={() => blur("categoryId")}
            className={
              "h-12 w-full rounded-xl border bg-panel px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-400/20 " +
              (showErr("categoryId") ? "border-flame-400 focus:border-flame-400" : "border-rule focus:border-brand-400/60")
            }
          >
            <option value="">— Pilih kategori —</option>
            {flatCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.path}</option>
            ))}
          </select>
        </Field>

        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Harga (Rp)" error={showErr("price")}>
            <Input
              type="number"
              min={1000}
              max={1_000_000_000}
              placeholder="850000"
              value={state.price}
              onChange={(e) => set("price", e.target.value)}
              onBlur={() => blur("price")}
              invalid={!!showErr("price")}
            />
          </Field>
          <Field label="Stok" error={showErr("stock")}>
            <Input
              type="number"
              min={1}
              max={999}
              value={state.stock}
              onChange={(e) => set("stock", e.target.value)}
              onBlur={() => blur("stock")}
              invalid={!!showErr("stock")}
            />
          </Field>
          <Field label="Berat (gr)" error={showErr("weight")} hint="Untuk kalkulasi ongkir.">
            <Input
              type="number"
              min={10}
              max={50_000}
              value={state.weight}
              onChange={(e) => set("weight", e.target.value)}
              onBlur={() => blur("weight")}
              invalid={!!showErr("weight")}
            />
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
                  "rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors " +
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

        <Field label="Deskripsi" hint="Asal-usul, kondisi spesifik (centering/edge/whitening), packing, return policy." error={showErr("description")}>
          <Textarea
            rows={6}
            value={state.description}
            onChange={(e) => set("description", e.target.value)}
            onBlur={() => blur("description")}
            invalid={!!showErr("description")}
          />
          <div className="mt-1 flex justify-end font-mono text-[11px] text-fg-subtle">
            {state.description.length} / 4000
          </div>
        </Field>
      </Section>

      <Section title="Pengiriman" subtitle="Wajib di-set supaya pembeli bisa hitung ongkir.">
        <Field label="Lokasi pickup" hint="Kelurahan/kecamatan tempat kamu kirim paket.">
          <DestinationPicker
            value={origin}
            onChange={setOrigin}
            placeholder="Cari kecamatan/kelurahan kamu…"
          />
        </Field>
        <Field label="Ekspedisi yang didukung" hint="Centang yang biasa kamu pakai. Minimal 1.">
          <CourierPicker value={couriers} onChange={setCouriers} />
        </Field>
      </Section>

      <Section title="Trade" subtitle="Tampilkan listing ini di /trades supaya bisa ditukar dengan barang user lain.">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={tradeable}
            onChange={(e) => setTradeable(e.target.checked)}
            className="peer sr-only"
          />
          <span className="relative inline-block h-6 w-11 rounded-full bg-panel-2 transition-colors peer-checked:bg-brand-400 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
          <span className="text-sm text-fg">{tradeable ? "Tersedia untuk trade" : "Hanya untuk dijual"}</span>
        </label>
      </Section>

      {submitErr && (
        <div role="alert" className="rounded-xl border border-flame-400/40 bg-flame-400/10 px-4 py-3 text-sm text-flame-600">
          {submitErr}
        </div>
      )}

      <div className="sticky bottom-4 z-20 flex items-center justify-end gap-3 rounded-2xl border border-rule bg-canvas/85 px-4 py-3 shadow-lg backdrop-blur">
        <p className="mr-auto flex items-center gap-2 text-xs text-fg-subtle">
          {progress.stage === "images" ? (
            <>
              <Spinner size={12} />
              <span>Mengunggah foto {progress.done} / {progress.total}…</span>
            </>
          ) : progress.stage === "save" ? (
            <>
              <Spinner size={12} />
              <span>{existing ? "Menyimpan perubahan…" : "Membuat listing…"}</span>
            </>
          ) : (
            <span>{isValid ? "Siap dipublish" : "Lengkapi field merah dulu"}</span>
          )}
        </p>
        <Button type="submit" variant="primary" size="md" disabled={pending || !isValid}>
          {pending && <Spinner size={14} />}
          <span className={pending ? "ml-2" : ""}>
            {pending ? "Memproses…" : existing ? "Simpan perubahan" : "Publish listing"}
          </span>
        </Button>
      </div>
    </form>
  );
}

function flatten(nodes: Node[], parents: string[] = []): Array<{ id: string; path: string }> {
  const out: Array<{ id: string; path: string }> = [];
  for (const n of nodes) {
    const path = [...parents, n.name].join(" › ");
    out.push({ id: n.id, path });
    if (n.children?.length) out.push(...flatten(n.children, [...parents, n.name]));
  }
  return out;
}

function Section({
  title, subtitle, children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="space-y-5 p-6 md:p-8">
        <div>
          <h2 className="text-base font-semibold text-fg md:text-lg">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </Card>
  );
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
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-flame-600">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
      </svg>
      {children}
    </p>
  );
}
