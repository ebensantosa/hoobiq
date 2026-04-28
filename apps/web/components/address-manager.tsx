"use client";
import * as React from "react";
import { Badge, Button, Card, Input, Label } from "@hoobiq/ui";
import { addressesApi, type Address, type AddressInput } from "@/lib/api/addresses";
import { ApiError } from "@/lib/api/client";
import { DestinationPicker, type Destination } from "./destination-picker";

const empty: AddressInput = {
  label: "Rumah", name: "", phone: "", line: "", city: "", province: "", postal: "",
  subdistrictId: null,
  primary: false,
};

export function AddressManager({ initial }: { initial: Address[] }) {
  const [items, setItems] = React.useState(initial);
  const [editing, setEditing] = React.useState<{ id?: string; data: AddressInput } | null>(null);
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);

  function startCreate() { setEditing({ data: { ...empty, primary: items.length === 0 } }); setErr(null); }
  function startEdit(a: Address) { setEditing({ id: a.id, data: { ...a } }); setErr(null); }
  function cancel() { setEditing(null); setErr(null); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setErr(null);
    start(async () => {
      try {
        if (editing.id) {
          const updated = await addressesApi.update(editing.id, editing.data);
          setItems((rows) => rows.map((r) => (r.id === editing.id ? updated : r))
            .map((r) => editing.data.primary && r.id !== editing.id ? { ...r, primary: false } : r));
        } else {
          const created = await addressesApi.create(editing.data);
          setItems((rows) => [created, ...rows.map((r) => editing.data.primary ? { ...r, primary: false } : r)]);
        }
        setEditing(null);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Gagal menyimpan alamat.");
      }
    });
  }

  async function makePrimary(id: string) {
    try {
      await addressesApi.update(id, { primary: true });
      setItems((rows) => rows.map((r) => ({ ...r, primary: r.id === id })));
    } catch { /* ignore */ }
  }

  async function remove(id: string) {
    if (!confirm("Hapus alamat ini?")) return;
    try {
      await addressesApi.remove(id);
      setItems((rows) => rows.filter((r) => r.id !== id));
    } catch { /* ignore */ }
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-fg">Alamat pengiriman</h2>
          <p className="mt-1 text-sm text-fg-muted">Tersimpan untuk checkout cepat. Alamat utama dipakai default.</p>
        </div>
        {!editing && (
          <Button type="button" variant="primary" size="sm" onClick={startCreate}>+ Tambah alamat</Button>
        )}
      </div>

      {editing && (
        <Card>
          <form onSubmit={submit} className="space-y-4 p-6">
            <h3 className="text-base font-semibold text-fg">{editing.id ? "Edit alamat" : "Alamat baru"}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Label"><Input value={editing.data.label} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, label: e.target.value } })} required maxLength={32} /></Field>
              <Field label="Nama penerima"><Input value={editing.data.name} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, name: e.target.value } })} required minLength={2} maxLength={120} /></Field>
              <Field label="No. HP"><Input value={editing.data.phone} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, phone: e.target.value } })} required minLength={8} maxLength={32} /></Field>
            </div>
            <Field
              label="Kelurahan / Kecamatan"
              hint="Cari nama kelurahan kamu — kota, provinsi, dan kode pos akan terisi otomatis. Wajib supaya checkout bisa hitung ongkir."
            >
              <DestinationPicker
                value={
                  editing.data.subdistrictId
                    ? {
                        id: editing.data.subdistrictId,
                        // We only persist the id, not the original label, so
                        // edits show a placeholder until the user re-picks.
                        label: editing.data.city
                          ? `${editing.data.city}, ${editing.data.province}`
                          : "(lokasi tersimpan)",
                        city: editing.data.city,
                        province: editing.data.province,
                        postalCode: editing.data.postal,
                      }
                    : null
                }
                onChange={(d: Destination | null) =>
                  setEditing({
                    ...editing,
                    data: d
                      ? {
                          ...editing.data,
                          subdistrictId: d.id,
                          city: d.city,
                          province: d.province,
                          postal: d.postalCode,
                        }
                      : { ...editing.data, subdistrictId: null },
                  })
                }
              />
            </Field>
            <Field label="Alamat lengkap" hint="Jalan, nomor, RT/RW">
              <Input value={editing.data.line} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, line: e.target.value } })} required minLength={5} maxLength={240} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <input type="checkbox" checked={editing.data.primary} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, primary: e.target.checked } })} className="h-4 w-4 accent-brand-400" />
              Jadikan alamat utama
            </label>
            {err && <p role="alert" className="text-xs text-flame-600">{err}</p>}
            <div className="flex justify-end gap-2 border-t border-rule pt-4">
              <Button type="button" variant="ghost" size="sm" onClick={cancel}>Batal</Button>
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                {pending ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {items.length === 0 && !editing ? (
        <Card>
          <div className="p-10 text-center">
            <p className="text-base font-medium text-fg">Belum ada alamat tersimpan</p>
            <p className="mt-1 text-sm text-fg-muted">Tambah alamat pertama untuk checkout lebih cepat.</p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start gap-4 p-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-fg">{a.label}</p>
                    {a.primary && <Badge tone="mint" size="xs">Utama</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-fg">{a.name} · {a.phone}</p>
                  <p className="mt-1 text-sm text-fg-muted">{a.line}</p>
                  <p className="text-sm text-fg-muted">{a.city}, {a.province} {a.postal}</p>
                </div>
                <div className="flex flex-col gap-2 text-right">
                  <button onClick={() => startEdit(a)} className="text-xs text-brand-500 hover:underline">Edit</button>
                  {!a.primary && (
                    <button onClick={() => makePrimary(a.id)} className="text-xs text-fg-muted hover:text-fg">Jadikan utama</button>
                  )}
                  <button onClick={() => remove(a.id)} className="text-xs text-fg-subtle hover:text-flame-500">Hapus</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
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
