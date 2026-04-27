"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notificationsApi, type NotificationItem } from "@/lib/api/notifications";

/**
 * Bell icon in the top nav. Clicking opens an inline popover with the latest
 * 10 notifications instead of navigating to the /notifikasi page. Full page
 * is still reachable via "Lihat semua".
 *
 * Behavior:
 *  - Lazy-fetch on first open (don't load on every page render).
 *  - Auto-refresh unread count every 60s while the tab is visible.
 *  - Click outside or press Esc to close.
 *  - Click an item → mark as read, then navigate if it carries a target.
 */
export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [unread, setUnread] = React.useState<number>(0);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  // Lightweight unread-count poll. Doesn't fetch the items list, so it's cheap.
  React.useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      if (document.hidden) return;
      try {
        const data = await notificationsApi.list();
        if (cancelled) return;
        setUnread(data?.unread ?? 0);
        setItems(data?.items ?? []);
        setLoaded(true);
      } catch {
        /* swallow — bell is best-effort */
      }
    };
    fetchUnread();
    const id = setInterval(fetchUnread, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Close on outside click + Esc.
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      setLoading(true);
      try {
        const data = await notificationsApi.list();
        setUnread(data?.unread ?? 0);
        setItems(data?.items ?? []);
        setLoaded(true);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
  }

  async function onItemClick(n: NotificationItem) {
    if (!n.readAt) {
      // Optimistic — bunyikan unread turun langsung
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(0, u - 1));
      try { await notificationsApi.markRead(n.id); } catch { /* ignore */ }
    }
    setOpen(false);
    const dest = targetFor(n);
    if (dest) router.push(dest);
  }

  async function markAll() {
    if (unread === 0) return;
    setItems((prev) => prev.map((x) => (x.readAt ? x : { ...x, readAt: new Date().toISOString() })));
    setUnread(0);
    try { await notificationsApi.markAllRead(); } catch { /* ignore */ }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Notifikasi"
        aria-expanded={open}
        title="Notifikasi"
        onClick={toggle}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rule bg-panel text-fg-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/50 hover:text-brand-500"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 animate-dot-pulse" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Daftar notifikasi"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[360px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-rule bg-canvas shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-fg">Notifikasi</p>
              <p className="text-[11px] text-fg-subtle">
                {unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
              </p>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-xs font-semibold text-brand-500 hover:underline"
              >
                Tandai semua
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-fg-muted">Memuat…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-fg">Belum ada notifikasi</p>
                <p className="mt-1 text-xs text-fg-muted">Aktivitas akan muncul di sini.</p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {items.slice(0, 10).map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onItemClick(n)}
                      className={
                        "flex w-full flex-col gap-1 border-b border-rule/60 px-4 py-3 text-left transition-colors hover:bg-panel/60 " +
                        (n.readAt ? "" : "bg-brand-400/5")
                      }
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-fg">
                        {!n.readAt && <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />}
                        {n.title}
                      </span>
                      <span className="line-clamp-2 text-xs text-fg-muted">{n.body}</span>
                      <span className="text-[10px] text-fg-subtle">{timeAgo(n.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-rule bg-panel/40 px-4 py-2.5">
            <Link
              href="/pengaturan/notifikasi"
              onClick={() => setOpen(false)}
              className="text-xs text-fg-muted hover:text-fg"
            >
              Preferensi
            </Link>
            <Link
              href="/notifikasi"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-brand-500 hover:underline"
            >
              Lihat semua →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return d === 1 ? "kemarin" : `${d} hari lalu`;
}

/**
 * Best-effort: derive a target URL from a notification's `kind` + `dataJson`.
 * Server doesn't ship a `href` field, so we infer here. Returning null means
 * "no navigation" — the popover just closes.
 */
function targetFor(n: NotificationItem): string | null {
  // Many of our backend notifications carry { humanId } in their dataJson.
  // The shape isn't on NotificationItem yet — so for now we map purely by kind.
  switch (n.kind) {
    case "order_shipped":
    case "order_completed":
    case "order_auto_cancelled":
    case "order_auto_released":
    case "cancel_requested":
    case "cancel_accepted":
    case "cancel_rejected":
    case "return_requested":
    case "return_approved":
    case "return_rejected":
    case "return_shipped_back":
    case "return_completed":
    case "dispute_resolved":
      return "/pesanan";
    default:
      return "/notifikasi";
  }
}
