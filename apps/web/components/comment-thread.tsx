"use client";
import * as React from "react";
import { Avatar } from "@hoobiq/ui";
import { api } from "@/lib/api/client";
import { EmojiGifPicker, insertAtCaret } from "./emoji-picker";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: { username: string; name: string | null; avatarUrl: string | null };
};

/**
 * Lazy-loaded comment thread — fetches on first open so the feed list stays
 * cheap. Submit POSTs the comment then optimistically appends.
 */
export function CommentThread({
  postId,
  meUsername,
  onCountChange,
}: {
  postId: string;
  meUsername: string | null;
  onCountChange: (delta: number) => void;
}) {
  const [items, setItems] = React.useState<Comment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [body, setBody] = React.useState("");
  const [pending, start] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    api<{ items: Comment[] }>(`/posts/${postId}/comments`)
      .then((res) => { if (!cancelled) setItems(res.items.reverse()); })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    sendBody(body);
  }

  function sendBody(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setBody("");
    start(async () => {
      try {
        const created = await api<{ id: string }>(`/posts/${postId}/comments`, {
          method: "POST",
          body: { body: trimmed },
        });
        const optimistic: Comment = {
          id: created.id,
          body: trimmed,
          createdAt: new Date().toISOString(),
          author: { username: meUsername ?? "kamu", name: null, avatarUrl: null },
        };
        setItems((prev) => [...prev, optimistic]);
        onCountChange(+1);
      } catch {
        setBody(trimmed);
      }
    });
  }

  return (
    <div className="border-t border-rule bg-panel-2/40">
      {loading ? (
        <div className="px-5 py-4 text-xs text-fg-subtle">Memuat komentar…</div>
      ) : items.length === 0 ? (
        <div className="px-5 py-4 text-xs text-fg-subtle">Belum ada komentar. Jadi yang pertama!</div>
      ) : (
        <ul className="flex flex-col gap-3 px-5 py-4">
          {items.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar letter={c.author.username[0]?.toUpperCase() ?? "U"} size="sm" />
              <div className="flex-1 rounded-xl bg-panel px-3 py-2 text-sm">
                <p className="font-semibold text-fg">@{c.author.username}</p>
                <CommentBody body={c.body} />
                <p className="mt-1 text-[11px] text-fg-subtle">{timeAgo(c.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {meUsername ? (
        <form onSubmit={submit} className="flex items-center gap-2 border-t border-rule px-5 py-3">
          <input
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            placeholder={`Balas sebagai @${meUsername}…`}
            className="h-9 flex-1 rounded-lg border border-rule bg-panel px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/15"
          />
          <EmojiGifPicker
            size="sm"
            align="right"
            direction="up"
            onEmoji={(e) => insertAtCaret(inputRef.current, e, body, setBody)}
          />
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="rounded-lg bg-brand-400 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
          >
            Kirim
          </button>
        </form>
      ) : (
        <p className="border-t border-rule px-5 py-3 text-xs text-fg-subtle">
          Masuk untuk membalas.
        </p>
      )}
    </div>
  );
}

function CommentBody({ body }: { body: string }) {
  return <p className="mt-0.5 text-fg whitespace-pre-line break-words">{body}</p>;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j`;
  const d = Math.floor(h / 24);
  return d <= 6 ? `${d}h` : new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
