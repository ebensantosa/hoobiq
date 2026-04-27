"use client";
import * as React from "react";

/**
 * Image upload widget — drag/drop or click. Stores File objects locally and
 * generates blob URLs for preview. Real R2 upload lands when storage signing
 * endpoint is wired; for now we accept the file and emit `dataUrl` strings to
 * the parent so the form can submit something convincing.
 *
 * The first slot is always the cover.
 */
export function ImageUpload({
  value,
  onChange,
  max = 8,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  const [dragOver, setDragOver] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = React.useCallback(
    async (files: FileList | File[]) => {
      const slots = max - value.length;
      if (slots <= 0) return;
      const arr = Array.from(files).slice(0, slots).filter((f) => f.type.startsWith("image/"));
      if (arr.length === 0) return;

      setUploading(true);
      try {
        // Read each as data URL — instant local preview, no server roundtrip.
        const datas = await Promise.all(arr.map((f) => readAsDataUrl(f)));
        onChange([...value, ...datas]);
      } finally {
        setUploading(false);
      }
    },
    [value, onChange, max]
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
        Foto pertama jadi cover. JPG/PNG, maks 2MB per foto. Background netral, cahaya cukup, tunjukkan detail kondisi.
      </p>
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

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
