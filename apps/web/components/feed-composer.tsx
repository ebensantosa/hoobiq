"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { uploadImages } from "@/lib/api/uploads";
import { useToast } from "./toast-provider";

const MAX_IMAGES = 8;
const MAX_CAPTION = 2000;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Single-card composer. The whole inner card IS a `<label>` that targets a
 * native `<input type="file">` — clicking anywhere on the dropzone (or the
 * "Tambah foto" tile) opens the picker without any JS .click() trickery,
 * which has been the root cause of inconsistent behaviour across browsers.
 *
 * Two visible states stay in the same component tree to avoid re-mounting
 * the file input (which would otherwise reset associated label refs):
 *   - Empty: the label fills the card with a dashed dropzone.
 *   - With photos: cover preview + thumbnail strip + caption textarea +
 *     Post button. The "Tambah foto" thumbnail is also a label pointing
 *     at the same input.
 */
export function FeedComposer({
  me,
}: {
  me: { username: string; name: string | null; avatarUrl?: string | null };
}) {
  const router = useRouter();
  const toast = useToast();
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [coverIdx, setCoverIdx] = React.useState(0);
  const [caption, setCaption] = React.useState("");
  const [pending, start] = React.useTransition();
  const [dragOver, setDragOver] = React.useState(false);
  const inputId = React.useId();

  function reset() {
    setPreviews([]);
    setCoverIdx(0);
    setCaption("");
  }

  async function ingest(files: FileList | null) {
    if (!files || files.length === 0) return;
    const slots = MAX_IMAGES - previews.length;
    if (slots <= 0) {
      toast.error("Slot foto penuh", `Maks ${MAX_IMAGES} foto per post.`);
      return;
    }
    const arr = Array.from(files).slice(0, slots);
    const tooLarge: string[] = [];
    const wrongType: string[] = [];
    const ok: File[] = [];
    for (const f of arr) {
      if (!ACCEPTED.includes(f.type)) wrongType.push(f.name);
      else if (f.size > MAX_BYTES) tooLarge.push(f.name);
      else ok.push(f);
    }
    if (tooLarge.length) {
      toast.error(`${tooLarge.length} foto ditolak`, "Ukuran maksimum 5 MB per foto.");
    }
    if (wrongType.length) {
      toast.error(`${wrongType.length} foto format tidak didukung`, "Gunakan PNG, JPG, atau WebP.");
    }
    if (!ok.length) return;
    try {
      const dataUrls = await Promise.all(ok.map(readDataUrl));
      setPreviews((prev) => [...prev, ...dataUrls]);
    } catch {
      toast.error("Gagal baca file", "Coba pilih ulang fotonya.");
    }
  }

  function removeAt(idx: number) {
    setPreviews((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) {
        setCoverIdx(0);
      } else if (idx === coverIdx) {
        setCoverIdx(0);
      } else if (idx < coverIdx) {
        setCoverIdx((c) => Math.max(0, c - 1));
      }
      return next;
    });
  }

  function submit() {
    if (previews.length === 0) {
      toast.error("Belum ada foto", "Pilih minimal 1 foto dulu.");
      return;
    }
    start(async () => {
      try {
        const ordered = [previews[coverIdx]!, ...previews.filter((_, i) => i !== coverIdx)];
        const finalUrls = await uploadImages(ordered);
        await api<{ id: string }>("/posts", {
          method: "POST",
          body: { body: caption.trim(), images: finalUrls },
        });
        reset();
        toast.success("Post terkirim", "Foto kamu sudah masuk feed.");
        router.refresh();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal kirim post.";
        toast.error("Gagal kirim post", msg);
      }
    });
  }

  const isEmpty = previews.length === 0;
  const cover = previews[coverIdx] ?? previews[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-rule bg-panel">
      {/* Header — avatar + intro line. Always visible so the composer
          reads as "you are about to post" even before files are picked. */}
      <header className="flex items-center gap-3 border-b border-rule px-4 py-3">
        <Avatar
          letter={me.username[0]?.toUpperCase() ?? "U"}
          size="sm"
          src={me.avatarUrl ?? null}
          alt="Avatar"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{me.name ?? `@${me.username}`}</p>
          <p className="truncate text-[11px] text-fg-subtle">Pamerin koleksi kamu — foto + caption opsional.</p>
        </div>
        {!isEmpty && (
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="rounded-full px-2 py-1 text-xs text-fg-subtle hover:bg-panel-2 hover:text-fg disabled:opacity-50"
          >
            Reset
          </button>
        )}
      </header>

      {isEmpty ? (
        // Whole label is the picker — no JS click; native file dialog
        // opens on click/tap and on keyboard space/enter.
        <label
          htmlFor={inputId}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void ingest(e.dataTransfer.files);
          }}
          className={
            "flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-12 transition-colors " +
            (dragOver
              ? "bg-brand-400/10"
              : "bg-panel-2/30 hover:bg-panel-2/60")
          }
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-400/15 text-brand-500">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>
            </svg>
          </span>
          <div className="text-center">
            <p className="text-sm font-semibold text-fg">Pilih foto atau tarik ke sini</p>
            <p className="mt-1 text-[11px] text-fg-subtle">PNG · JPG · WebP · maks 5 MB · sampai 8 foto</p>
          </div>
        </label>
      ) : (
        <div className="flex flex-col">
          <div className="relative aspect-square w-full bg-canvas">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt="Preview"
              className="absolute inset-0 h-full w-full object-contain"
            />
            <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
              {coverIdx + 1} / {previews.length}
            </span>
          </div>

          <div className="border-t border-rule px-4 py-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {previews.map((src, i) => (
                <div key={i} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setCoverIdx(i)}
                    aria-label={`Pakai foto ${i + 1} sebagai cover`}
                    className={
                      "relative h-16 w-16 overflow-hidden rounded-md transition-all " +
                      (i === coverIdx
                        ? "ring-2 ring-brand-400 ring-offset-2 ring-offset-panel"
                        : "border border-rule opacity-70 hover:opacity-100")
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    aria-label="Hapus foto"
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-fg text-canvas shadow-md transition-colors hover:bg-flame-500 hover:text-white"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
              {previews.length < MAX_IMAGES && (
                <label
                  htmlFor={inputId}
                  aria-label="Tambah foto"
                  className="flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-rule text-fg-subtle transition-colors hover:border-brand-400/60 hover:text-brand-500"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  <span className="text-[9px] font-medium">Tambah</span>
                </label>
              )}
            </div>
          </div>

          <div className="border-t border-rule px-4 py-3">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={MAX_CAPTION}
              rows={3}
              placeholder="Tulis caption (opsional)…"
              className="w-full resize-none border-0 bg-transparent text-sm leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-0"
            />
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
                {caption.length} / {MAX_CAPTION}
              </span>
              <Button type="button" variant="primary" size="sm" onClick={submit} disabled={pending}>
                {pending ? "Mengirim…" : "Post"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* The actual file input lives at component root, attached by id to
          every label above. Always rendered so its DOM identity is stable. */}
      <input
        id={inputId}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const files = e.target.files;
          // Clear so the same file can be re-selected after a remove.
          e.target.value = "";
          void ingest(files);
        }}
      />

      {pending && (
        <div
          role="status"
          aria-live="assertive"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-canvas/85 backdrop-blur-sm"
        >
          <span aria-hidden className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm font-semibold text-fg">Mengunggah…</p>
        </div>
      )}
    </div>
  );
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
