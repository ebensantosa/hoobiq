"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { uploadImage } from "@/lib/api/uploads";
import { Spinner } from "@/components/spinner";
import { useToast } from "@/components/toast-provider";

export type BannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  kicker: string | null;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

const empty: Omit<BannerRow, "id" | "createdAt" | "updatedAt"> = {
  title: "",
  subtitle: "",
  kicker: "HOT COLLECTION",
  ctaLabel: "Jelajahi Sekarang",
  ctaHref: "/marketplace",
  imageUrl: "",
  sortOrder: 0,
  active: true,
};

/**
 * Admin CMS for the home hero slider. List view + inline create
 * form. Each row in the list expands to an edit form. Image upload
 * goes through the existing /uploads/image endpoint (kind="branding")
 * so banner images live in the same R2 bucket as other admin
 * graphics, not the listing-photos bucket.
 */
export function BannersManager({ initial }: { initial: BannerRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = React.useState(initial);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => { setItems(initial); }, [initial]);

  return (
    <div className="mt-6 flex flex-col gap-4">
      {creating ? (
        <BannerForm
          initial={empty}
          onCancel={() => setCreating(false)}
          onSaved={(row) => {
            setItems((prev) => [...prev, row].sort((a, b) => a.sortOrder - b.sortOrder));
            setCreating(false);
            router.refresh();
            toast.success("Banner ditambahkan");
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-rule text-sm font-semibold text-fg-muted hover:border-brand-400/60 hover:text-brand-500"
        >
          <span aria-hidden>+</span> Tambah banner baru
        </button>
      )}

      {items.length === 0 ? (
        <p className="rounded-lg border border-rule bg-panel/40 p-10 text-center text-sm text-fg-muted">
          Belum ada banner. Klik <b>Tambah banner baru</b> di atas — banner akan
          langsung muncul di home setelah disimpan (kalau status aktif).
        </p>
      ) : (
        items.map((row) => (
          <Row
            key={row.id}
            row={row}
            onSaved={(updated) => {
              setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)).sort((a, b) => a.sortOrder - b.sortOrder));
              router.refresh();
              toast.success("Banner diperbarui");
            }}
            onDeleted={(id) => {
              setItems((prev) => prev.filter((r) => r.id !== id));
              router.refresh();
              toast.success("Banner dihapus");
            }}
          />
        ))
      )}
    </div>
  );
}

