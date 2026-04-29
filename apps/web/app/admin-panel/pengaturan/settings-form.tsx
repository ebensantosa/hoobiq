"use client";
import * as React from "react";
import { Button, Card, Input, Label } from "@hoobiq/ui";
import { api } from "@/lib/api/client";
import { uploadImage } from "@/lib/api/uploads";
import { COPY_KEY_LIST, type CopyKey } from "@/lib/copy/keys";

type Props = {
  initial: {
    brandName: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string;
    footerText: string;
    copy: Record<CopyKey, string>;
  };
  defaults: Record<CopyKey, string>;
};

export function SettingsForm({ initial, defaults }: Props) {
  const [state, setState] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  const dirty = JSON.stringify(state) !== JSON.stringify(initial);

  async function uploadAndSet(file: File, field: "logoUrl" | "faviconUrl") {
    setErr(null);
    try {
      const url = await uploadImage(file, "branding");
      setState((s) => ({ ...s, [field]: url }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload gagal");
    }
  }

  async function save() {
    setSaving(true); setErr(null); setOk(false);
    try {
      // Only send copy keys whose value differs from the default — keeps
      // the JSON small and lets defaults evolve in code without admin
      // values pinning them.
      const copyDiff: Record<string, string> = {};
      for (const k of COPY_KEY_LIST) {
        if (state.copy[k] !== defaults[k]) copyDiff[k] = state.copy[k];
      }
      await api("/site-settings", {
        method: "PATCH",
        body: {
          brandName: state.brandName,
          logoUrl: state.logoUrl,
          faviconUrl: state.faviconUrl,
          primaryColor: state.primaryColor,
          footerText: state.footerText,
          copy: copyDiff,
        },
      });
      setOk(true);
      // Force a fresh server render so the new branding is visible everywhere.
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 flex max-w-3xl flex-col gap-10">
      <section>
        <h2 className="text-xl font-semibold text-fg">Branding</h2>
        <p className="mt-1 text-sm text-fg-muted">Logo, nama brand, dan warna utama.</p>
        <Card className="mt-4">
          <div className="grid gap-5 p-6 md:grid-cols-2">
            <Field label="Nama brand">
              <Input
                value={state.brandName}
                onChange={(e) => setState({ ...state, brandName: e.target.value })}
              />
            </Field>
            <Field label="Warna primer (#hex)">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={state.primaryColor}
                  onChange={(e) => setState({ ...state, primaryColor: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-rule bg-transparent"
                />
                <Input
                  value={state.primaryColor}
                  onChange={(e) => setState({ ...state, primaryColor: e.target.value })}
                  className="font-mono"
                />
              </div>
            </Field>

            <Field label="Logo">
              <LogoPicker
                url={state.logoUrl}
                onPick={(f) => uploadAndSet(f, "logoUrl")}
                onClear={() => setState({ ...state, logoUrl: null })}
                aspect="wide"
              />
            </Field>
            <Field label="Favicon">
              <LogoPicker
                url={state.faviconUrl}
                onPick={(f) => uploadAndSet(f, "faviconUrl")}
                onClear={() => setState({ ...state, faviconUrl: null })}
                aspect="square"
              />
            </Field>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-fg">Footer</h2>
        <Card className="mt-4">
          <div className="p-6">
            <Field label="Teks footer (paling bawah halaman)">
              <Input
                value={state.footerText}
                onChange={(e) => setState({ ...state, footerText: e.target.value })}
              />
            </Field>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-fg">Teks halaman</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Editor untuk teks-teks penting di seluruh website. Kosongkan field untuk pakai default.
        </p>
        <Card className="mt-4">
          <div className="grid gap-4 p-6">
            {COPY_KEY_LIST.map((key) => (
              <div key={key} className="flex flex-col gap-1.5 border-b border-rule/40 pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-[11px] text-fg-subtle">{key}</Label>
                  {state.copy[key] !== defaults[key] && (
                    <button
                      type="button"
                      onClick={() => setState({ ...state, copy: { ...state.copy, [key]: defaults[key] } })}
                      className="text-[11px] text-brand-400"
                    >
                      Reset ke default
                    </button>
                  )}
                </div>
                <Input
                  value={state.copy[key]}
                  onChange={(e) => setState({ ...state, copy: { ...state.copy, [key]: e.target.value } })}
                />
                <span className="text-[11px] text-fg-subtle">Default: {defaults[key]}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <div className="sticky bottom-4 flex items-center justify-end gap-3 border-t border-rule bg-canvas/85 py-4 backdrop-blur">
        {err && <span className="mr-auto text-sm text-crim-400">{err}</span>}
        {ok  && <span className="mr-auto text-sm text-mint-400">Tersimpan. Reload…</span>}
        <Button variant="ghost" size="md" onClick={() => setState(initial)} disabled={!dirty || saving}>
          Batal
        </Button>
        <Button variant="primary" size="md" onClick={save} disabled={!dirty || saving}>
          {saving ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function LogoPicker({
  url, onPick, onClear, aspect,
}: {
  url: string | null;
  onPick: (f: File) => void;
  onClear: () => void;
  aspect: "wide" | "square";
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const box = aspect === "wide" ? "h-16 w-40" : "h-16 w-16";
  return (
    <div className="flex items-center gap-3">
      <div className={`${box} flex items-center justify-center rounded-lg border border-rule bg-panel/40 overflow-hidden`}>
        {url ? <img src={url} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-[11px] text-fg-subtle">Belum diset</span>}
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="text-xs font-semibold text-brand-400"
        >
          {url ? "Ganti…" : "Upload…"}
        </button>
        {url && (
          <button type="button" onClick={onClear} className="text-xs text-fg-muted hover:text-crim-400">
            Hapus
          </button>
        )}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ""; }}
        />
      </div>
    </div>
  );
}
