"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { uploadImages } from "@/lib/api/uploads";

const MAX_IMAGES = 8;
const MAX_BODY = 2000;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Simple, always-expanded composer at the top of /feeds. The previous
 * collapsed/expanded toggle hid the textarea behind a fake search-style
 * pill, which made the UI feel two-step and ate vertical space when the
 * user just wanted to type. This version is one card: avatar + textarea
 * + preview strip + a single action row.
 *
 * Image previews render the moment a file is picked (data: URL), so the
 * user always sees what they're about to attach without waiting for an
 * upload round-trip. Each preview has an inline remove button. The first
 * image gets a "Cover" tag so the user knows which one shows on the
 * feed card.
 */
export function FeedComposer({ me }: { me: { username: string; name: string | null; avatarUrl?: string | null } }) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [images, setImages] = React.useState<string[]>([]);
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function reset() { setBody(""); setImages([]); setErr(null); }

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const slots = MAX_IMAGES - images.length;
    if (slots <= 0) {
      setErr(`Maksimum ${MAX_IMAGES} foto.`);
      return;
    }
    const arr = Array.from(files).slice(0, slots);
    const ok: File[] = [];
    for (const f of arr) {
      if (!ACCEPTED_IMAGE_TYPES.includes(f.type)) { setErr("Format harus PNG, JPG, atau WebP."); continue; }
      if (f.size > MAX_IMAGE_BYTES)              { setErr("Ukuran maksimum 2MB per foto."); continue; }
      ok.push(f);
    }
    if (ok.length === 0) return;
    const data = await Promise.all(ok.map(readAsDataUrl));
    setImages((prev) => [...prev, ...data]);
    setErr(null);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function submit() {
    const trimmed = body.trim();
    if (trimmed.length < 2 && images.length === 0) {
      setErr("Tulis minimal 2 karakter atau lampirkan foto.");
      return;
    }
    setErr(null);
    start(async () => {
      try {
        // Upload data: URLs to storage; pass through any already-hosted URLs.
        const uploadable = images.filter((s) => s.startsWith("data:") || /^https?:\/\//.test(s));
        const finalUrls = await uploadImages(uploadable);
        await api<{ id: string }>("/posts", {
          method: "POST",
          body: {
            // API requires body min 2; if user only attached photos, pad
            // with two spaces so server-side validation passes without
            // showing visible text on the rendered card.
            body: trimmed.length >= 2 ? trimmed : "  ",
            images: finalUrls,
          },
        });
        reset();
        router.refresh();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal kirim post.";
        setErr(msg);
      }
    });
  }

  const canPost = !pending && (body.trim().length >= 2 || images.length > 0);

  return (
    <div className="rounded-2xl border border-rule bg-panel">
      <div className="flex gap-3 p-4">
        <Avatar
          letter={me.username[0]?.toUpperCase() ?? "U"}
          size="md"
          src={me.avatarUrl ?? null}
          alt="Avatar"
        />

        <div className="min-w-0 flex-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX_BODY}
            rows={Math.min(6, Math.max(2, body.split("\n").length + 1))}
            placeholder={`Apa yang lagi kamu koleksi, ${me.name ?? me.username}?`}
            className="w-full resize-none border-0 bg-transparent text-[15px] leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-0"
          />

          {images.length > 0 && (
            <PreviewStrip images={images} onRemove={removeImage} />
          )}

          {err && (
            <p role="alert" className="mt-3 rounded-md border border-flame-400/40 bg-flame-400/10 px-3 py-2 text-xs text-flame-600">
              {err}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={images.length >= MAX_IMAGES}
                aria-label="Tambah foto"
                title={images.length >= MAX_IMAGES ? `Maksimum ${MAX_IMAGES} foto` : "Tambah foto"}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>
                </svg>
                Foto
                {images.length > 0 && (
                  <span className="rounded-sm bg-emerald-500/15 px-1 font-mono text-[10px] tabular-nums">
                    {images.length}/{MAX_IMAGES}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {body.length > 0 && (
                <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
                  {body.length}/{MAX_BODY}
                </span>
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={submit}
                disabled={!canPost}
              >
                {pending ? "Mengirim…" : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        hidden
        onChange={(e) => { const f = e.target.files; e.target.value = ""; void onFiles(f); }}
      />
    </div>
  );
}

/**
 * Always-visible preview strip. Horizontal scroll on overflow rather
 * than fancy mosaic layouts — simpler to scan, easier to add/remove,
 * and the actual feed card handles the prettier multi-image layout
 * after the post is published.
 */
function PreviewStrip({ images, onRemove }: { images: string[]; onRemove: (i: number) => void }) {
  return (
    <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto pb-1">
      {images.map((src, i) => (
        <div
          key={i}
          className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-rule bg-panel-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`Foto ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />
          {i === 0 && (
            <span className="absolute left-1 top-1 rounded-sm bg-brand-500 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
              Cover
            </span>
          )}
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label="Hapus foto"
            className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/65 text-white backdrop-blur transition-colors hover:bg-black/85"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
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
