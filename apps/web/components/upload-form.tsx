"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label, Textarea } from "@hoobiq/ui";
import { ImageUpload } from "./image-upload";
import { CourierPicker } from "./courier-picker";
import { DestinationPicker, type Destination } from "./destination-picker";
import { Spinner } from "./spinner";
import { listingsWriteApi } from "@/lib/api/listings-write";
import { uploadImage } from "@/lib/api/uploads";
import { ApiError } from "@/lib/api/client";
import type { CreateListingInput as CreateListingPayload, Condition } from "@hoobiq/types";
import { CONDITION_LABELS } from "@hoobiq/types";

type Node = {
  id: string;
  slug: string;
  name: string;
  level: number;
  children: Node[];
};

const conditions: readonly Condition[] = [
  "BRAND_NEW_SEALED",
  "LIKE_NEW",
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "POOR",
];

export type UploadFormExisting = {
  id: string;
  slug?: string;
  title: string;
  description: string;
  priceIdr: number;
  /** Optional "before" price for the strike-through display. */
  compareAtIdr?: number | null;
  brand?: string | null;
  variant?: string | null;
  warranty?: string | null;
  stock: number;
  weightGrams: number;
  condition: Condition;
  images: string[];
  categoryId: string;
  couriers?: string[];
  origin?: Destination | null;
  tradeable?: boolean;
  showOnFeed?: boolean;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  isPreorder?: boolean;
  preorderShipDays?: number | null;
};

type FormState = {
  title: string;
  description: string;
  price: string;     // string so the empty state is "" not 0 / NaN
  /** Optional "before" price the buyer sees struck through. Empty string
   *  = no discount; the form leaves the field cleared. */
  compareAt: string;
  brand: string;
  variant: string;
  warranty: string;
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

  // compareAt is optional — but when present it must be a valid number
  // strictly higher than `price` so the strike-through actually reads
  // as a discount. Empty string skips the check entirely.
  if (state.compareAt.trim() !== "") {
    const cmp = Number(state.compareAt);
    if (!Number.isFinite(cmp) || cmp < 1000)      e.compareAt = "Minimal Rp 1.000.";
    else if (cmp > 1_000_000_000)                 e.compareAt = "Terlalu besar.";
    else if (Number.isFinite(price) && cmp <= price) e.compareAt = "Harus lebih tinggi dari harga jual.";
  }

  const stock = Number(state.stock);
  if (!Number.isInteger(stock) || stock < 1)      e.stock = "Stok minimal 1.";
  else if (stock > 999)                           e.stock = "Maksimal 999.";

  const weight = Number(state.weight);
  if (!Number.isInteger(weight) || weight < 10)   e.weight = "Berat minimal 10 gr.";
  else if (weight > 50_000)                       e.weight = "Maksimal 50.000 gr.";

  if (!state.categoryId)                          e.categoryId = "Pilih kategori.";
  if (images.length < 3)                          e.images = "Upload minimal 3 foto.";
  if (!conditions.includes(condition as Condition)) e.condition = "Pilih kondisi.";

  return e;
}

