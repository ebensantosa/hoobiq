"use client";
import * as React from "react";
import { Avatar } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { uploadImage } from "@/lib/api/uploads";
import { Spinner } from "./spinner";

type Message = {
  id: string;
  kind: "user" | "system" | "admin";
  body: string;
  images?: string[];
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
  /** "admin" when the viewer is an admin/ops moderator embedded into the
   *  thread via /admin-panel/dispute (read + post admin messages). */
  role: "buyer" | "seller" | "admin";
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
  const [pendingImages, setPendingImages] = React.useState<string[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const isAdmin = thread.role === "admin";

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

  async function pickImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = 4 - pendingImages.length;
    const arr = Array.from(files).slice(0, remaining);
    if (arr.length === 0) return;
    setUploading(true); setErr(null);
    try {
      const urls = await Promise.all(arr.map((f) => uploadImage(f, "evidence")));
      setPendingImages((p) => [...p, ...urls].slice(0, 4));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload gambar gagal.");
    } finally {
      setUploading(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if ((!trimmed && pendingImages.length === 0) || sending) return;
    setSending(true);
    setErr(null);
    // Optimistic — append a temporary row, replace it on server response.
    const optimisticId = `tmp-${Date.now()}`;
    const me = thread.role;
    const placeholder: Message = {
      id: optimisticId,
      kind: isAdmin ? "admin" : "user",
      body: trimmed,
      images: pendingImages,
      senderId: null,
      sender: null,
      createdAt: new Date().toISOString(),
      readByBuyerAt:  me === "buyer"  ? new Date().toISOString() : null,
      readBySellerAt: me === "seller" ? new Date().toISOString() : null,
    };
    setThread((t) => ({ ...t, items: [...t.items, placeholder] }));
    const sentBody = trimmed;
    const sentImages = pendingImages;
    setBody("");
    setPendingImages([]);
    try {
      const path = isAdmin
        ? `/orders/${encodeURIComponent(humanId)}/admin-messages`
        : `/orders/${encodeURIComponent(humanId)}/messages`;
      await api(path, {
        method: "POST",
        body: isAdmin
          ? { body: sentBody }
          : { body: sentBody, images: sentImages },
      });
      // Refetch the canonical thread so we have the real id + sender hydrated.
      const next = await api<Thread>(`/orders/${encodeURIComponent(humanId)}/messages${isAdmin ? "?as=admin" : ""}`);
      setThread(next);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Gagal kirim pesan.");
      // Rollback the optimistic row.
      setThread((t) => ({ ...t, items: t.items.filter((m) => m.id !== optimisticId) }));
      setBody(sentBody);
      setPendingImages(sentImages);
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
        <form onSubmit={send} className="flex flex-col gap-2 border-t border-rule p-3">
          {/* Pending image previews — appears between composer and
              the rest of the form when user has staged attachments. */}
          {!isAdmin && pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingImages.map((url, i) => (
                <div key={url} className="relative h-16 w-16 overflow-hidden rounded-md border border-rule bg-panel-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPendingImages((p) => p.filter((_, idx) => idx !== i))}
                    aria-label="Hapus"
                    className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            {!isAdmin && (
              <label
                aria-label="Lampirkan gambar"
                className={
                  "inline-flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-rule bg-panel text-fg-muted transition-colors hover:border-brand-400/60 hover:text-fg " +
                  (uploading || pendingImages.length >= 4 ? "pointer-events-none opacity-50" : "")
                }
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading || pendingImages.length >= 4}
                  onChange={(e) => { void pickImages(e.target.files); e.currentTarget.value = ""; }}
                />
                {uploading ? <Spinner size={14} /> : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-5-5L5 21"/>
                  </svg>
                )}
              </label>
            )}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(e);
                }
              }}
              placeholder={
                isAdmin
                  ? "Tulis pesan moderator (akan dikirim ke buyer + seller)…"
                  : `Tulis pesan ke ${thread.role === "buyer" ? "seller" : "buyer"}…`
              }
              rows={1}
              maxLength={2000}
              className="min-h-[42px] flex-1 resize-none rounded-xl border border-rule bg-panel px-4 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/15"
            />
            <button
              type="submit"
              disabled={(!body.trim() && pendingImages.length === 0) || sending}
              className={
                "inline-flex h-[42px] items-center justify-center gap-1 rounded-xl px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-fg-subtle " +
                (isAdmin ? "bg-amber-500 hover:bg-amber-600" : "bg-brand-500 hover:bg-brand-600")
              }
            >
              {sending ? <Spinner size={14} /> : isAdmin ? "Kirim sebagai admin" : "Kirim"}
            </button>
          </div>
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
  myRole: "buyer" | "seller" | "admin";
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

  // Admin messages render center-aligned with a distinct amber chrome
  // so buyer + seller both clearly identify them as moderator notes.
  if (msg.kind === "admin") {
    return (
      <div className="my-1 flex justify-center">
        <div className="max-w-[90%] rounded-xl border border-amber-400/50 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
          <p className="font-mono text-[10px] uppercase tracking-widest">
            🛡️ Admin Hoobiq · {time}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words">{msg.body}</p>
          {msg.images && msg.images.length > 0 && <ImagesGrid urls={msg.images} />}
        </div>
      </div>
    );
  }

  // Sender alignment — admin viewer always sees both sides on the
  // same axis (left for buyer, right for seller) so context is clear.
  const fromMe = myRole === "admin"
    ? false
    : msg.senderId === (myRole === "buyer" ? buyerId : sellerId);
  const isFromBuyer = msg.senderId === buyerId;
  const adminAlign = isFromBuyer ? "justify-start" : "justify-end";
  return (
    <div className={"flex items-end gap-2 " + (myRole === "admin" ? adminAlign : fromMe ? "justify-end" : "justify-start")}>
      {(!fromMe || myRole === "admin") && (
        <Avatar
          letter={msg.sender?.username[0]?.toUpperCase() ?? "?"}
          size="sm"
          src={msg.sender?.avatarUrl ?? null}
          alt={msg.sender?.username ?? ""}
        />
      )}
      <div className={"max-w-[78%] " + (fromMe ? "items-end" : "items-start")}>
        {(myRole === "admin" || (msg.sender && !fromMe)) && (
          <p className="text-[10px] font-semibold text-fg-subtle">
            {isFromBuyer ? "Buyer" : "Seller"} · {msg.sender?.username ? `@${msg.sender.username}` : ""}
          </p>
        )}
        {msg.body && (
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
        )}
        {msg.images && msg.images.length > 0 && <ImagesGrid urls={msg.images} />}
        <p className={"mt-0.5 text-[10px] text-fg-subtle " + (fromMe ? "text-right" : "")}>
          {time}
        </p>
      </div>
    </div>
  );
}

function ImagesGrid({ urls }: { urls: string[] }) {
  // Up to 4 attachments — single image fills, 2 split, 3+ wrap to 2-col.
  const cols = urls.length === 1 ? "grid-cols-1" : "grid-cols-2";
  return (
    <div className={"mt-2 grid gap-1 " + cols}>
      {urls.map((u, i) => (
        <a
          key={u + i}
          href={u}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block aspect-square overflow-hidden rounded-lg border border-rule bg-panel-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform hover:scale-105" loading="lazy" />
        </a>
      ))}
    </div>
  );
}
