"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { uploadImages } from "@/lib/api/uploads";
import { useToast } from "./toast-provider";

const MAX_IMAGES = 8;
const MAX_CAPTION = 2000;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * IG-style composer. Photo is the post; caption is optional.
 *
 * Two states:
 *   - Empty: dominant drop-zone card prompting the user to pick photos.
 *     Whole card is clickable + drag-and-droppable.
 *   - With photos: square cover preview (first image), thumbnail strip
 *     of the rest, then a caption textarea + Post button. Cover swaps
 *     when the user clicks any thumbnail. Each thumbnail has an
 *     individual remove (×).
 *
 * Previews use data: URLs from FileReader so they appear instantly —
 * no upload round-trip needed before the user sees what they picked.
 * Upload happens at submit time when we POST /posts.
 */
export function FeedComposer({
  me,
}: {
  me: { username: string; name: string | null; avatarUrl?: string | null };
}) {
  const router = useRouter();
  const toast = useToast();
  const [images, setImages] = React.useState<string[]>([]);
  const [coverIdx, setCoverIdx] = React.useState(0);
  const [caption, setCaption] = React.useState("");
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setImages([]);
    setCoverIdx(0);
    setCaption("");
    setErr(null);
  }

  async function ingestFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const slots = MAX_IMAGES - images.length;
    if (slots <= 0) {
      toast.error("Keranjang foto penuh", `Maksimum ${MAX_IMAGES} foto per post.`);
      return;
    }
    const arr = Array.from(files).slice(0, slots);
    const tooLarge: string[] = [];
    const wrongType: string[] = [];
    const ok: File[] = [];
    for (const f of arr) {
      if (!ACCEPTED_IMAGE_TYPES.includes(f.type))      wrongType.push(f.name);
      else if (f.size > MAX_IMAGE_BYTES)               tooLarge.push(f.name);
      else                                             ok.push(f);
    }
    // Surface every reject reason as a separate toast so the user can see
    // exactly which file was the problem rather than a generic "format
    // salah" that hides multiple issues.
    if (tooLarge.length > 0) {
      toast.error(
        tooLarge.length === 1 ? `${tooLarge[0]} terlalu besar` : `${tooLarge.length} foto terlalu besar`,
        `Ukuran maksimum 2 MB per foto. Compress dulu atau pilih foto lain.`,
      );
    }
    if (wrongType.length > 0) {
      toast.error(
        wrongType.length === 1 ? `${wrongType[0]} format tidak didukung` : `${wrongType.length} foto format tidak didukung`,
        "Format yang didukung: PNG, JPG, WebP.",
      );
    }
    if (ok.length === 0) return;
    try {
      const data = await Promise.all(ok.map(readAsDataUrl));
      setImages((prev) => [...prev, ...data]);
      setErr(null);
    } catch {
      toast.error("Gagal membaca file", "Coba pilih ulang fotonya.");
    }
  }

  function pickFiles() { fileRef.current?.click(); }

  function removeAt(idx: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // Keep cover pointing at a valid index after removal.
      if (idx === coverIdx) setCoverIdx(0);
      else if (idx < coverIdx) setCoverIdx((c) => Math.max(0, c - 1));
      return next;
    });
  }

  function submit() {
    if (images.length === 0) {
      toast.error("Belum ada foto", "Pilih minimal 1 foto dulu.");
      return;
    }
    setErr(null);
    start(async () => {
      try {
        // Reorder so cover (the one user picked) is first — that's the
        // image the feed-card surfaces on the timeline.
        const ordered = [images[coverIdx]!, ...images.filter((_, i) => i !== coverIdx)];
        const finalUrls = await uploadImages(ordered);
        await api<{ id: string }>("/posts", {
          method: "POST",
          body: { body: caption.trim(), images: finalUrls },
        });
        reset();
        toast.success("Post terkirim", caption.trim() ? undefined : "Foto berhasil di-share.");
        router.refresh();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal kirim post.";
        toast.error("Gagal kirim post", msg);
      }
    });
  }

  // Empty state — invite the user to pick photos. Whole card is the
  // click target; drag-and-drop also works for desktop.
  if (images.length === 0) {
    return (
      <div className="rounded-2xl border border-rule bg-panel">
        <div className="flex items-center gap-3 px-4 pt-4">
          <Avatar
            letter={me.username[0]?.toUpperCase() ?? "U"}
            size="md"
            src={me.avatarUrl ?? null}
            alt="Avatar"
          />
          <p className="text-sm font-semibold text-fg">
            Pamerin koleksi kamu, {me.name ?? `@${me.username}`}
          </p>
        </div>

        <button
          type="button"
          onClick={pickFiles}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void ingestFiles(e.dataTransfer.files);
          }}
          className={
            "mx-4 mt-3 mb-4 flex w-[calc(100%-2rem)] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-12 transition-colors " +
            (dragOver
              ? "border-brand-400 bg-brand-400/5"
              : "border-rule bg-panel-2/40 hover:border-brand-400/60 hover:bg-panel-2")
          }
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-400/15 text-brand-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>
            </svg>
          </span>
          <p className="text-sm font-semibold text-fg">Pilih foto untuk di-post</p>
          <p className="text-xs text-fg-subtle">PNG, JPG, atau WebP · maks 2MB · sampai 8 foto</p>
        </button>

        {err && (
          <p role="alert" className="mx-4 mb-4 rounded-md border border-flame-400/40 bg-flame-400/10 px-3 py-2 text-xs text-flame-600">
            {err}
          </p>
        )}

        <HiddenFileInput inputRef={fileRef} onPick={ingestFiles} />
      </div>
    );
  }

  // With-photos state — IG-style cover + thumb strip + caption.
  const cover = images[coverIdx] ?? images[0]!;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-rule bg-panel">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar
            letter={me.username[0]?.toUpperCase() ?? "U"}
            size="sm"
            src={me.avatarUrl ?? null}
            alt="Avatar"
          />
          <p className="text-sm font-semibold text-fg">{me.name ?? `@${me.username}`}</p>
        </div>
        <button
          type="button"
          onClick={reset}
          aria-label="Batal"
          disabled={pending}
          className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-panel-2 hover:text-fg disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </header>

      <div className="relative aspect-square w-full bg-canvas">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt="Preview"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
          {coverIdx + 1} / {images.length}
        </span>
      </div>

      <div className="border-t border-rule px-4 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
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
          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={pickFiles}
              aria-label="Tambah foto"
              className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-rule text-fg-subtle transition-colors hover:border-brand-400/60 hover:text-brand-500"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span className="text-[9px] font-medium">Tambah</span>
            </button>
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
        <div className="mt-1 flex items-center justify-between">
          <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
            {caption.length} / {MAX_CAPTION}
          </span>
        </div>
      </div>

      {err && (
        <p role="alert" className="mx-4 mb-3 rounded-md border border-flame-400/40 bg-flame-400/10 px-3 py-2 text-xs text-flame-600">
          {err}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-rule px-4 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={pending}>
          Batal
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={submit} disabled={pending}>
          {pending ? "Mengirim…" : "Post"}
        </Button>
      </div>

      <HiddenFileInput inputRef={fileRef} onPick={ingestFiles} />
      {pending && <UploadOverlay imageCount={images.length} />}
    </div>
  );
}

