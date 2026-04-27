"use client";
import * as React from "react";

/**
 * FB-style emoji + GIF popover. Click trigger renders a tabbed panel with a
 * curated emoji grid and a Tenor-backed GIF grid.
 *
 * GIF source: Tenor v2. Set NEXT_PUBLIC_TENOR_API_KEY in env to enable. The
 * tab shows a friendly setup hint when no key is configured so the rest of
 * the picker still works.
 */

const EMOJI_GROUPS: Array<{ label: string; chars: string[] }> = [
  {
    label: "Sering dipakai",
    chars: ["👍","❤️","😂","🔥","🥺","😍","😭","🙌","✨","🎉","💯","👀"],
  },
  {
    label: "Emosi",
    chars: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩"],
  },
  {
    label: "Tangan & badan",
    chars: ["👍","👎","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👋","🤚","🖐️","✋","🖖","👏","🙌","👐","🤲","🤝","🙏","✍️","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","👀","👁️","👅","👄","💋"],
  },
  {
    label: "Hati & simbol",
    chars: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️","💯","💢","💥","💫","💦","💨","🕳️","💣","💬","👁️‍🗨️","🗨️","🗯️","💭","💤"],
  },
  {
    label: "Hewan & alam",
    chars: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐽","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪰","🪲","🪳","🦟","🦗","🕷️","🕸️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐕‍🦺","🐈","🐈‍⬛","🪶","🐓","🦃","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿️","🦔"],
  },
  {
    label: "Makanan",
    chars: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🦴","🌭","🍔","🍟","🍕","🥪","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🥫","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥠","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🥛","🍼","🫖","☕","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾"],
  },
  {
    label: "Aktivitas",
    chars: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏂","🪂","🏋️","🤼","🤸","⛹️","🤺","🤾","🏌️","🏇","🧘","🏄","🏊","🤽","🚣","🧗","🚵","🚴","🏆","🥇","🥈","🥉","🏅","🎖️","🏵️","🎗️","🎫","🎟️","🎪","🤹","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎺","🎸","🪕","🎻","🎲","♟️","🎯","🎳","🎮","🎰","🧩"],
  },
];

const TENOR_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY ?? "";
const TENOR_BASE = "https://tenor.googleapis.com/v2";

type TenorResult = {
  id: string;
  content_description: string;
  media_formats: {
    gif?:     { url: string; dims: [number, number] };
    tinygif?: { url: string; dims: [number, number] };
  };
};

export type EmojiGifPickerProps = {
  /** Called when an emoji is picked. The character is inserted at caret. */
  onEmoji: (emoji: string) => void;
  /** Called with the chosen GIF URL (full-quality). */
  onGif: (url: string) => void;
  /** Visual size of the trigger and panel. */
  size?: "sm" | "md";
  /** Optional className for the trigger button. */
  className?: string;
  /** Where the panel should anchor relative to the trigger. */
  align?: "left" | "right";
  direction?: "up" | "down";
};

export function EmojiGifPicker({
  onEmoji, onGif, size = "md", className, align = "right", direction = "up",
}: EmojiGifPickerProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const triggerSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const iconSize    = size === "sm" ? 14 : 16;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Emoji & GIF"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={
          "inline-flex items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-panel-2 hover:text-fg " +
          triggerSize + (className ? " " + className : "")
        }
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </button>
      {open && (
        <Panel
          align={align}
          direction={direction}
          onEmoji={(e) => { onEmoji(e); /* keep open for multi-pick */ }}
          onGif={(url) => { onGif(url); setOpen(false); }}
        />
      )}
    </div>
  );
}

function Panel({
  align, direction, onEmoji, onGif,
}: {
  align: "left" | "right";
  direction: "up" | "down";
  onEmoji: (emoji: string) => void;
  onGif: (url: string) => void;
}) {
  const [tab, setTab] = React.useState<"emoji" | "gif">("emoji");

  const pos =
    (direction === "up" ? "bottom-full mb-2 " : "top-full mt-2 ") +
    (align === "right" ? "right-0 origin-bottom-right" : "left-0 origin-bottom-left");

  return (
    <div
      role="dialog"
      aria-label="Pilih emoji atau GIF"
      className={
        "absolute z-50 w-[320px] overflow-hidden rounded-2xl border border-rule bg-panel shadow-xl ring-1 ring-black/5 animate-menu-pop " +
        pos
      }
    >
      <div className="flex border-b border-rule">
        <TabButton active={tab === "emoji"} onClick={() => setTab("emoji")}>Emoji</TabButton>
        <TabButton active={tab === "gif"}   onClick={() => setTab("gif")}>GIF</TabButton>
      </div>
      {tab === "emoji" ? <EmojiTab onPick={onEmoji} /> : <GifTab onPick={onGif} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors " +
        (active ? "text-brand-500 border-b-2 border-brand-400" : "text-fg-subtle hover:text-fg")
      }
    >
      {children}
    </button>
  );
}

