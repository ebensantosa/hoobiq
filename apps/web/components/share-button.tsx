"use client";
import * as React from "react";
import { useToast } from "./toast-provider";
import { ShareToDmDialog } from "./share-dm-dialog";

/**
 * Share affordance — copy link OR send the URL to another Hoobiq user
 * via DM. Click opens a small popover with two actions; "Kirim ke DM"
 * launches the proper recipient picker (ShareToDmDialog) which lists
 * recent DMs + follows + followers with a search box.
 */
export function ShareButton({
  url,
  title,
  meUsername,
  className,
  size = "md",
}: {
  /** Path or absolute URL. Path resolved against window.location.origin at click time. */
  url: string;
  title: string;
  meUsername?: string | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = React.useState(false);
  const [dmOpen, setDmOpen] = React.useState(false);
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
    <>
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
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-rule bg-panel p-1.5 shadow-xl ring-1 ring-black/5"
          >
            <button
              type="button"
              onClick={() => { setOpen(false); setDmOpen(true); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-panel-2"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </span>
              <span className="font-semibold text-fg">Kirim ke DM</span>
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-panel-2"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-panel-2 text-fg-muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </span>
              <span className="font-semibold text-fg">Salin link</span>
            </button>
          </div>
        )}
      </div>

      <ShareToDmDialog
        open={dmOpen}
        onClose={() => setDmOpen(false)}
        url={fullUrl()}
        title={title}
        meUsername={meUsername}
      />
    </>
  );
}
