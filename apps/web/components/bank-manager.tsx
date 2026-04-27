"use client";
import * as React from "react";
import { Badge, Button, Card, Input, Label } from "@hoobiq/ui";
import { banksApi, type BankAccount, type BankInput } from "@/lib/api/banks";
import { ApiError } from "@/lib/api/client";

const banksList = ["BCA", "Mandiri", "BNI", "BRI", "CIMB", "Permata", "BSI"] as const;

export function BankManager({ initial }: { initial: BankAccount[] }) {
  const [items, setItems] = React.useState(initial);
  const [adding, setAdding] = React.useState(false);
  const [form, setForm] = React.useState<BankInput>({ bank: "BCA", number: "", holderName: "", primary: false });
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);

  function reset() { setAdding(false); setForm({ bank: "BCA", number: "", holderName: "", primary: false }); setErr(null); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      try {
        const created = await banksApi.create(form);
        setItems((rows) => [created, ...rows.map((r) => form.primary ? { ...r, primary: false } : r)]);
        reset();
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Gagal menambah rekening.");
      }
    });
  }

  async function makePrimary(id: string) {
    try {
      await banksApi.update(id, { primary: true });
      setItems((rows) => rows.map((r) => ({ ...r, primary: r.id === id })));
    } catch { /* ignore */ }
  }

  async function remove(id: string) {
    if (!confirm("Hapus rekening ini?")) return;
    try {
      await banksApi.remove(id);
      setItems((rows) => rows.filter((r) => r.id !== id));
    } catch { /* ignore */ }
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-fg">Rekening payout</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Rekening tujuan penarikan saldo Hoobiq Pay. Nama pemilik wajib sama dengan nama verifikasi akun.
          </p>
        </div>
        {!adding && (
          <Button type="button" variant="primary" size="sm" onClick={() => setAdding(true)}>+ Tambah rekening</Button>
        )}
      </div>

      {adding && (
        <Card>
          <form onSubmit={submit} className="space-y-4 p-6">
            <h3 className="text-base font-semibold text-fg">Rekening baru</h3>
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <Field label="Bank">
                <select
                  value={form.bank}
                  onChange={(e) => setForm({ ...form, bank: e.target.value })}
                  required
                  className="h-11 w-full rounded-xl border border-rule bg-panel px-3 text-sm text-fg focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/15"
                >
                  {banksList.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Nomor rekening" hint="8-20 digit angka, tanpa spasi">
                <Input
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value.replace(/\D/g, "") })}
                  pattern="\d{8,20}"
                  inputMode="numeric"
                  required
                />
              </Field>
            </div>
            <Field label="Nama pemilik (sesuai buku tabungan)">
              <Input
                value={form.holderName}
                onChange={(e) => setForm({ ...form, holderName: e.target.value })}
                required minLength={2} maxLength={120}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <input type="checkbox" checked={!!form.primary} onChange={(e) => setForm({ ...form, primary: e.target.checked })} className="h-4 w-4 accent-brand-400" />
              Jadikan rekening utama
            </label>
            {err && <p role="alert" className="text-xs text-flame-600">{err}</p>}
            <div className="flex justify-end gap-2 border-t border-rule pt-4">
              <Button type="button" variant="ghost" size="sm" onClick={reset}>Batal</Button>
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                {pending ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {items.length === 0 && !adding ? (
        <Card><div className="p-10 text-center">
          <p className="text-base font-medium text-fg">Belum ada rekening</p>
          <p className="mt-1 text-sm text-fg-muted">Tambahkan rekening untuk menarik saldo.</p>
        </div></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((b) => (
            <Card key={b.id}>
              <div className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl bg-panel-2 font-bold text-fg">
                  {b.bank}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-medium text-fg">•••• •••• •••• {b.numberLast4}</p>
                    {b.primary && <Badge tone="mint" size="xs">Utama</Badge>}
                    {b.verified ? <Badge tone="ghost" size="xs">Terverifikasi</Badge> : <Badge tone="crim" size="xs">Pending</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-fg-muted">a/n {b.holderName}</p>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  {!b.primary && (
                    <button onClick={() => makePrimary(b.id)} className="text-xs text-brand-500 hover:underline">Jadikan utama</button>
                  )}
                  <button onClick={() => remove(b.id)} className="text-xs text-fg-subtle hover:text-flame-500">Hapus</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-brand-400/30 bg-brand-400/5">
        <div className="p-5 text-sm text-fg-muted">
          <p className="font-medium text-fg">Kenapa perlu rekening terverifikasi?</p>
          <p className="mt-1">
            Untuk cegah penipuan, nama pemilik rekening wajib sama dengan nama KTP verifikasi akun.
            Verifikasi otomatis lewat sistem cek nama bank BI (selesai &lt; 1 menit).
          </p>
        </div>
      </Card>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