/* ---------------- Emoji tab ---------------- */

function EmojiTab({ onPick }: { onPick: (emoji: string) => void }) {
  const [q, setQ] = React.useState("");
  const filtered = React.useMemo(() => {
    if (!q.trim()) return EMOJI_GROUPS;
    // No emoji metadata bundled — fall back to category-name match so the
    // search box still feels responsive.
    const needle = q.toLowerCase();
    return EMOJI_GROUPS.filter((g) => g.label.toLowerCase().includes(needle));
  }, [q]);

  return (
    <div className="flex flex-col">
      <div className="border-b border-rule p-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari kategori…"
          className="h-8 w-full rounded-lg border border-rule bg-panel-2 px-3 text-xs text-fg placeholder:text-fg-subtle focus:border-brand-400/60 focus:outline-none"
        />
      </div>
      <div className="max-h-[280px] overflow-y-auto p-2">
        {filtered.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-fg-subtle">
              {group.label}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {group.chars.map((c, i) => (
                <button
                  key={`${c}-${i}`}
                  type="button"
                  onClick={() => onPick(c)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-lg transition-colors hover:bg-panel-2"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- GIF tab ---------------- */

function GifTab({ onPick }: { onPick: (url: string) => void }) {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<TenorResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!TENOR_KEY) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      setLoading(true); setErr(null);
      try {
        const endpoint = q.trim()
          ? `${TENOR_BASE}/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&client_key=hoobiq&limit=24&media_filter=tinygif,gif&contentfilter=high`
          : `${TENOR_BASE}/featured?key=${TENOR_KEY}&client_key=hoobiq&limit=24&media_filter=tinygif,gif&contentfilter=high`;
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error("tenor_failed");
        const data = (await res.json()) as { results: TenorResult[] };
        if (!cancelled) setItems(data.results ?? []);
      } catch {
        if (!cancelled) setErr("Gagal memuat GIF.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, q ? 250 : 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [q]);

  if (!TENOR_KEY) {
    return (
      <div className="p-5 text-center">
        <div className="mb-2 text-2xl">🎞️</div>
        <p className="text-sm font-medium text-fg">GIF picker belum aktif</p>
        <p className="mt-1 text-xs text-fg-muted">
          Set <code className="rounded bg-panel-2 px-1 py-0.5 font-mono text-[11px]">NEXT_PUBLIC_TENOR_API_KEY</code> di
          <code className="ml-1 rounded bg-panel-2 px-1 py-0.5 font-mono text-[11px]">apps/web/.env.local</code> lalu restart dev server.
        </p>
        <a
          href="https://developers.google.com/tenor/guides/quickstart"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs font-semibold text-brand-500 hover:underline"
        >
          Cara dapat API key gratis →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-rule p-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari GIF…"
          className="h-8 w-full rounded-lg border border-rule bg-panel-2 px-3 text-xs text-fg placeholder:text-fg-subtle focus:border-brand-400/60 focus:outline-none"
        />
      </div>
      <div className="max-h-[280px] overflow-y-auto p-2">
        {err ? (
          <p className="py-6 text-center text-xs text-flame-500">{err}</p>
        ) : loading ? (
          <p className="py-6 text-center text-xs text-fg-subtle">Memuat…</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-xs text-fg-subtle">Belum ada hasil.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map((g) => {
              const thumb = g.media_formats.tinygif?.url ?? g.media_formats.gif?.url;
              const full  = g.media_formats.gif?.url ?? thumb;
              if (!thumb || !full) return null;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onPick(full)}
                  className="overflow-hidden rounded-lg border border-rule bg-panel-2 transition-transform hover:-translate-y-0.5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb} alt={g.content_description} className="h-24 w-full object-cover" loading="lazy" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

/**
 * Detect a "GIF-only message" — the body is just a URL pointing at a GIF.
 * Used by renderers (comments, DM bubbles) to swap to an inline image.
 */
export function asGifUrl(body: string): string | null {
  const trimmed = body.trim();
  if (!/^https?:\/\/\S+$/i.test(trimmed)) return null;
  if (/\.gif(\?|$)/i.test(trimmed)) return trimmed;
  // Tenor v2 CDN URLs end in .gif but include query strings; covered above.
  return null;
}

/**
 * Insert text at the current caret of an input/textarea, preserving focus.
 * Falls back to appending if the element isn't focused.
 */
export function insertAtCaret(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  insert: string,
  current: string,
  setNext: (next: string) => void
) {
  if (!el || el.selectionStart === null) {
    setNext(current + insert);
    return;
  }
  const start = el.selectionStart;
  const end   = el.selectionEnd ?? start;
  const next = current.slice(0, start) + insert + current.slice(end);
  setNext(next);
  // Restore caret after React re-renders
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + insert.length;
    el.setSelectionRange(pos, pos);
  });
}