function Row({
  row,
  onSaved,
  onDeleted,
}: {
  row: BannerRow;
  onSaved: (r: BannerRow) => void;
  onDeleted: (id: string) => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = React.useState(false);
  const [pending, start] = React.useTransition();

  function toggleActive() {
    start(async () => {
      try {
        const updated = await api<BannerRow>(
          `/banners/admin/${row.id}`,
          { method: "PATCH", body: { active: !row.active } },
        );
        onSaved(updated);
      } catch (e) {
        toast.error("Gagal", e instanceof ApiError ? e.message : "Coba lagi.");
      }
    });
  }

  function remove() {
    if (!window.confirm(`Hapus banner "${row.title}"?`)) return;
    start(async () => {
      try {
        await api(`/banners/admin/${row.id}`, { method: "DELETE" });
        onDeleted(row.id);
      } catch (e) {
        toast.error("Gagal hapus", e instanceof ApiError ? e.message : "Coba lagi.");
      }
    });
  }

  if (editing) {
    return (
      <BannerForm
        initial={row}
        onCancel={() => setEditing(false)}
        onSaved={(updated) => {
          setEditing(false);
          onSaved(updated);
        }}
      />
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-4 p-4">
        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-md border border-rule bg-panel-2">
          {row.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-[10px] text-fg-subtle">
              No image
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
            <span className="font-mono uppercase tracking-widest">#{row.sortOrder}</span>
            {row.kicker && <span>· {row.kicker}</span>}
            <span
              className={
                "rounded-sm px-1.5 py-0.5 text-[10px] font-semibold " +
                (row.active
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-fg-subtle/15 text-fg-subtle")
              }
            >
              {row.active ? "AKTIF" : "OFF"}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-fg">{row.title}</p>
          {row.subtitle && (
            <p className="mt-0.5 truncate text-xs text-fg-muted">{row.subtitle}</p>
          )}
          <p className="mt-1 truncate font-mono text-[11px] text-fg-subtle">
            CTA → {row.ctaHref}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={pending}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={toggleActive} disabled={pending}>
            {row.active ? "Nonaktifkan" : "Aktifkan"}
          </Button>
          <Button size="sm" variant="ghost" onClick={remove} disabled={pending}>
            Hapus
          </Button>
        </div>
      </div>
    </Card>
  );
}

function BannerForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: Partial<BannerRow>;
  onCancel: () => void;
  onSaved: (r: BannerRow) => void;
}) {
  const isEdit = "id" in initial && !!initial.id;
  const [state, setState] = React.useState({
    title:    initial.title    ?? "",
    subtitle: initial.subtitle ?? "",
    kicker:   initial.kicker   ?? "HOT COLLECTION",
    ctaLabel: initial.ctaLabel ?? "Jelajahi Sekarang",
    ctaHref:  initial.ctaHref  ?? "/marketplace",
    imageUrl: initial.imageUrl ?? "",
    sortOrder: initial.sortOrder ?? 0,
    active:   initial.active ?? true,
  });
  const [pending, start] = React.useTransition();
  const [uploading, setUploading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  function patch<K extends keyof typeof state>(k: K, v: (typeof state)[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  async function pickImage(file: File | null) {
    if (!file) return;
    setUploading(true); setErr(null);
    try {
      const url = await uploadImage(file, "branding");
      patch("imageUrl", url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  }

  function save() {
    setErr(null);
    if (state.title.trim().length < 2) { setErr("Judul wajib diisi (min 2 karakter)."); return; }
    if (!state.imageUrl)                { setErr("Upload gambar dulu."); return; }
    start(async () => {
      try {
        const body = {
          title: state.title.trim(),
          subtitle: state.subtitle.trim() || null,
          kicker: state.kicker.trim() || null,
          ctaLabel: state.ctaLabel.trim() || "Jelajahi Sekarang",
          ctaHref:  state.ctaHref.trim()  || "/marketplace",
          imageUrl: state.imageUrl,
          sortOrder: Number(state.sortOrder) || 0,
          active: state.active,
        };
        const saved = isEdit
          ? await api<BannerRow>(`/banners/admin/${initial.id}`, { method: "PATCH", body })
          : await api<BannerRow>("/banners/admin", { method: "POST", body });
        onSaved(saved);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Gagal simpan.");
      }
    });
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 p-5">
        <h3 className="text-sm font-bold text-fg">
          {isEdit ? "Edit banner" : "Banner baru"}
        </h3>

        <Field label="Judul utama">
          <Input
            value={state.title}
            onChange={(e) => patch("title", e.target.value)}
            placeholder="Lengkapi Koleksimu Temukan Harta Karunmu"
            maxLength={120}
          />
        </Field>
        <Field label="Subtitle (opsional)">
          <Input
            value={state.subtitle}
            onChange={(e) => patch("subtitle", e.target.value)}
            placeholder="Dari kartu langka hingga figure eksklusif…"
            maxLength={240}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Kicker / chip atas (opsional)">
            <Input
              value={state.kicker}
              onChange={(e) => patch("kicker", e.target.value)}
              placeholder="HOT COLLECTION"
              maxLength={40}
            />
          </Field>
          <Field label="Sort order">
            <Input
              type="number"
              value={state.sortOrder}
              onChange={(e) => patch("sortOrder", Number(e.target.value))}
              min={0}
              max={9999}
            />
          </Field>
          <Field label="CTA label">
            <Input
              value={state.ctaLabel}
              onChange={(e) => patch("ctaLabel", e.target.value)}
              maxLength={40}
            />
          </Field>
          <Field label="CTA link (path)">
            <Input
              value={state.ctaHref}
              onChange={(e) => patch("ctaHref", e.target.value)}
              placeholder="/marketplace?sort=trending"
              maxLength={240}
            />
          </Field>
        </div>

        <Field label="Gambar hero">
          <div className="flex flex-wrap items-center gap-3">
            {state.imageUrl ? (
              <div className="relative h-24 w-40 overflow-hidden rounded-md border border-rule bg-panel-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={state.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </div>
            ) : (
              <div className="grid h-24 w-40 place-items-center rounded-md border border-dashed border-rule text-xs text-fg-subtle">
                Belum ada gambar
              </div>
            )}
            <label
              className={
                "inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-rule bg-panel px-4 text-sm font-semibold transition-colors " +
                (uploading ? "text-brand-500" : "text-fg-muted hover:border-brand-400/60 hover:text-fg")
              }
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { void pickImage(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }}
              />
              {uploading ? "Mengupload…" : "Upload gambar"}
            </label>
          </div>
        </Field>

        <Field label="Status">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.active}
              onChange={(e) => patch("active", e.target.checked)}
            />
            Tampilkan di home
          </label>
        </Field>

        {err && (
          <p role="alert" className="rounded-md border border-flame-400/40 bg-flame-400/10 p-2 text-xs text-flame-600">
            {err}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-rule pt-4">
          <Button variant="ghost" size="md" onClick={onCancel} disabled={pending}>
            Batal
          </Button>
          <Button variant="primary" size="md" onClick={save} disabled={pending || uploading}>
            {pending && <Spinner size={14} />}
            <span className={pending ? "ml-2" : ""}>
              {pending ? "Menyimpan…" : isEdit ? "Simpan perubahan" : "Buat banner"}
            </span>
          </Button>
        </div>
      </div>
    </Card>
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
