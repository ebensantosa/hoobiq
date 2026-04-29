"use client";

import * as React from "react";

type Tone = "info" | "success" | "error";

type Toast = {
  id: number;
  tone: Tone;
  title: string;
  description?: string;
};

type Ctx = {
  push: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error:   (title: string, description?: string) => void;
  info:    (title: string, description?: string) => void;
};

const ToastCtx = React.createContext<Ctx | null>(null);

/**
 * Lightweight global toast — bottom-right stack, auto-dismiss after 4s.
 * Used to surface async feedback from any client component without
 * each one rolling its own pop-up. Imported once at the layout root.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((arr) => [...arr, { ...t, id }]);
    // Auto-dismiss. Errors stay a touch longer so the user has time to read.
    const ttl = t.tone === "error" ? 6000 : 3500;
    window.setTimeout(() => {
      setToasts((arr) => arr.filter((x) => x.id !== id));
    }, ttl);
  }, []);

  const ctx = React.useMemo<Ctx>(() => ({
    push,
    success: (title, description) => push({ tone: "success", title, description }),
    error:   (title, description) => push({ tone: "error",   title, description }),
    info:    (title, description) => push({ tone: "info",    title, description }),
  }), [push]);

  function dismiss(id: number) { setToasts((arr) => arr.filter((t) => t.id !== id)); }

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div
        role="region"
        aria-live="polite"
        aria-label="Notifikasi"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const tone = TONES[toast.tone];
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={
        "pointer-events-auto flex animate-in slide-in-from-bottom items-start gap-3 rounded-md border bg-panel p-3 shadow-lg shadow-black/10 backdrop-blur " +
        tone.border
      }
    >
      <span className={"mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full " + tone.iconBg}>
        {tone.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-fg-muted">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Tutup notifikasi"
        className="grid h-6 w-6 shrink-0 place-items-center rounded text-fg-subtle transition-colors hover:bg-panel-2 hover:text-fg"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

const TONES = {
  info: {
    border: "border-rule",
    iconBg: "bg-brand-400/15 text-brand-500",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
  success: {
    border: "border-emerald-400/40",
    iconBg: "bg-emerald-500/15 text-emerald-600",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  error: {
    border: "border-flame-400/40",
    iconBg: "bg-flame-500/15 text-flame-600",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    ),
  },
} as const;

export function useToast(): Ctx {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) {
    // Soft fallback for places that mount outside the provider during
    // testing — log instead of crashing.
    return {
      push: (t) => console.log(`[toast:${t.tone}]`, t.title, t.description),
      success: (t, d) => console.log("[toast:success]", t, d),
      error:   (t, d) => console.error("[toast:error]", t, d),
      info:    (t, d) => console.log("[toast:info]", t, d),
    };
  }
  return ctx;
}
