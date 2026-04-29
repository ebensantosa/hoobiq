"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button } from "@hoobiq/ui";
import { api } from "@/lib/api/client";
import { uploadImages } from "@/lib/api/uploads";
import { EmojiGifPicker, insertAtCaret } from "./emoji-gif-picker";

const MAX_IMAGES = 4;
const MAX_BODY = 2000;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Compact composer at the top of /feeds. Click the input to expand into a
 * full editor with image attach + char counter + emoji/GIF picker. Submit
 * posts via /posts then refresh the route to pick up the new entry.
 */
export function FeedComposer({ me }: { me: { username: string; name: string | null; avatarUrl?: string | null } }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [body, setBody] = React.useState("");
  const [images, setImages] = React.useState<string[]>([]);
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function reset() { setBody(""); setImages([]); setErr(null); setOpen(false); }

  function pickFiles() { fileRef.current?.click(); }

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const slots = MAX_IMAGES - images.length;
    if (slots <= 0) return;
    const arr = Array.from(files).slice(0, slots);
    const ok: File[] = [];
    for (const f of arr) {
      if (!ACCEPTED_IMAGE_TYPES.includes(f.type)) { setErr("Format harus PNG, JPG, WebP, atau GIF."); continue; }
      if (f.size > MAX_IMAGE_BYTES) { setErr("Ukuran maksimum 2MB per foto."); continue; }
      ok.push(f);
    }
    if (ok.length === 0) return;
    const data = await Promise.all(ok.map(readAsDataUrl));
    setImages((prev) => [...prev, ...data]);
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
        // Upload any data: URLs to storage; pass through any already-hosted URLs.
        const uploadable = images.filter((s) => s.startsWith("data:") || /^https?:\/\//.test(s));
        const finalUrls = await uploadImages(uploadable);
        await api<{ id: string }>("/posts", {
          method: "POST",
          body: {
            // API requires body min 2; if user only attached images, send two spaces
            // so server-side validation passes without showing visible text on the card.
            body: trimmed.length >= 2 ? trimmed : "  ",
            images: finalUrls,
          },
        });
        reset();
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal kirim post.");
      }
    });
  }

  // The hidden file input MUST be a stable sibling — if we duplicated it
  // inside the open/closed branches, clicking the Foto shortcut in closed
  // state would call `.click()` on the about-to-unmount input, and the
  // native change event from the file dialog would fire on a detached
  // element after React had already remounted the open view.
  const hiddenInput = (
    <input
      key="file-input"
      ref={fileRef}
      type="file"
      accept={ACCEPTED_IMAGE_TYPES.join(",")}
      multiple
      hidden
      onChange={(e) => { const f = e.target.files; e.target.value = ""; void onFiles(f); }}
    />
  );

  if (!open) {
    return (
      <>
      {hiddenInput}
      <div className="rounded-2xl border border-rule bg-panel">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Avatar letter={me.username[0] ?? "U"} size="sm" src={me.avatarUrl ?? null} alt={`Avatar @${me.username}`} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 truncate rounded-full bg-panel-2/60 px-4 py-2 text-left text-sm text-fg-subtle transition-colors hover:bg-panel-2 hover:text-fg"
          >
            Apa yang lagi kamu koleksi, {me.name ?? me.username}?
          </button>
          <div className="flex items-center gap-0.5 text-fg-subtle">
            <IconShortcut
              label="Foto"
              tone="emerald"
              onClick={() => { setOpen(true); pickFiles(); }}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>
              }
            />
            <IconShortcut
              label="Emoji"
              tone="amber"
              onClick={() => setOpen(true)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              }
            />
            <IconShortcut
              label="GIF"
              tone="violet"
              onClick={() => setOpen(true)}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><text x="12" y="15" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="currentColor" stroke="none">GIF</text></svg>
              }
            />
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    {hiddenInput}
    <div className="rounded-2xl border border-rule bg-panel shadow-sm">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-4">
        <Avatar letter={me.username[0] ?? "U"} size="md" src={me.avatarUrl ?? null} alt={`Avatar @${me.username}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{me.name ?? me.username}</p>
          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-panel-2 px-2 py-0.5 text-[10px] font-medium text-fg-muted">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/></svg>
            Publik
          </span>
        </div>
        <button
          type="button"
          onClick={reset}
          aria-label="Tutup"
          className="flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-panel-2 hover:text-fg"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </header>

      {/* Textarea — borderless, autogrow-ish via rows */}
      <textarea
        ref={taRef}
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MAX_BODY}
        rows={Math.min(8, Math.max(3, body.split("\n").length + 1))}
        placeholder="Pamer pull rate, share unboxing, atau mulai diskusi sub-seri…"
        className="w-full resize-none border-0 bg-transparent px-4 pt-3 text-[15px] leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-0"
      />

      {/* Image previews */}
      {images.length > 0 && (
        <div className="px-4 pb-1">
          <ImageGrid images={images} onRemove={removeImage} />
        </div>
      )}

      {/* Error */}
      {err && (
        <p role="alert" className="mx-4 mb-2 rounded-lg border border-flame-400/30 bg-flame-400/10 px-3 py-2 text-xs text-flame-600">
          {err}
        </p>
      )}

      {/* Toolbar */}
      <div className="m-3 flex items-center gap-1 rounded-xl border border-rule bg-panel-2/50 px-2 py-1.5">
        <span className="hidden flex-1 truncate pl-2 text-xs font-medium text-fg-muted sm:inline">
          Tambah ke postingan
        </span>
        <button
          type="button"
          onClick={pickFiles}
          disabled={images.length >= MAX_IMAGES}
          aria-label="Tambah foto"
          title={images.length >= MAX_IMAGES ? `Maksimum ${MAX_IMAGES} foto` : "Tambah foto"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-emerald-500 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>
        </button>
        <EmojiGifPicker
          size="sm"
          align="left"
          direction="up"
          onEmoji={(e) => insertAtCaret(taRef.current, e, body, setBody)}
          onGif={(url) => {
            if (images.length >= MAX_IMAGES) {
              setErr(`Maksimum ${MAX_IMAGES} foto/GIF.`);
              return;
            }
            setImages((prev) => [...prev, url]);
            setErr(null);
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-rule px-4 py-3">
        <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
          {body.length} / {MAX_BODY}
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={pending}>Batal</Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={submit}
            disabled={pending || (body.trim().length < 2 && images.length === 0)}
          >
            {pending ? "Mengirim…" : "Post"}
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}

function IconShortcut({
  onClick, icon, label, tone,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone: "emerald" | "amber" | "violet" | "sky";
}) {
  const toneClass = {
    emerald: "hover:bg-emerald-500/10 hover:text-emerald-500",
    amber:   "hover:bg-amber-500/10 hover:text-amber-500",
    violet:  "hover:bg-violet-500/10 hover:text-violet-500",
    sky:     "hover:bg-sky-500/10 hover:text-sky-500",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={"flex h-9 w-9 items-center justify-center rounded-full transition-colors " + toneClass}
    >
      {icon}
    </button>
  );
}

function ImageGrid({ images, onRemove }: { images: string[]; onRemove: (idx: number) => void }) {
  // Smart layout: 1 = full, 2 = side-by-side, 3 = 1 big + 2 small, 4 = 2x2
  const n = images.length;
  if (n === 1) {
    return (
      <div className="relative">
        <ImageTile src={images[0]!} onRemove={() => onRemove(0)} cover className="aspect-[16/10]" />
      </div>
    );
  }
  if (n === 2) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {images.map((src, i) => (
          <ImageTile key={i} src={src} onRemove={() => onRemove(i)} cover={i === 0} className="aspect-square" />
        ))}
      </div>
    );
  }
  if (n === 3) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <ImageTile src={images[0]!} onRemove={() => onRemove(0)} cover className="row-span-2 aspect-[3/4]" />
        <ImageTile src={images[1]!} onRemove={() => onRemove(1)} className="aspect-[4/3]" />
        <ImageTile src={images[2]!} onRemove={() => onRemove(2)} className="aspect-[4/3]" />
      </div>
    );
  }
  // 4
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {images.map((src, i) => (
        <ImageTile key={i} src={src} onRemove={() => onRemove(i)} cover={i === 0} className="aspect-square" />
      ))}
    </div>
  );
}

function ImageTile({
  src, onRemove, cover, className,
}: { src: string; onRemove: () => void; cover?: boolean; className?: string }) {
  return (
    <div className={"group relative overflow-hidden rounded-xl border border-rule bg-panel-2 " + (className ?? "")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {cover && (
        <span className="absolute left-2 top-2 rounded-md bg-brand-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
          Cover
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Hapus foto"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/80 group-hover:opacity-100"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
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
