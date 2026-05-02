"use client";
import * as React from "react";
import { Avatar } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { useToast } from "./toast-provider";

export type ShareTarget = {
  username: string;
  name: string | null;
  avatarUrl: string | null;
  source: "dm" | "follow";
};

/**
 * Modal recipient picker — replaces the manual-username dialog. Pulls
 * three sources in parallel:
 *   - GET /dm                       — recent conversations (peer)
 *   - GET /users/:me/following      — kolektor yang user follow
 *   - GET /users/:me/followers      — yang follow user
 *
 * Dedupes by username (DMs first so already-chatted users float to top).
 * Search filters client-side. Empty state suggests typing a username
 * manually. Send wires through POST /dm + POST /dm/:id/messages, same
 * as the existing share-button flow.
 */
export function ShareToDmDialog({
  open,
  onClose,
  url,
  title,
  meUsername,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  meUsername?: string | null;
}) {
  const toast = useToast();
  const [contacts, setContacts] = React.useState<ShareTarget[] | null>(null);
  const [q, setQ] = React.useState("");
  const [sending, setSending] = React.useState<string | null>(null);
  const [manual, setManual] = React.useState(false);
  const [manualUsername, setManualUsername] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setContacts(null);
    setQ("");
    setManual(false);
    setManualUsername("");
    let cancel = false;
    (async () => {
      try {
        type Peer = { username: string; name: string | null; avatarUrl: string | null };
        const [dm, following, followers] = await Promise.all([
          api<{ items: Array<{ peer: Peer }> }>("/dm").catch(() => ({ items: [] })),
          meUsername
            ? api<{ items: Peer[] }>(`/users/${encodeURIComponent(meUsername)}/following`).catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] as Peer[] }),
          meUsername
            ? api<{ items: Peer[] }>(`/users/${encodeURIComponent(meUsername)}/followers`).catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] as Peer[] }),
        ]);
        if (cancel) return;
        const seen = new Set<string>();
        const list: ShareTarget[] = [];
        for (const c of dm.items ?? []) {
          if (c.peer && !seen.has(c.peer.username)) {
            seen.add(c.peer.username);
            list.push({ ...c.peer, source: "dm" });
          }
        }
        for (const u of following.items ?? []) {
          if (u && !seen.has(u.username)) {
            seen.add(u.username);
            list.push({ ...u, source: "follow" });
          }
        }
        for (const u of followers.items ?? []) {
          if (u && !seen.has(u.username)) {
            seen.add(u.username);
            list.push({ ...u, source: "follow" });
          }
        }
        setContacts(list);
      } catch {
        if (!cancel) setContacts([]);
      }
    })();
    return () => { cancel = true; };
  }, [open, meUsername]);

  // ESC closes
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = (contacts ?? []).filter((c) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return (
      c.username.toLowerCase().includes(needle) ||
      (c.name ?? "").toLowerCase().includes(needle)
    );
  });

  async function send(username: string) {
    if (sending) return;
    setSending(username);
    try {
      const conv = await api<{ id: string }>("/dm", { method: "POST", body: { withUsername: username } });
      await api(`/dm/${encodeURIComponent(conv.id)}/messages`, { method: "POST", body: { body: `${title}\n${url}` } });
      toast.success("Terkirim", `Link dikirim ke @${username}.`);
      onClose();
    } catch (e) {
      toast.error("Gagal kirim", e instanceof ApiError ? e.message : "Coba lagi.");
      setSending(null);
    }
  }

  function sendManual() {
    const u = manualUsername.trim().replace(/^@/, "");
    if (u.length < 3) {
      toast.error("Username terlalu pendek", "Minimal 3 karakter.");
      return;
    }
    void send(u);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-rule bg-panel shadow-2xl"
      >
        <header className="border-b border-rule px-5 py-4">
          <p className="text-base font-bold text-fg">Kirim ke DM</p>
          <p className="mt-0.5 text-xs text-fg-muted">Pilih kolektor — link otomatis dikirim ke chat.</p>
        </header>

        {/* Search */}
        <div className="border-b border-rule p-3">
          <div className="flex items-center gap-2 rounded-lg border border-rule bg-panel-2/60 px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-subtle">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama atau username…"
              className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {contacts === null ? (
            <p className="px-5 py-8 text-center text-xs text-fg-subtle">Memuat kontak…</p>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm font-semibold text-fg">
                {q.trim() ? "Tidak ditemukan" : "Belum ada kontak"}
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                {q.trim()
                  ? `Kirim ke "@${q.trim().replace(/^@/, "")}" manual.`
                  : "Follow kolektor lain atau mulai DM dulu — mereka muncul di sini."}
              </p>
              {q.trim() && (
                <button
                  type="button"
                  onClick={() => send(q.trim().replace(/^@/, ""))}
                  disabled={!!sending}
                  className="mt-3 inline-flex h-9 items-center rounded-full bg-brand-500 px-4 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  Kirim ke @{q.trim().replace(/^@/, "")}
                </button>
              )}
            </div>
          ) : (
            <ul className="py-1">
              {filtered.map((c) => (
                <li key={c.username}>
                  <button
                    type="button"
                    onClick={() => send(c.username)}
                    disabled={!!sending}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-panel-2 disabled:opacity-50"
                  >
                    <Avatar
                      letter={(c.name ?? c.username)[0]?.toUpperCase() ?? "U"}
                      size="sm"
                      src={c.avatarUrl}
                      alt={`@${c.username}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{c.name ?? `@${c.username}`}</p>
                      <p className="truncate text-[11px] text-fg-muted">@{c.username}</p>
                    </div>
                    <span className="rounded-full bg-panel-2 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-fg-subtle">
                      {c.source === "dm" ? "Chat" : "Follow"}
                    </span>
                    {sending === c.username && (
                      <svg className="h-4 w-4 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Manual fallback */}
        <div className="border-t border-rule p-3">
          {!manual ? (
            <button
              type="button"
              onClick={() => setManual(true)}
              className="w-full text-center text-xs font-semibold text-brand-500 hover:text-brand-600"
            >
              + Kirim ke username lain
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={manualUsername}
                onChange={(e) => setManualUsername(e.target.value)}
                placeholder="username (tanpa @)"
                onKeyDown={(e) => { if (e.key === "Enter") sendManual(); }}
                className="flex-1 rounded-lg border border-rule bg-panel-2/60 px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={sendManual}
                disabled={!!sending}
                className="inline-flex h-9 items-center rounded-lg bg-brand-500 px-4 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                Kirim
              </button>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-rule px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-fg-muted hover:text-fg"
          >
            Batal
          </button>
        </footer>
      </div>
    </div>
  );
}