export function UploadForm({ tree, existing, clone }: { tree: Node[]; existing?: UploadFormExisting; clone?: UploadFormExisting }) {
  const router = useRouter();

  // Clone seeds the form like `existing` does, but submit goes through
  // create (not update) — so the seller can spawn near-duplicates of an
  // existing listing without redoing every spec. Per spec, the cloned
  // listing zeroes out: title, description, price, compareAt, images,
  // condition (back to default), and stock — those identify the actual
  // SKU. Everything else (kategori, sub-kategori, series/set, weight,
  // dimensions, brand, variant, warranty, couriers) carries over.
  const seed = existing ?? clone;
  const [state, setState] = React.useState<FormState>({
    title:       existing?.title ?? "",
    description: existing?.description ?? "",
    price:       existing?.priceIdr != null ? String(existing.priceIdr) : "",
    compareAt:   existing?.compareAtIdr != null ? String(existing.compareAtIdr) : "",
    brand:       seed?.brand ?? "",
    variant:     seed?.variant ?? "",
    warranty:    seed?.warranty ?? "",
    stock:       String(existing?.stock ?? 1),
    weight:      String(seed?.weightGrams ?? 500),
    categoryId:  seed?.categoryId ?? "",
  });
  const [condition, setCondition] = React.useState<Condition>(
    (existing?.condition as Condition | undefined) ?? "BRAND_NEW_SEALED",
  );
  const [images, setImages]       = React.useState<string[]>(existing?.images ?? []);
  const [imageErr, setImageErr]   = React.useState<string | null>(null);
  const [couriers, setCouriers]   = React.useState<string[]>(seed?.couriers ?? []);
  const [origin, setOrigin]       = React.useState<Destination | null>(seed?.origin ?? null);
  // Default ON — collectors expect listings to be at least theoretically
  // tradeable. Sellers untick to opt out per item.
  const [tradeable, setTradeable] = React.useState<boolean>(seed?.tradeable ?? true);
  // Default ON — most sellers want their listing to surface on their
  // public profile feed too (free reach). Untick if you want marketplace
  // and feed kept separate (showcase-only feed). Edits keep the existing
  // value when present.
  const [showOnFeed, setShowOnFeed] = React.useState<boolean>(seed?.showOnFeed ?? true);
  // Optional package dimensions — strings so empty input round-trips
  // cleanly. Sent as `null` when blank so the API treats them as
  // "not measured" rather than zero.
  const [lengthCm, setLengthCm] = React.useState<string>(seed?.lengthCm != null ? String(seed.lengthCm) : "");
  const [widthCm,  setWidthCm]  = React.useState<string>(seed?.widthCm  != null ? String(seed.widthCm)  : "");
  const [heightCm, setHeightCm] = React.useState<string>(seed?.heightCm != null ? String(seed.heightCm) : "");
  // Pre-order toggle. Default OFF — most listings ship right away.
  const [isPreorder, setIsPreorder] = React.useState<boolean>(existing?.isPreorder ?? false);
  const [preorderShipDays, setPreorderShipDays] = React.useState<string>(
    existing?.preorderShipDays != null ? String(existing.preorderShipDays) : "15",
  );
  /** Set when the seller picks "Buat baru" in the sub-kategori or
   *  series/set combobox. Submit handler bundles this into the
   *  pendingCategory payload; categoryId stays at the parent. */
  const [pendingCategoryName, setPendingCategoryName] = React.useState<string | null>(null);

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
    setTouched({ title: true, description: true, price: true, compareAt: true, stock: true, weight: true, categoryId: true, images: true, condition: true });

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
        const compareAtNum = state.compareAt.trim() === "" ? null : Number(state.compareAt);
        const payload = {
          title:       state.title.trim(),
          description: state.description.trim(),
          priceIdr:    Number(state.price),
          // null clears compareAt on update; create just omits it via
          // the spread when null. Either way the server treats null as
          // "no discount" (no strike-through rendered).
          compareAtIdr: compareAtNum,
          brand:    state.brand.trim()    || null,
          variant:  state.variant.trim()  || null,
          warranty: state.warranty.trim() || null,
          stock:       Number(state.stock),
          condition,
          categoryId:  state.categoryId,
          // When the seller typed a brand-new sub-cat / series in the
          // creatable picker, the server creates a CategoryRequest and
          // parks the listing at moderation="pending_category" until
          // an admin approves. categoryId above stays at the parent.
          ...(pendingCategoryName && {
            pendingCategory: { name: pendingCategoryName },
          }),
          images:      finalImages,
          weightGrams: Number(state.weight),
          couriers:    couriers as CreateListingPayload["couriers"],
          originSubdistrictId: origin?.id ?? null,
          tradeable,
          showOnFeed,
          lengthCm: lengthCm.trim() === "" ? null : Math.max(1, Math.round(Number(lengthCm))) || null,
          widthCm:  widthCm.trim()  === "" ? null : Math.max(1, Math.round(Number(widthCm)))  || null,
          heightCm: heightCm.trim() === "" ? null : Math.max(1, Math.round(Number(heightCm))) || null,
          isPreorder,
          preorderShipDays: isPreorder
            ? Math.min(30, Math.max(2, Math.round(Number(preorderShipDays) || 15)))
            : null,
        };
        const res = existing
          ? await listingsWriteApi.update(existing.id, payload)
          : await listingsWriteApi.create(payload);
        setProgress({ stage: "idle", done: 0, total: 0 });
        // Pending-category listings aren't public yet — bounce the
        // seller to their dashboard so the "menunggu approval" state
        // is the first thing they see, instead of a 404-ish detail page.
        if (!existing && "pendingCategory" in res && res.pendingCategory) {
          router.push("/jual?from=pending");
        } else {
          router.push(`/listing/${res.slug}`);
        }
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

        <CategoryPicker
          tree={tree}
          value={state.categoryId}
          onChange={(id) => { set("categoryId", id); blur("categoryId"); }}
          error={showErr("categoryId")}
          pendingName={pendingCategoryName}
          onPendingChange={setPendingCategoryName}
        />
        <p className="-mt-3 text-[11px] text-fg-subtle">
          Belum ada series/anime yang kamu cari?{" "}
          <a href="/pengaturan/kategori-baru" className="font-semibold text-brand-500">
            Request kategori baru
          </a>
        </p>

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
          <Field
            label="Harga coret (opsional)"
            hint="Harga sebelum diskon. Buyer lihat strike-through + persen hemat."
            error={showErr("compareAt")}
          >
            <Input
              type="number"
              min={1000}
              max={1_000_000_000}
              placeholder="kosongin kalau tidak ada diskon"
              value={state.compareAt}
              onChange={(e) => set("compareAt", e.target.value)}
              onBlur={() => blur("compareAt")}
              invalid={!!showErr("compareAt")}
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

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Panjang (cm) — opsional" hint="Sisi terpanjang paket.">
            <Input type="number" min={1} max={500} value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} placeholder="—" />
          </Field>
          <Field label="Lebar (cm) — opsional">
            <Input type="number" min={1} max={500} value={widthCm} onChange={(e) => setWidthCm(e.target.value)} placeholder="—" />
          </Field>
          <Field label="Tinggi (cm) — opsional">
            <Input type="number" min={1} max={500} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="—" />
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
                {CONDITION_LABELS[c]}
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

      <Section
        title="Spesifikasi (opsional)"
        subtitle="Kalau diisi, muncul di blok Spesifikasi produk pada halaman detail."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Brand" hint="Pop Mart, Bandai, Pokémon, dll.">
            <Input
              value={state.brand}
              onChange={(e) => set("brand", e.target.value)}
              maxLength={80}
              placeholder="—"
            />
          </Field>
          <Field label="Varian" hint="Warna, edisi, ukuran, atau seri.">
            <Input
              value={state.variant}
              onChange={(e) => set("variant", e.target.value)}
              maxLength={120}
              placeholder="—"
            />
          </Field>
          <Field label="Garansi" hint="Resmi 1 tahun, no warranty, dll.">
            <Input
              value={state.warranty}
              onChange={(e) => set("warranty", e.target.value)}
              maxLength={160}
              placeholder="—"
            />
          </Field>
        </div>
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

      <Section title="Pre-order" subtitle="Aktifkan jika barang membutuhkan waktu sebelum dikirim.">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={isPreorder}
            onChange={(e) => setIsPreorder(e.target.checked)}
            className="peer sr-only"
          />
          <span className="relative inline-block h-6 w-11 rounded-full bg-panel-2 transition-colors peer-checked:bg-brand-400 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
          <span className="text-sm text-fg">{isPreorder ? "Listing pre-order" : "Ready stock"}</span>
        </label>
        {isPreorder && (
          <div className="mt-4 grid gap-3 rounded-xl border border-rule bg-panel-2/40 p-4">
            <Field label="Janji kirim (hari)" hint="Pre-order 2–30 hari.">
              <Input
                type="number"
                min={2}
                max={30}
                value={preorderShipDays}
                onChange={(e) => setPreorderShipDays(e.target.value)}
              />
            </Field>
            <p className="text-[11px] leading-relaxed text-fg-subtle">
              Pastikan estimasi sesuai dan pesanan dikirim tidak melebihi jangka
              waktu untuk menghindari pembatalan pemesanan.
            </p>
          </div>
        )}
      </Section>

      <Section title="Visibilitas" subtitle="Atur di mana listing ini tampil — pisahin marketplace dan feed kalau profil mau cuma buat showcase.">
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
        <label className="mt-3 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={showOnFeed}
            onChange={(e) => setShowOnFeed(e.target.checked)}
            className="peer sr-only"
          />
          <span className="relative inline-block h-6 w-11 rounded-full bg-panel-2 transition-colors peer-checked:bg-brand-400 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
          <span className="text-sm text-fg">{showOnFeed ? "Tampilkan di feed profil" : "Sembunyikan dari feed profil (marketplace only)"}</span>
        </label>
      </Section>

      {existing?.slug && (
        <Section title="Salin produk" subtitle="Buat listing baru pakai spec yang sama. Judul, foto, deskripsi & kondisi mulai dari kosong — kategori, brand, dimensi, dll. otomatis ke-isi.">
          <Link
            href={`/upload?clone=${encodeURIComponent(existing.slug)}`}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-rule bg-panel px-4 text-sm font-semibold text-fg transition-colors hover:border-brand-400/60 hover:text-brand-500"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Salin jadi listing baru
          </Link>
        </Section>
      )}

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

