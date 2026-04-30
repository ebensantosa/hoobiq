"use client";
import * as React from "react";

/**
 * Emoji popover (GIF tab dropped — see EmojiGifPicker → no longer
 * fetches Tenor; the component name is kept so existing callers
 * compile without churn).
 *
 * Usage: click trigger → open panel → click emoji → onEmoji(char)
 * fires. Panel stays open so the buyer can pick multiple.
 */

const EMOJI_GROUPS: Array<{ label: string; chars: string[] }> = [
  {
    label: "Sering dipakai",
    chars: ["👍","❤️","😂","🔥","🥺","😍","😭","🙌","✨","🎉","💯","👀"],
  },
  {
    label: "Emosi",
    chars: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😋","😛","😜","🤪","😝","🤗","🤭","🤔","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","💩"],
  },
  {
    label: "Tangan & badan",
    chars: ["👍","👎","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","👋","🤚","🖐️","✋","🖖","👏","🙌","👐","🤲","🤝","🙏","✍️","💪","🧠","👀","👅","👄","💋"],
  },
  {
    label: "Hati & simbol",
    chars: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","💯","💢","💥","💫","💦","💨","💣","💬","💭"],
  },
  {
    label: "Hewan & alam",
    chars: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦅","🦉","🐺","🐴","🦄","🐝","🐛","🦋","🐢","🐍","🐙","🐳","🐋","🦈","🐬","🦓","🦒","🐘","🐆","🐅","🦌","🐕","🐈","🦔"],
  },
  {
    label: "Makanan",
    chars: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🥑","🥦","🥕","🌽","🥔","🍞","🧀","🍳","🥓","🍔","🍟","🍕","🥙","🌮","🌯","🥗","🍝","🍜","🍣","🍱","🍙","🍚","🍰","🍪","🍫","🍩","🍿","🍯","☕","🍵","🍺","🍻","🥂","🍷","🍸"],
  },
  {
    label: "Aktivitas",
    chars: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🥊","🥋","🎿","🏂","🤸","🏊","🤽","🚴","🏆","🥇","🥈","🥉","🏅","🎟️","🎪","🎭","🎨","🎬","🎤","🎧","🎹","🥁","🎷","🎸","🎻","🎲","🎯","🎮"],
  },
];

export type EmojiGifPickerProps = {
  /** Called when an emoji is picked — char inserted at caret. */
  onEmoji: (emoji: string) => void;
  /** Visual size of the trigger and panel. */
  size?: "sm" | "md";
  /** Optional className for the trigger button. */
  className?: string;
  /** Where the panel anchors relative to the trigger. */
  align?: "left" | "right";
  direction?: "up" | "down";
};

export function EmojiGifPicker({
  onEmoji, size = "md", className, align = "right", direction = "up",
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

  const triggerSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconSize = size === "sm" ? 16 : 18;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Emoji"
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
          onEmoji={(e) => onEmoji(e)}
        />
      )}
    </div>
  );
}

function Panel({
  align, direction, onEmoji,
}: {
  align: "left" | "right";
  direction: "up" | "down";
  onEmoji: (emoji: string) => void;
}) {
  const pos =
    (direction === "up" ? "bottom-full mb-2 " : "top-full mt-2 ") +
    (align === "right" ? "right-0 origin-bottom-right" : "left-0 origin-bottom-left");

  return (
    <div
      role="dialog"
      aria-label="Pilih emoji"
      className={
        "absolute z-50 w-[320px] overflow-hidden rounded-2xl border border-rule bg-panel shadow-xl ring-1 ring-black/5 animate-menu-pop " +
        pos
      }
    >
      <div className="max-h-72 overflow-y-auto p-2">
        {EMOJI_GROUPS.map((g) => (
          <div key={g.label} className="px-1 py-1">
            <p className="px-1 pb-1 font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
              {g.label}
            </p>
            <div className="grid grid-cols-8 gap-1">
              {g.chars.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onEmoji(c)}
                  className="grid h-8 w-8 place-items-center rounded text-lg transition-colors hover:bg-panel-2"
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

/** Helper: insert a string at the caret position of an input/textarea. */
export function insertAtCaret(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  insert: string,
  current: string,
  setNext: (s: string) => void,
) {
  if (!el) {
    setNext(current + insert);
    return;
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + insert + current.slice(end);
  setNext(next);
  // Restore caret right after the inserted block on the next paint.
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    const pos = start + insert.length;
    el.setSelectionRange(pos, pos);
  });
}