/**
 * Block-the-world overlay while uploads + post create are in flight.
 * The composer itself stays mounted (and the underlying state intact)
 * so a network error can re-enable interaction without losing the user's
 * draft. We don't show this for the empty state since there's nothing
 * to upload there.
 */
function UploadOverlay({ imageCount }: { imageCount: number }) {
  return (
    <div
      role="status"
      aria-live="assertive"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-canvas/85 backdrop-blur-sm"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-400/15">
        <span
          aria-hidden
          className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
        />
      </span>
      <p className="text-sm font-semibold text-fg">
        {imageCount > 1 ? `Mengunggah ${imageCount} foto…` : "Mengunggah foto…"}
      </p>
      <p className="text-xs text-fg-muted">Jangan tutup tab dulu ya.</p>
    </div>
  );
}

/**
 * Stable hidden file input — proper component (not a function call from
 * JSX), so React's reconciler treats it consistently across re-renders
 * and the ref is reliably attached. The previous `hiddenInput(ref, ...)`
 * call pattern intermittently lost the ref binding, leaving "Pilih foto"
 * inert on some interaction paths.
 */
function HiddenFileInput({
  inputRef,
  onPick,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (f: FileList | null) => void | Promise<void>;
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_IMAGE_TYPES.join(",")}
      multiple
      // `hidden` works in modern browsers but inputs are sometimes
      // styled with display:none which blocks programmatic clicks in
      // older WebKit. Use a safe absolute-positioned offscreen style
      // so .click() always works.
      className="sr-only"
      tabIndex={-1}
      onChange={(e) => {
        const f = e.target.files;
        // Clear so the same file can be selected again after a remove.
        e.target.value = "";
        void onPick(f);
      }}
    />
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
