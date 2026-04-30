"use client";
import * as React from "react";
import { Avatar } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { Spinner } from "./spinner";

type Message = {
  id: string;
  kind: "user" | "system";
  body: string;
  senderId: string | null;
  sender: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
  createdAt: string;
  readByBuyerAt: string | null;
  readBySellerAt: string | null;
};

type Thread = {
  role: "buyer" | "seller";
  buyerId: string;
  sellerId: string;
  items: Message[];
};

/**
 * Escrow chat thread for a single order. Mounted on /pesanan/[id]
 * for buyer + seller. Server-side renders the initial message list;
 * the composer + polling lives client-side.
 *
 * Polling cadence: 6s while the page is foreground, slower (30s) when
 * tab is hidden. Skip altogether if the order is in a final state
 * (completed / cancelled / refunded older than 30 days) — handled by
 * the parent page passing `frozen={true}`.
 */
export function OrderChat({
  humanId,
  initial,
  frozen = false,
}: {
  humanId: string;
  initial: Thread;
  /** When true, hide the composer + stop polling (read-only history). */
  frozen?: boolean;
}) {
  const [thread, setThread] = React.useState<Thread>(initial);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message whenever the list grows.
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [thread.items.length]);

  // Mark unread messages as read once on mount + when new messages
  // arrive while the tab is foreground. Best-effort: failures don't
  // block UI rendering.
  React.useEffect(() => {
    if (frozen) return;
    api(`/orders/${encodeURIComponent(humanId)}/messages/read`, { method: "POST" }).catch(() => undefined);
  }, [humanId, thread.items.length, frozen]);

  // Polling — 6s foreground, 30s hidden. Resync the whole thread; for
  // the V1 message volume (a few dozen per order) it's cheap and
  // simpler than diff-merging by id.
  React.useEffect(() => {
    if (frozen) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      const interval = document.visibilityState === "visible" ? 6_000 : 30_000;
      try {
        const next = await api<Thread>(`/orders/${encodeURIComponent(humanId)}/messages`);
        if (cancelled) return;
        setThread(next);
      } catch { /* swallow — we'll retry next tick */ }
      if (!cancelled) timer = setTimeout(tick, interval);
    };
    timer = setTimeout(tick, 6_000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [humanId, frozen]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setErr(null);
    // Optimistic — append a temporary row, replace it on server response.
    const optimisticId = `tmp-${Date.now()}`;
    const me = thread.role;
    const placeholder: Message = {
      id: optimisticId,
      kind: "user",
      body: trimmed,
      senderId: null,
      sender: null,
      createdAt: new Date().toISOString(),
      readByBuyerAt:  me === "buyer"  ? new Date().toISOString() : null,
      readBySellerAt: me === "seller" ? new Date().toISOString() : null,
    };
    setThread((t) => ({ ...t, items: [...t.items, placeholder] }));
    setBody("");
    try {
      await api(`/orders/${encodeURIComponent(humanId)}/messages`, {
        method: "POST",
        body: { body: trimmed },
      });
      // Refetch the canonical thread so we have the real id + sender hydrated.
      const next = await api<Thread>(`/orders/${encodeURIComponent(humanId)}/messages`);
      setThread(next);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Gagal kirim pesan.");
      // Rollback the optimistic row.
      setThread((t) => ({ ...t, items: t.items.filter((m) => m.id !== optimisticId) }));
      setBody(trimmed);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-rule bg-panel">
      <header className="flex items-center justify-between border-b border-rule px-5 py-3">
        <div>
          <h2 className="text-sm font-bold text-fg">Chat dengan{" "}
            {thread.role === "buyer" ? "seller" : "buyer"}
          </h2>
          <p className="mt-0.5 text-[11px] text-fg-subtle">
            Aman lewat escrow Hoobiq Pay. Admin bisa review kalau ada dispute.
          </p>
        </div>
        {frozen && (
          <span className="rounded-sm bg-fg-subtle/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">
            Read-only
          </span>
        )}
      </header>

      <div
        ref={scrollerRef}
        className="flex max-h-[480px] min-h-[320px] flex-col gap-3 overflow-y-auto bg-canvas px-5 py-4"
      >
        {thread.items.length === 0 ? (
          <p className="m-auto text-center text-sm text-fg-subtle">
            Belum ada pesan. Mulai dengan menanyakan estimasi pengiriman atau
            packing.
          </p>
        ) : (
          thread.items.map((m) => <MessageBubble key={m.id} msg={m} myRole={thread.role} buyerId={thread.buyerId} sellerId={thread.sellerId} />)
        )}
      </div>

      {!frozen && (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-rule p-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(e);
              }
            }}
            placeholder={`Tulis pesan ke ${thread.role === "buyer" ? "seller" : "buyer"}…`}
            rows={1}
            maxLength={2000}
            className="min-h-[42px] flex-1 resize-none rounded-xl border border-rule bg-panel px-4 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/15"
          />
          <button
            type="submit"
            disabled={!body.trim() || sending}
            className="inline-flex h-[42px] items-center justify-center gap-1 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-fg-subtle"
          >
            {sending ? <Spinner size={14} /> : "Kirim"}
          </button>
        </form>
      )}
      {err && (
        <p role="alert" className="border-t border-flame-400/30 bg-flame-400/10 px-4 py-2 text-xs text-flame-600">
          {err}
        </p>
      )}
    </div>
  );
}

function MessageBubble({
  msg,
  myRole,
  buyerId,
  sellerId,
}: {
  msg: Message;
  myRole: "buyer" | "seller";
  buyerId: string;
  sellerId: string;
}) {
  const time = new Date(msg.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  if (msg.kind === "system") {
    return (
      <div className="my-1 flex justify-center">
        <p className="rounded-full bg-panel px-3 py-1 text-[11px] text-fg-muted">
          {msg.body}{" "}
          <span className="text-fg-subtle">· {time}</span>
        </p>
      </div>
    );
  }

  const fromMe = msg.senderId === (myRole === "buyer" ? buyerId : sellerId);
  return (
    <div className={"flex items-end gap-2 " + (fromMe ? "justify-end" : "justify-start")}>
      {!fromMe && (
        <Avatar
          letter={msg.sender?.username[0]?.toUpperCase() ?? "?"}
          size="sm"
          src={msg.sender?.avatarUrl ?? null}
          alt={msg.sender?.username ?? ""}
        />
      )}
      <div className={"max-w-[78%] " + (fromMe ? "items-end" : "items-start")}>
        <p
          className={
            "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm " +
            (fromMe
              ? "bg-brand-500 text-white"
              : "bg-panel text-fg")
          }
        >
          {msg.body}
        </p>
        <p className={"mt-0.5 text-[10px] text-fg-subtle " + (fromMe ? "text-right" : "")}>
          {time}
        </p>
      </div>
    </div>
  );
}
