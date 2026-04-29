"use client";
import * as React from "react";
import { Avatar } from "@hoobiq/ui";
import { dmApi, type DMConversation, type DMMessage } from "@/lib/api/dm";
import { getSocket } from "@/lib/socket";
import { EmojiGifPicker, asGifUrl, insertAtCaret } from "./emoji-gif-picker";

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
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      {!connected && (
        <div className="flex items-center justify-center gap-2 border-b border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          Koneksi realtime terputus — pesan baru mungkin tertunda.
        </div>
      )}
      <div className="grid flex-1 grid-cols-[320px_1fr] overflow-hidden">
      {/* ---------- Threads list ---------- */}
      <aside className="flex flex-col border-r border-rule">
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
                        {c.counterpart?.username ?? "—"}
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
          <header className="flex items-center gap-3 border-b border-rule px-6 py-4">
            <Avatar letter={active.counterpart?.username[0] ?? "U"} size="md" />
            <div className="flex-1">
              <p className="font-semibold text-fg">{active.counterpart?.username}</p>
              <p className="text-xs text-fg-subtle">
                {active.counterpart?.city ?? "—"}
                {typingFrom && <span className="ml-2 text-brand-500">sedang mengetik…</span>}
              </p>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-6">
            {loading ? (
              <div className="text-center text-sm text-fg-subtle">Memuat pesan…</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-fg-subtle">
                Mulai percakapan — sapa {active.counterpart?.username} dengan pesan pertama.
              </div>
            ) : (
              messages.map((m) => {
                const gif = asGifUrl(m.body);
                if (gif) {
                  return (
                    <div key={m.id} className={"flex " + (m.fromMe ? "justify-end" : "justify-start")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gif}
                        alt=""
                        className="max-h-64 max-w-[75%] rounded-2xl border border-rule"
                        loading="lazy"
                      />
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={"flex " + (m.fromMe ? "justify-end" : "justify-start")}>
                    <div
                      className={
                        "max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed break-words " +
                        (m.fromMe
                          ? "bg-brand-400 text-white"
                          : "border border-rule bg-panel text-fg")
                      }
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })
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
              onGif={(url) => sendBody(url)}
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
        <section className="flex items-center justify-center text-fg-subtle">
          Pilih percakapan untuk mulai.
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