/**
 * Three dependent pickers matching the Hoobiq spec wording:
 *   Kategori → Sub Kategori → Series/Set
 *
 * Level 1 stays a plain select (5 fixed primary buckets). Level 2
 * and Level 3 are creatable comboboxes — the seller can pick an
 * existing option OR type a brand-new name. When they pick "Buat
 * baru: <name>", the form sets `pendingCategoryName` and the listing
 * gets created at moderation="pending_category" with a CategoryRequest
 * linked to it. Admin approval cascades a publish.
 *
 * The form's persisted `categoryId` is the deepest existing ancestor
 * (the parent of the new node when pendingCategoryName is set, or
 * the leaf id otherwise).
 */
function CategoryPicker({
  tree, value, onChange, error, pendingName, onPendingChange,
}: {
  tree: Node[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
  pendingName: string | null;
  onPendingChange: (name: string | null) => void;
}) {
  // Build a flat lookup so we can resolve the ancestor chain of the
  // currently-stored value when the form mounts.
  const byId = React.useMemo(() => {
    const m = new Map<string, { node: Node; parentId: string | null }>();
    const walk = (nodes: Node[], parentId: string | null) => {
      for (const n of nodes) {
        m.set(n.id, { node: n, parentId });
        if (n.children?.length) walk(n.children, n.id);
      }
    };
    walk(tree, null);
    return m;
  }, [tree]);

  // Resolve initial L1/L2/L3 from `value` (deepest-first stored id).
  const initial = React.useMemo(() => {
    if (!value) return { l1: "", l2: "", l3: "" };
    const chain: string[] = [];
    let cur = byId.get(value);
    while (cur) {
      chain.unshift(cur.node.id);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return { l1: chain[0] ?? "", l2: chain[1] ?? "", l3: chain[2] ?? "" };
  }, [value, byId]);

  const [l1, setL1] = React.useState(initial.l1);
  const [l2, setL2] = React.useState(initial.l2);
  const [l3, setL3] = React.useState(initial.l3);

  // Sync if `value` is reset externally (e.g. server-side validation reset).
  React.useEffect(() => {
    setL1(initial.l1); setL2(initial.l2); setL3(initial.l3);
  }, [initial.l1, initial.l2, initial.l3]);

  // Top-level picker is restricted to the 5 canonical buckets so legacy
  // level-1 rows (Action Figure, Blind Box, Merchandise dup) don't pollute
  // the dropdown. Listings created under those rows still resolve correctly
  // because byId/initial uses the full tree, so editing an old listing
  // shows its real ancestor chain even if the parent isn't pickable anymore.
  const PRIMARY_SLUGS = new Set(["collection-cards", "trading-cards", "merchandise", "toys", "others"]);
  const ORDER = ["collection-cards", "trading-cards", "merchandise", "toys", "others"];
  const l1Nodes = React.useMemo(
    () => tree
      .filter((n) => PRIMARY_SLUGS.has(n.slug))
      .sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug)),
    [tree],
  );
  const l2Nodes = React.useMemo(
    () => l1Nodes.find((n) => n.id === l1)?.children ?? [],
    [l1Nodes, l1],
  );
  const l3Nodes = React.useMemo(
    () => l2Nodes.find((n) => n.id === l2)?.children ?? [],
    [l2Nodes, l2],
  );

  const selectClass = (hasError: boolean) =>
    "h-12 w-full rounded-xl border bg-panel px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-400/20 " +
    (hasError ? "border-flame-400 focus:border-flame-400" : "border-rule focus:border-brand-400/60");

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Kategori" error={error}>
          <select
            value={l1}
            onChange={(e) => {
              const v = e.target.value;
              setL1(v); setL2(""); setL3("");
              onPendingChange(null);
              onChange(v);
            }}
            className={selectClass(!!error && !l1)}
          >
            <option value="">— Pilih —</option>
            {l1Nodes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        <Field
          label="Sub Kategori"
          hint={l1 && l2Nodes.length === 0 ? "Belum ada sub — ketik untuk buat baru." : undefined}
        >
          <CreatablePicker
            disabled={!l1}
            disabledHint="Pilih kategori dulu"
            options={l2Nodes.map((c) => ({ id: c.id, name: c.name }))}
            selectedId={l2}
            pendingName={pendingName !== null && !l3 ? pendingName : null}
            onPick={(id) => {
              setL2(id); setL3("");
              onPendingChange(null);
              onChange(id);
            }}
            onCreate={(name) => {
              // Buat baru di level 2 — parent is L1.
              setL2(""); setL3("");
              onPendingChange(name);
              onChange(l1);
            }}
          />
        </Field>

        <Field
          label="Series / Set"
          hint={
            l2 && l3Nodes.length === 0
              ? "Belum ada series — ketik untuk buat baru."
              : undefined
          }
        >
          <CreatablePicker
            disabled={!l2}
            disabledHint="Pilih sub kategori dulu"
            options={l3Nodes.map((c) => ({ id: c.id, name: c.name }))}
            selectedId={l3}
            pendingName={pendingName !== null && !!l2 && !l3 ? pendingName : null}
            onPick={(id) => {
              setL3(id);
              onPendingChange(null);
              onChange(id);
            }}
            onCreate={(name) => {
              // Buat baru di level 3 — parent is L2.
              setL3("");
              onPendingChange(name);
              onChange(l2);
            }}
          />
        </Field>
      </div>

      {pendingName && (
        <div className="rounded-md border border-brand-400/40 bg-brand-400/5 px-3 py-2 text-xs text-fg">
          <span className="font-semibold text-brand-500">Kategori baru:</span>{" "}
          “{pendingName}” akan direview admin. Listing kamu tersimpan di
          dashboard tapi <b>belum tampil di marketplace</b> sampai disetujui.
        </div>
      )}
    </div>
  );
}

