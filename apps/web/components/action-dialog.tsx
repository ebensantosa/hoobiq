"use client";
import * as React from "react";
import { Button, Input, Label, Textarea } from "@hoobiq/ui";

/**
 * Generic confirm/prompt modal — replacement for the native
 * window.confirm / window.prompt calls scattered across order
 * actions. Supports any combination of text / textarea / select
 * fields with light validation, and a confirm/cancel pair.
 *
 * Open imperatively via `useActionDialog().open({...config})`. The
 * `<ActionDialogHost />` component must be mounted once at the
 * page-or-shell root (we put it in AppShell + AdminShell so it's
 * available everywhere).
 */
export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select";
  placeholder?: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
  /** Min length for text/textarea (validated before confirm fires). */
  minLength?: number;
  hint?: string;
};

export type ActionDialogConfig = {
  title: string;
  description?: string;
  fields?: FieldDef[];
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" tone uses flame palette for the confirm button. */
  tone?: "primary" | "danger";
  /** Returning a string treats it as an inline error and keeps the
   *  dialog open. Returning void / true closes the dialog. */
  onConfirm: (values: Record<string, string>) => void | string | Promise<void | string>;
};

type State = ActionDialogConfig | null;

const DialogContext = React.createContext<{
  open: (cfg: ActionDialogConfig) => void;
} | null>(null);

export function useActionDialog() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("useActionDialog must be used inside <ActionDialogProvider>");
  return ctx;
}

export function ActionDialogProvider({ children }: { children: React.ReactNode }) {
  const [cfg, setCfg] = React.useState<State>(null);
  const open = React.useCallback((c: ActionDialogConfig) => setCfg(c), []);
  return (
    <DialogContext.Provider value={{ open }}>
      {children}
      {cfg && <Dialog cfg={cfg} onClose={() => setCfg(null)} />}
    </DialogContext.Provider>
  );
}

function Dialog({ cfg, onClose }: { cfg: ActionDialogConfig; onClose: () => void }) {
  const [values, setValues] = React.useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const f of cfg.fields ?? []) out[f.key] = f.defaultValue ?? "";
    return out;
  });
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, busy]);

  async function confirm() {
    setErr(null);
    // Field-level validation pass before delegating to onConfirm.
    for (const f of cfg.fields ?? []) {
      const v = (values[f.key] ?? "").trim();
      if (f.minLength && v.length < f.minLength) {
        setErr(`${f.label} minimal ${f.minLength} karakter.`);
        return;
      }
    }
    setBusy(true);
    try {
      const res = await cfg.onConfirm(values);
      if (typeof res === "string") {
        setErr(res);
      } else {
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  const isDanger = cfg.tone === "danger";

  return (
    <div role="dialog" aria-modal="true" aria-label={cfg.title} className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Tutup"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-rule bg-canvas shadow-2xl">
        <div className="px-5 py-4 border-b border-rule">
          <h2 className="text-base font-bold text-fg">{cfg.title}</h2>
          {cfg.description && (
            <p className="mt-1 text-sm text-fg-muted">{cfg.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          {(cfg.fields ?? []).map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <Label>{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  rows={4}
                  placeholder={f.placeholder}
                  autoFocus
                />
              ) : f.type === "select" ? (
                <select
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  className="h-10 rounded-lg border border-rule bg-panel px-3 text-sm text-fg"
                >
                  {(f.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <Input
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  autoFocus
                />
              )}
              {f.hint && <p className="text-[11px] text-fg-subtle">{f.hint}</p>}
            </div>
          ))}
          {err && (
            <p role="alert" className="rounded-md border border-flame-400/40 bg-flame-400/10 p-2 text-xs text-flame-600">
              {err}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-rule px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            {cfg.cancelLabel ?? "Batal"}
          </Button>
          <Button
            variant={isDanger ? "ghost" : "primary"}
            size="sm"
            onClick={confirm}
            disabled={busy}
            className={isDanger ? "border border-flame-500 bg-flame-500 text-white hover:bg-flame-600" : ""}
          >
            {busy ? "Memproses…" : cfg.confirmLabel ?? "Konfirmasi"}
          </Button>
        </div>
      </div>
    </div>
  );
}
