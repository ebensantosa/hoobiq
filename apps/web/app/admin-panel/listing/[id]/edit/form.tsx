"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { uploadImage } from "@/lib/api/uploads";

/** Server-side Zod issue shape — mirrors apps/api ZodPipe response. */
type ValidationDetail = { path: string; message: string };

/** Map zod field paths to the human label used in the form, so the
 *  inline error doesn't read like a JSON path. */
const FIELD_LABEL: Record<string, string> = {
  title: "Judul",
  description: "Deskripsi",
  priceIdr: "Harga",
  compareAtIdr: "Harga coret",
  brand: "Brand",
  variant: "Varian",
  warranty: "Garansi",
  categoryId: "Kategori",
  condition: "Kondisi",
  stock: "Stok",
  weightGrams: "Berat",
  tradeable: "Tradeable",
  moderation: "Status moderasi",
  isPublished: "Status publish",
  images: "Foto",
  sellerRef: "Pindahkan ke seller",
};

type UserHit = { id: string; username: string; email: string; name: string | null };

export type AdminListingDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceIdr: number;
  /** Strike-through "before" price. null = no discount. */
  compareAtIdr: number | null;
  brand: string | null;
  variant: string | null;
  warranty: string | null;
  condition: "BRAND_NEW_SEALED" | "LIKE_NEW" | "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  stock: number;
  weightGrams: number;
  tradeable: boolean;
  moderation: "pending" | "active" | "hidden" | "rejected";
  isPublished: boolean;
  images: string[];
  seller: { id: string; username: string; name: string | null; email: string };
  category: { id: string; slug: string; name: string };
};

export type CategoryOption = { id: string; label: string; level: number };

const CONDITIONS: AdminListingDetail["condition"][] = [
  "BRAND_NEW_SEALED",
  "LIKE_NEW",
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "POOR",
];

const MOD_OPTIONS: AdminListingDetail["moderation"][] = ["active", "pending", "hidden", "rejected"];

