"use client";
import * as React from "react";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB hard cap, matched to upload server limit

/**
 * Image upload widget — drag/drop or click. Stores File objects locally and
 * generates blob URLs for preview. Real R2 upload lands when storage signing
 * endpoint is wired; for now we accept the file and emit `dataUrl` strings to
 * the parent so the form can submit something convincing.
 *
 * Pre-validates size + MIME on the client BEFORE the file even hits state —
 * rejected files surface as an inline error (via `onError`) instead of a JS
 * alert or a server bounce-back. Files > 2MB never get base64-encoded so we
 * don't waste memory either.
 *
 * The first slot is always the cover.
 */
export function ImageUpload({
  value,
  onChange,
  max = 8,
  onError,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  onError?: (msg: string | null) => void;
}) {
  const [dragOver, setDragOver] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [localErr, setLocalErr] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const setErr = React.useCallback((msg: string | null) => {
    setLocalErr(msg);
    onError?.(msg);
  }, [onError]);

  const handleFiles = React.useCallback(
    async (files: FileList | File[]) => {
      const slots = max - value.length;
      if (slots <= 0) {
        setErr(`Maksimum ${max} foto.`);
        return;
      }
      const incoming = Array.from(files);

      // Pre-validate every file against MIME + 2MB BEFORE encoding. Anything
      // that fails is reported with a precise message that names the file.
      const bad: string[] = [];
      const accepted: File[] = [];
      for (const f of incoming) {
        if (!f.type.startsWith("image/")) {
          bad.push(`"${f.name}" bukan gambar.`);
          continue;
        }
        if (f.size > MAX_BYTES) {
          const mb = (f.size / 1024 / 1024).toFixed(1);
          bad.push(`"${f.name}" ${mb}MB — maks 2MB.`);
          continue;
        }
        accepted.push(f);
      }

      const useable = accepted.slice(0, slots);
      if (accepted.length > slots) {
        bad.push(`${accepted.length - slots} foto tidak dipakai (slot penuh).`);
      }
      if (bad.length > 0) setErr(bad.join(" ")); else setErr(null);
      if (useable.length === 0) return;

      setUploading(true);
      try {
        // Compress in the browser BEFORE encoding to data URL — same bytes
        // are about to be base64'd and POSTed, so saving 1.5MB per photo
        // here saves 2MB on the wire.
        const compressed = await Promise.all(useable.map(compressImage));
        const datas = await Promise.all(compressed.map((f) => readAsDataUrl(f)));
        onChange([...value, ...datas]);
      } finally {
        setUploading(false);
      }
    },
    [value, onChange, max, setErr]
  );

  function onDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function makeCover(idx: number) {
    if (idx === 0) return;
    const next = [...value];
    const [picked] = next.splice(idx, 1);
    next.unshift(picked!);
    onChange(next);
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {value.map((src, i) => (
          <ImageSlot key={src.slice(0, 40) + i} src={src} isCover={i === 0} onRemove={() => remove(i)} onMakeCover={() => makeCover(i)} />
        ))}

        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={
              "group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-fg-subtle transition-all duration-200 " +
              (dragOver
                ? "border-brand-400 bg-brand-400/10 scale-[1.02]"
                : "border-rule-strong bg-panel-2/50 hover:border-brand-400/60 hover:bg-brand-400/5")
            }
            aria-label="Tambah foto"
          >
            {uploading ? (
              <Spinner />
            ) : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:scale-110">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>
                </svg>
                <span className="text-xs font-medium">
                  {value.length === 0 ? "Drop / klik untuk upload" : "Tambah foto"}
                </span>
                <span className="text-[10px]">{value.length}/{max}</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      <p className="mt-3 text-xs text-fg-subtle">
        Minimal 3 foto, maksimal 8. Foto pertama jadi cover. JPG/PNG ≤ 2&nbsp;MB per foto. Background netral, cahaya cukup, tunjukkan detail kondisi.
      </p>
      {localErr && (
        <p role="alert" className="mt-2 rounded-lg border border-flame-400/40 bg-flame-400/10 px-3 py-2 text-xs text-flame-600">
          {localErr}
        </p>
      )}
    </div>
  );
}

function ImageSlot({
  src, isCover, onRemove, onMakeCover,
}: { src: string; isCover: boolean; onRemove: () => void; onMakeCover: () => void }) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-2xl border border-rule bg-panel-2 animate-fade-in">
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {isCover && (
        <span className="absolute left-2 top-2 rounded-md bg-brand-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
          Cover
        </span>
      )}
      <div className="absolute inset-0 flex items-end justify-end gap-1 bg-gradient-to-t from-black/60 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
        {!isCover && (
          <button
            type="button"
            onClick={onMakeCover}
            className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-ink-900 hover:bg-white"
          >
            Set cover
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Hapus foto"
          className="rounded-md bg-flame-500/90 p-1 text-white hover:bg-flame-500"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" className="animate-spin text-brand-400">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeLinecap="round" opacity="0.25"/>
      <path fill="currentColor" d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3z"/>
    </svg>
  );
}

/**
 * Downscale + JPEG re-encode in the browser before we ever touch the network.
 * For most product photos this drops a 2MB camera snap to ~300–500KB with
 * no visible quality loss in a marketplace card — that's a 4–6× cut on
 * upload bytes (and the server's base64 decode work).
 *
 * Pipeline:
 *   File → Image element → canvas (max 1600px long edge) → toBlob(jpeg, 0.82) → File
 *
 * If anything goes wrong (browser without canvas.toBlob, decode failure)
 * we fall through to the original file — slow path still works.
 */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

async function compressImage(file: File): Promise<File> {
  // Already small enough — skip the round trip through canvas. Anything
  // under ~600KB usually re-encodes BIGGER than the original.
  if (file.size < 600 * 1024) return file;

  try {
    const dataUrl = await readAsDataUrl(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = dataUrl;
    });

    const { width: w0, height: h0 } = img;
    const scale = Math.min(1, MAX_EDGE / Math.max(w0, h0));
    const w = Math.round(w0 * scale);
    const h = Math.round(h0 * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;  // re-encode made it bigger? keep original

    // Replace extension with .jpg for clarity at the storage layer.
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
