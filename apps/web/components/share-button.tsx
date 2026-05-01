"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import { useToast } from "./toast-provider";
import { useActionDialog } from "./action-dialog";

type Mini = { username: string; name: string | null; avatarUrl: string | null };

/**
 * Share affordance — copy link OR send the URL to another Hoobiq user
 * via DM. The button itself is icon-only (small footprint on listing /
 * post cards); the heavy UI lives in a popover that opens on click.
 *
 * Two share targets:
 *  - "Salin link"      → navigator.clipboard write
 *  - "Kirim ke DM"     → POST /dm to start (or resume) the thread, then
 *                        POST /dm/:id/messages with body = `<title>\n<url>`.
 *
 * The recipient picker queries `/dm` (existing conversations) for the
 * top 8 most-recent + the user's followers. No remote autocomplete —
 * that'd add an endpoint; for now the user can paste a username if
 * the target isn't in their recent list.
 */
export function ShareButton({
  url,
  title,
  className,
  size = "md",
}: {
  /** Path or absolute URL to share. Path is resolved against window.location.origin at click time. */
  url: string;
  title: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const toast = useToast();

  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function fullUrl(): string {
    if (/^https?:\/\//i.test(url)) return url;
    if (typeof window === "undefined") return url;
    return new URL(url, window.location.origin).toString();
  }

  async function copyLink() {
    setOpen(false);
    try {
      const u = fullUrl();
      // Browsers gate clipboard on user activation + secure context;
      // fall back to a textarea trick on older browsers.
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(u);
      } else {
        const t = document.createElement("textarea");
        t.value = u; t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t); t.focus(); t.select();
        document.execCommand("copy");
        document.body.removeChild(t);
      }
      toast.success("Link disalin", "Tinggal paste ke chat lain.");
    } catch {
      toast.error("Gagal menyalin", "Coba copy manual dari address bar.");
    }
  }

  return (
    <div ref={ref} className={"relative inline-flex " + (className ?? "")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          "inline-flex items-center gap-1.5 rounded-full text-fg-muted transition-colors hover:bg-panel-2 hover:text-fg " +
          (size === "sm" ? "h-8 w-8 justify-center" : "h-9 px-3 text-xs font-semibold")
        }
        aria-label="Bagikan"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width={size === "sm" ? 16 : 14} height={size === "sm" ? 16 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/>
          <line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>
        </svg>
        {size !== "sm" && <span>Bagikan</span>}
      </button>

      {open && (
        <SharePopover
          onCopy={copyLink}
          onSend={() => setOpen(false)}
          url={fullUrl()}
          title={title}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- */

function SharePopover({
  onCopy,
  onSend,
  url,
  title,
}: {
  onCopy: () => void;
  onSend: () => void;
  url: string;
  title: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const dialog = useActionDialog();
  const [recents, setRecents] = React.useState<Mini[] | null>(null);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await api<{ items: Array<{ peer: Mini }> }>("/dm");
        if (cancel) return;
        const seen = new Set<string>();
        const list: Mini[] = [];
        for (const c of res.items ?? []) {
          if (c.peer && !seen.has(c.peer.username)) {
            seen.add(c.peer.username);
            list.push(c.peer);
          }
        }
        setRecents(list.slice(0, 8));
      } catch {
        setRecents([]);
      }
    })();
    return () => { cancel = true; };
  }, []);

  async function sendTo(username: string) {
    onSend();
    try {
      const conv = await api<{ id: string }>("/dm", {
        method: "POST",
        body: { withUsername: username },
      });
      await api(`/dm/${encodeURIComponent(conv.id)}/messages`, {
        method: "POST",
        body: { body: `${title}\n${url}` },
      });
      toast.success("Terkirim", `Link dikirim ke @${username}.`);
      router.refresh();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Gagal kirim.";
      toast.error("Gagal kirim", msg);
    }
  }

  function pickByUsername() {
    onSend();
    dialog.open({
      title: "Kirim ke username",
      description: "Ketik username Hoobiq tujuan (tanpa @).",
      fields: [{ key: "u", label: "Username", placeholder: "kolektor_keren" }],
      confirmLabel: "Kirim link",
      onConfirm: async (v) => {
        const username = String(v.u ?? "").trim().replace(/^@/, "");
        if (username.length < 3) return "Username minimal 3 karakter.";
        try {
          const conv = await api<{ id: string }>("/dm", { method: "POST", body: { withUsername: username } });
          await api(`/dm/${encodeURIComponent(conv.id)}/messages`, { method: "POST", body: { body: `${title}\n${url}` } });
          toast.success("Terkirim", `Link dikirim ke @${username}.`);
          router.refresh();
        } catch (e) {
          return e instanceof ApiError ? e.message : "Gagal kirim.";
        }
      },
    });
  }

  return (
    <div
      role="menu"
      className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-2xl border border-rule bg-panel shadow-xl ring-1 ring-black/5"
    >
      <button
        type="button"
        onClick={onCopy}
        className="flex w-full items-center gap-3 border-b border-rule px-4 py-3 text-left text-sm transition-colors hover:bg-panel-2"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-400/15 text-brand-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </span>
        <div className="flex-1">
          <p className="font-semibold text-fg">Salin link</p>
          <p className="truncate text-[11px] text-fg-subtle">{url}</p>
        </div>
      </button>

      <div className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">
        Kirim ke DM
      </div>

      {recents === null ? (
        <p className="px-4 py-4 text-xs text-fg-subtle">Memuat…</p>
      ) : recents.length === 0 ? (
        <button
          type="button"
          onClick={pickByUsername}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-panel-2"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-panel-2 text-fg-subtle">
            @
          </span>
          <div>
            <p className="font-semibold text-fg">Kirim ke username</p>
            <p className="text-[11px] text-fg-subtle">Belum ada DM aktif — ketik username manual.</p>
          </div>
        </button>
      ) : (
        <ul className="max-h-72 overflow-y-auto py-1">
          {recents.map((u) => (
            <li key={u.username}>
              <button
                type="button"
                onClick={() => sendTo(u.username)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-panel-2"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-panel-2 font-bold text-fg-muted">
                  {u.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (u.name ?? u.username)[0]?.toUpperCase()
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-fg">{u.name ?? `@${u.username}`}</p>
                  <p className="truncate text-[11px] text-fg-muted">@{u.username}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {recents && recents.length > 0 && (
        <button
          type="button"
          onClick={pickByUsername}
          className="block w-full border-t border-rule px-4 py-2.5 text-left text-xs font-semibold text-brand-500 transition-colors hover:bg-panel-2"
        >
          + Kirim ke username lain…
        </button>
      )}
    </div>
  );
}
