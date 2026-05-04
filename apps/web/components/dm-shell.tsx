"use client";
import * as React from "react";
import { Avatar } from "@hoobiq/ui";
import { dmApi, type DMConversation, type DMMessage } from "@/lib/api/dm";
import { getSocket } from "@/lib/socket";
import { EmojiGifPicker, insertAtCaret } from "./emoji-picker";

/**
 * Two-pane DM client. Left: conversations list. Right: active thread.
 *
 * On mount we subscribe to the global Socket.IO connection. When the user
 * opens a conversation we `dm:join` its room and listen for `dm:message`
 * events. Sending uses the REST endpoint (so persistence + auth are handled
 * server-side); the gateway re-emits, and our listener appends the message
 * for everyone — including ourselves.
 */
export function DMShell({
  me,
  initial,
  openConversationId = null,
}: {
  me: { id: string; username: string };
  initial: DMConversation[];
  /** Conversation id resolved server-side from `?to=username`. Auto-selects it. */
  openConversationId?: string | null;
}) {
  const [conversations, setConversations] = React.useState(initial);
  const [activeId, setActiveId]   = React.useState<string | null>(openConversationId ?? initial[0]?.id ?? null);
  const [messages, setMessages]   = React.useState<DMMessage[]>([]);
  const [text, setText]           = React.useState("");
  const [loading, setLoading]     = React.useState(false);
  const [typingFrom, setTypingFrom] = React.useState<string | null>(null);
  const [connected, setConnected] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef  = React.useRef<HTMLInputElement>(null);

  /* ---------- Socket lifecycle ---------- */
  React.useEffect(() => {
    const socket = getSocket();

    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    setConnected(socket.connected);
    socket.on("connect",    onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onDisconnect);

    const onMessage = (payload: { conversationId: string; message: DMMessage }) => {
      // Update conversation list ordering + unread
      setConversations((rows) =>
        rows
          .map((r) =>
            r.id === payload.conversationId
              ? {
                  ...r,
                  lastMessage: {
                    body: payload.message.body.slice(0, 120),
                    fromMe: payload.message.senderId === me.id,
                    at: payload.message.createdAt,
                  },
                  unread:
                    payload.conversationId === activeId || payload.message.senderId === me.id
                      ? 0
                      : r.unread + 1,
                  updatedAt: payload.message.createdAt,
                }
              : r
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      );
      if (payload.conversationId === activeId) {
        setMessages((prev) =>
          prev.some((m) => m.id === payload.message.id)
            ? prev
            : [...prev, { ...payload.message, fromMe: payload.message.senderId === me.id }]
        );
      }
    };

    const onTyping = ({ userId, typing }: { userId: string; typing: boolean }) => {
      if (userId === me.id) return;
      setTypingFrom(typing ? userId : null);
    };

    socket.on("dm:message", onMessage);
    socket.on("dm:typing",  onTyping);
    return () => {
      socket.off("dm:message", onMessage);
      socket.off("dm:typing",  onTyping);
      socket.off("connect",    onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onDisconnect);
    };
  }, [activeId, me.id]);

  /* ---------- Load thread on activeId change ---------- */
  React.useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setLoading(true);
    dmApi.messages(activeId)
      .then((res) => { if (!cancelled) setMessages(res.items); })
      .catch(() => { if (!cancelled) setMessages([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    // Join socket room for realtime
    const socket = getSocket();
    socket.emit("dm:join", { conversationId: activeId });

    // Reset unread counter locally when opening
    setConversations((rows) => rows.map((r) => (r.id === activeId ? { ...r, unread: 0 } : r)));

    return () => { cancelled = true; };
  }, [activeId]);

  /* ---------- Auto-scroll on new message ---------- */
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  /* ---------- Send ---------- */
  async function send(e: React.FormEvent) {
    e.preventDefault();
    sendBody(text);
  }

  async function sendBody(raw: string) {
    const body = raw.trim();
    if (!body || !activeId) return;
    if (raw === text) setText("");
    try {
      await dmApi.sendMessage(activeId, body);
      // The gateway re-emits and our `onMessage` listener appends.
    } catch {
      // Restore typed text on failure so user can retry
      if (raw === text) setText(body);
    }
  }

  const active = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col lg:h-[calc(100vh-5rem)]">
      {!connected && (
        <div className="flex items-center justify-center gap-2 border-b border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          Koneksi realtime terputus — pesan baru mungkin tertunda.
        </div>
      )}
      {/* WhatsApp-style responsive layout: one column on mobile (list OR
          thread, never both), classic split on lg+. The grid template
          collapses to a single column under lg so neither pane is
          cramped. */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[320px_1fr]">
      {/* ---------- Threads list ---------- */}
      <aside className={"flex-col border-r border-rule lg:flex " + (active ? "hidden" : "flex")}>
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <h2 className="text-base font-bold text-fg">Pesan</h2>
          <span className="text-xs text-fg-subtle">{conversations.length} percakapan</span>
        </div>
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-sm text-fg-muted">
            Belum ada percakapan. Mulai Pesan dari halaman listing seller.
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={
                    "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors " +
                    (c.id === activeId ? "bg-brand-400/10" : "hover:bg-panel-2")
                  }
                >
                  <Avatar letter={c.counterpart?.username[0] ?? "U"} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-semibold text-fg">
                        {c.counterpart ? `@${c.counterpart.username}` : "—"}
                      </p>
                      <span className="font-mono text-[10px] text-fg-subtle">
                        {c.lastMessage ? timeAgo(c.lastMessage.at) : ""}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-fg-muted">
                      {c.lastMessage
                        ? (c.lastMessage.fromMe ? "Kamu: " : "") + c.lastMessage.body
                        : "Belum ada pesan"}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-400 px-1.5 text-[10px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* ---------- Active thread ---------- */}
      {active ? (
        <section className="flex min-w-0 flex-col">
          {/* WhatsApp-like sticky header with back button on mobile.
              Background uses a slightly tinted surface so the chat
              messages below have a clear visual frame. */}
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-rule bg-panel/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-panel/85 lg:px-6 lg:py-4">
            <button
              type="button"
              onClick={() => setActiveId(null)}
              aria-label="Kembali ke daftar pesan"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-fg-muted transition-colors hover:bg-panel-2 hover:text-fg lg:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <Avatar letter={active.counterpart?.username[0] ?? "U"} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-fg">{active.counterpart ? `@${active.counterpart.username}` : ""}</p>
              <p className="truncate text-xs text-fg-subtle">
                {active.counterpart?.city ?? "—"}
                {typingFrom && <span className="ml-2 text-brand-500">sedang mengetik…</span>}
              </p>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-6">
            {/* Anti-fraud reminder — fixed at the top of every thread.
                Buyers got phished into off-platform transfers via DM
                often enough that this banner pays for itself. */}
            <div className="mx-auto flex max-w-md items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span><b>Ingat!</b> Jangan pernah transfer di luar Hoobiq Pay buat menghindari penipuan.</span>
            </div>

            {loading ? (
              <div className="text-center text-sm text-fg-subtle">Memuat pesan…</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-fg-subtle">
                Mulai percakapan — sapa @{active.counterpart?.username} dengan pesan pertama.
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={"flex " + (m.fromMe ? "justify-end" : "justify-start")}>
                  <div
                    className={
                      "max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed break-words shadow-sm " +
                      (m.fromMe
                        ? "bg-gradient-to-br from-brand-500 to-ultra-500 text-white"
                        : "border border-rule bg-panel text-fg")
                    }
                  >
                    {m.body}
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-rule p-4">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                getSocket().emit("dm:typing", { conversationId: activeId, typing: e.target.value.length > 0 });
              }}
              onBlur={() => getSocket().emit("dm:typing", { conversationId: activeId, typing: false })}
              placeholder="Tulis pesan…"
              className="h-11 flex-1 rounded-xl border border-rule bg-panel px-4 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/15"
            />
            <EmojiGifPicker
              size="md"
              align="right"
              direction="up"
              onEmoji={(e) => insertAtCaret(inputRef.current, e, text, setText)}
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-400 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
            >
              Kirim
            </button>
          </form>
        </section>
      ) : (
        // Empty state — desktop only (mobile defaults to the list view
        // until the user taps a conversation). Polished to match the
        // mockup: pastel illustration + headline + CTA back to the
        // marketplace if they don't have anyone to chat with yet.
        <section className="hidden flex-1 flex-col items-center justify-center gap-4 px-8 py-16 text-center lg:flex">
          <div className="relative grid h-32 w-32 place-items-center">
            <span aria-hidden className="absolute inset-0 rounded-full bg-brand-400/15 blur-xl" />
            <span aria-hidden className="absolute -right-2 -top-2 text-3xl">✦</span>
            <span aria-hidden className="absolute -left-1 bottom-2 text-2xl">✦</span>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="relative text-brand-500">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-fg">Mulai Percakapan</p>
            <p className="mt-1 max-w-sm text-sm text-fg-muted">
              Pilih chat di samping atau mulai chat baru dengan seller untuk
              tanya-tanya soal produk.
            </p>
          </div>
          <a
            href="/marketplace"
            className="inline-flex h-10 items-center rounded-full bg-gradient-to-r from-brand-500 to-ultra-500 px-5 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5"
          >
            Jelajahi Marketplace
          </a>
        </section>
      )}
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j`;
  const d = Math.floor(h / 24);
  return d <= 6 ? `${d}h` : new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