export function ListingEditForm({
  initial,
  categories,
}: {
  initial: AdminListingDetail;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [state, setState]   = React.useState({
    title: initial.title,
    description: initial.description,
    priceIdr: initial.priceIdr,
    // Empty string in the form = no discount; a number sets it. Send
    // null to the API on save when the field is cleared so the server
    // wipes the persisted compareAt.
    compareAtIdr: initial.compareAtIdr != null ? String(initial.compareAtIdr) : "",
    brand: initial.brand ?? "",
    variant: initial.variant ?? "",
    warranty: initial.warranty ?? "",
    condition: initial.condition,
    categoryId: initial.category.id,
    stock: initial.stock,
    weightGrams: initial.weightGrams,
    tradeable: initial.tradeable,
    moderation: initial.moderation,
    isPublished: initial.isPublished,
    images: initial.images,
    sellerRef: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [err, setErr]       = React.useState<string | null>(null);
  /** Field-level errors from the server (populated when ZodPipe rejects
   *  the body). Keyed by the zod `path` so each field can show its own
   *  message inline instead of dumping the whole list at the bottom. */
  const [fieldErrs, setFieldErrs] = React.useState<Record<string, string>>({});
  const [ok, setOk]         = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  // ---- Seller typeahead ------------------------------------------------
  // Hits /admin/users?q=<input> after the user has typed ≥ 3 chars,
  // debounced to keep the request volume reasonable. The dropdown
  // surfaces username + name + email so the admin can disambiguate
  // between near-identical handles before committing the transfer.
  const [sellerHits, setSellerHits] = React.useState<UserHit[]>([]);
  const [sellerOpen, setSellerOpen] = React.useState(false);
  const [sellerLoading, setSellerLoading] = React.useState(false);
  React.useEffect(() => {
    const raw = state.sellerRef.trim().replace(/^@+/, "");
    if (raw.length < 3) {
      setSellerHits([]);
      setSellerLoading(false);
      return;
    }
    setSellerLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await api<{ items: UserHit[] }>(
          `/admin/users?q=${encodeURIComponent(raw)}`,
          { signal: ctrl.signal },
        );
        setSellerHits(res.items.slice(0, 8));
      } catch {
        // Silently swallow — typeahead failures shouldn't block save.
      } finally {
        setSellerLoading(false);
      }
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [state.sellerRef]);

  function patch<K extends keyof typeof state>(key: K, value: (typeof state)[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function pickImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true); setErr(null);
    try {
      const uploaded: string[] = [];
      for (const f of Array.from(files)) {
        const url = await uploadImage(f, "listings");
        uploaded.push(url);
      }
      patch("images", [...state.images, ...uploaded].slice(0, 8));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    patch("images", state.images.filter((_, i) => i !== idx));
  }

  function makeCover(idx: number) {
    if (idx === 0) return;
    const next = [...state.images];
    const [picked] = next.splice(idx, 1);
    if (picked !== undefined) next.unshift(picked);
    patch("images", next);
  }

  async function save() {
    setSaving(true); setErr(null); setFieldErrs({}); setOk(false);
    try {
      const body: Record<string, unknown> = {
        title: state.title.trim(),
        description: state.description.trim(),
        priceIdr: Number(state.priceIdr) || 0,
        // "" → null (clear discount); number string → number; trim
        // catches accidental whitespace from copy/paste.
        compareAtIdr: state.compareAtIdr.trim() === "" ? null : Number(state.compareAtIdr),
        brand:    state.brand.trim()    || null,
        variant:  state.variant.trim()  || null,
        warranty: state.warranty.trim() || null,
        categoryId: state.categoryId,
        condition: state.condition,
        stock: Number(state.stock) || 0,
        weightGrams: Number(state.weightGrams) || 0,
        tradeable: state.tradeable,
        moderation: state.moderation,
        isPublished: state.isPublished,
        images: state.images,
      };
      if (state.sellerRef.trim()) body.sellerRef = state.sellerRef.trim();
      await api(`/admin/listings/${initial.id}`, { method: "PATCH", body });
      setOk(true);
      router.refresh();
    } catch (e) {
      // Surface zod field-level details when present so the admin can
      // see exactly which field tripped validation rather than the
      // generic "Input tidak valid" the server's envelope returns.
      if (e instanceof ApiError && Array.isArray(e.details)) {
        const map: Record<string, string> = {};
        const summary: string[] = [];
        for (const raw of e.details as ValidationDetail[]) {
          if (!raw || typeof raw.message !== "string") continue;
          const path = String(raw.path ?? "");
          const label = FIELD_LABEL[path] ?? path ?? "Input";
          map[path] = raw.message;
          summary.push(`${label}: ${raw.message}`);
        }
        setFieldErrs(map);
        setErr(summary.length ? summary.join(" · ") : e.message);
      } else if (e instanceof ApiError) {
        // Non-validation errors (seller_not_found, not_found, …). Use
        // the server's human message so the admin knows what to retry.
        setErr(e.message);
      } else {
        setErr(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 grid max-w-5xl gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex flex-col gap-4 p-5">
            <Section title="Konten" />
            <Field label="Judul">
              <Input value={state.title} onChange={(e) => patch("title", e.target.value)} maxLength={140} />
            </Field>
            <Field label="Deskripsi">
              <textarea
                value={state.description}
                onChange={(e) => patch("description", e.target.value)}
                rows={6}
                maxLength={8000}
                className="w-full resize-y rounded-lg border border-rule bg-panel px-3 py-2 text-sm text-fg focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/15"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Kategori">
                <select
                  value={state.categoryId}
                  onChange={(e) => patch("categoryId", e.target.value)}
                  className="h-10 rounded-lg border border-rule bg-panel px-3 text-sm text-fg"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Kondisi">
                <select
                  value={state.condition}
                  onChange={(e) => patch("condition", e.target.value as AdminListingDetail["condition"])}
                  className="h-10 rounded-lg border border-rule bg-panel px-3 text-sm text-fg"
                >
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                </select>
              </Field>
              <Field label="Harga (IDR rupiah)">
                <Input
                  type="number"
                  value={state.priceIdr}
                  onChange={(e) => patch("priceIdr", Number(e.target.value))}
                  className="font-mono"
                />
              </Field>
              <Field label="Stok">
                <Input
                  type="number"
                  value={state.stock}
                  onChange={(e) => patch("stock", Number(e.target.value))}
                  className="font-mono"
                />
              </Field>
              <Field label="Berat (gram)">
                <Input
                  type="number"
                  value={state.weightGrams}
                  onChange={(e) => patch("weightGrams", Number(e.target.value))}
                  className="font-mono"
                />
              </Field>
              <Field label="Harga coret (IDR · opsional)">
                <Input
                  type="number"
                  value={state.compareAtIdr}
                  onChange={(e) => patch("compareAtIdr", e.target.value)}
                  placeholder="kosongin = tanpa diskon"
                  className="font-mono"
                />
                {fieldErrs.compareAtIdr && (
                  <p className="mt-1 text-[11px] text-flame-600">{fieldErrs.compareAtIdr}</p>
                )}
              </Field>
              <Field label="Brand">
                <Input
                  value={state.brand}
                  onChange={(e) => patch("brand", e.target.value)}
                  placeholder="—"
                  maxLength={80}
                />
              </Field>
              <Field label="Varian">
                <Input
                  value={state.variant}
                  onChange={(e) => patch("variant", e.target.value)}
                  placeholder="—"
                  maxLength={120}
                />
              </Field>
              <Field label="Garansi">
                <Input
                  value={state.warranty}
                  onChange={(e) => patch("warranty", e.target.value)}
                  placeholder="—"
                  maxLength={160}
                />
              </Field>
              <Field label="Tradeable">
                <label className="flex h-10 items-center gap-2 rounded-lg border border-rule bg-panel px-3 text-sm text-fg">
                  <input
                    type="checkbox"
                    checked={state.tradeable}
                    onChange={(e) => patch("tradeable", e.target.checked)}
                  />
                  Boleh ditukar (Meet Match)
                </label>
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-4 p-5">
            <Section title="Foto" subtitle="Foto pertama jadi cover. Maks 8." />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {state.images.map((src, i) => (
                <div key={src + i} className="group relative aspect-square overflow-hidden rounded-lg border border-rule bg-panel-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      Cover
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-end justify-end gap-1 bg-gradient-to-t from-black/60 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() => makeCover(i)}
                        className="rounded bg-white/90 px-2 py-1 text-[10px] font-semibold text-ink-900 hover:bg-white"
                      >
                        Set cover
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="rounded bg-flame-500/90 px-2 py-1 text-[10px] font-semibold text-white hover:bg-flame-500"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
              {state.images.length < 8 && (
                <label
                  className={
                    "flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-fg-subtle transition-colors hover:border-brand-400/60 hover:text-brand-500 " +
                    (uploading ? "border-brand-400 bg-brand-400/10" : "border-rule-strong bg-panel-2/50")
                  }
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => { void pickImages(e.target.files); e.currentTarget.value = ""; }}
                  />
                  <span className="text-2xl">+</span>
                  <span className="text-[11px] font-medium">{uploading ? "Mengupload…" : "Tambah foto"}</span>
                </label>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex flex-col gap-4 p-5">
            <Section title="Status" />
            <Field label="Moderation">
              <select
                value={state.moderation}
                onChange={(e) => patch("moderation", e.target.value as AdminListingDetail["moderation"])}
                className="h-10 rounded-lg border border-rule bg-panel px-3 text-sm text-fg"
              >
                {MOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Published">
              <label className="flex h-10 items-center gap-2 rounded-lg border border-rule bg-panel px-3 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={state.isPublished}
                  onChange={(e) => patch("isPublished", e.target.checked)}
                />
                Terbit di marketplace
              </label>
            </Field>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 p-5">
            <Section title="Kepemilikan" subtitle="Owner saat ini & opsi pindah ke seller lain." />
            <div className="rounded-lg border border-rule bg-panel/40 p-3 text-xs">
              <p className="font-mono uppercase tracking-widest text-fg-subtle">Seller saat ini</p>
              <p className="mt-1 font-semibold text-fg">{initial.seller.name ?? `@${initial.seller.username}`}</p>
              <p className="font-mono text-fg-muted">@{initial.seller.username} · {initial.seller.email}</p>
            </div>
            <Field label="Pindahkan ke seller (id / username / email)">
              <div className="relative">
                <Input
                  value={state.sellerRef}
                  onChange={(e) => patch("sellerRef", e.target.value)}
                  onFocus={() => setSellerOpen(true)}
                  // Delay close so a click on a suggestion still
                  // registers before the input loses focus.
                  onBlur={() => setTimeout(() => setSellerOpen(false), 120)}
                  placeholder="@username atau email@..."
                />
                {sellerOpen
                  && state.sellerRef.trim().replace(/^@+/, "").length >= 3
                  && (sellerLoading || sellerHits.length > 0) && (
                  <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-rule bg-canvas shadow-lg">
                    {sellerLoading && sellerHits.length === 0 && (
                      <li className="px-3 py-2 text-xs text-fg-subtle">Mencari…</li>
                    )}
                    {sellerHits.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            patch("sellerRef", u.username);
                            setSellerOpen(false);
                          }}
                          className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs transition-colors hover:bg-panel"
                        >
                          <span className="font-semibold text-fg">
                            {u.name?.trim() || u.username}
                          </span>
                          <span className="font-mono text-[11px] text-fg-muted">
                            @{u.username} · {u.email}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {fieldErrs.sellerRef && (
                <p className="mt-1 text-[11px] text-flame-600">{fieldErrs.sellerRef}</p>
              )}
            </Field>
            <p className="text-[11px] text-fg-subtle">
              Kosongin kalau tidak ingin pindah owner. Order historis tetap merujuk ke buyer/seller saat
              transaksi terjadi — perubahan ini hanya menggeser kepemilikan listing aktif.
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-2">
          {err && (
            <div className="rounded-lg border border-flame-400/40 bg-flame-400/10 p-3 text-sm text-flame-600">
              {Object.keys(fieldErrs).length > 0 ? (
                <>
                  <p className="font-semibold">Tidak bisa simpan — perbaiki dulu:</p>
                  <ul className="mt-1 list-disc pl-5 text-xs">
                    {Object.entries(fieldErrs).map(([path, msg]) => (
                      <li key={path}>
                        <span className="font-semibold">{FIELD_LABEL[path] ?? path}:</span>{" "}
                        {msg}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>{err}</p>
              )}
            </div>
          )}
          {ok  && <p className="text-sm text-emerald-500">Tersimpan.</p>}
          <div className="flex gap-2">
            <Link
              href="/admin-panel/listing"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-rule bg-panel px-4 text-sm font-semibold text-fg-muted hover:border-brand-400/60 hover:text-fg"
            >
              Batal
            </Link>
            <Button variant="primary" size="md" onClick={save} disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan perubahan"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-rule pb-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">{title}</p>
      {subtitle && <p className="mt-0.5 text-[11px] text-fg-subtle">{subtitle}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