/**
 * Creatable combobox — search existing options, or press Enter (or
 * click the "+ Buat baru" row) to propose a new one. Single shared
 * UI for sub-kategori + series/set so both pickers behave identically.
 */
function CreatablePicker({
  disabled, disabledHint, options, selectedId, pendingName, onPick, onCreate,
}: {
  disabled: boolean;
  disabledHint: string;
  options: { id: string; name: string }[];
  selectedId: string;
  /** Name the seller has typed but not yet committed; surfaces as a chip. */
  pendingName: string | null;
  onPick: (id: string) => void;
  onCreate: (name: string) => void;
}) {
  const selected = options.find((o) => o.id === selectedId) ?? null;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Reset query when the picker closes or the parent changes.
  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      // `Node` is shadowed by the local category-tree Node type at the
      // top of this file, so disambiguate to the DOM Node here.
      if (!containerRef.current?.contains(e.target as globalThis.Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = q.length === 0
    ? options
    : options.filter((o) => o.name.toLowerCase().includes(q));
  const exactExists = q.length > 0 && options.some((o) => o.name.toLowerCase() === q);
  const canCreate = q.length >= 2 && !exactExists;

  // The trigger doubles as the displayed label (selected name, pending
  // chip, or placeholder). Clicking opens the dropdown which holds the
  // search field + filtered list + create row.
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={
          "flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-rule bg-panel px-3 text-left text-sm text-fg transition-colors hover:border-brand-400/50 focus:outline-none focus:ring-2 focus:ring-brand-400/20 " +
          (disabled ? "opacity-50" : "")
        }
      >
        <span className="truncate">
          {selected ? (
            selected.name
          ) : pendingName ? (
            <span className="inline-flex items-center gap-1.5">
              <span>{pendingName}</span>
              <span className="rounded-sm bg-brand-400/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-500">
                BARU
              </span>
            </span>
          ) : (
            <span className="text-fg-subtle">
              {disabled ? disabledHint : "— Pilih atau ketik baru —"}
            </span>
          )}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          className={"text-fg-subtle transition-transform " + (open ? "rotate-180" : "")}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-rule bg-canvas shadow-xl">
          <div className="border-b border-rule p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreate) {
                  e.preventDefault();
                  onCreate(query.trim());
                  setOpen(false);
                }
              }}
              placeholder="Cari atau ketik baru…"
              className="h-9 w-full rounded-md border border-rule bg-panel px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/15"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1 text-sm">
            {matches.length === 0 && q.length === 0 && (
              <li className="px-3 py-2 text-xs text-fg-subtle">
                Belum ada pilihan. Ketik untuk buat baru.
              </li>
            )}
            {matches.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => { onPick(o.id); setOpen(false); }}
                  className={
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-panel " +
                    (o.id === selectedId ? "bg-brand-400/10 text-fg" : "text-fg-muted")
                  }
                >
                  <span className="truncate">{o.name}</span>
                  {o.id === selectedId && <span className="text-brand-500">✓</span>}
                </button>
              </li>
            ))}
            {canCreate && (
              <li className="border-t border-rule">
                <button
                  type="button"
                  onClick={() => { onCreate(query.trim()); setOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-brand-500 hover:bg-brand-400/10"
                >
                  <span aria-hidden>+</span>
                  <span className="truncate">Buat baru: “{query.trim()}”</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
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
