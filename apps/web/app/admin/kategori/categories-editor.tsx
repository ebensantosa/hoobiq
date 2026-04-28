"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@hoobiq/ui";
import { api } from "@/lib/api/client";

type Cat = {
  id: string;
  slug: string;
  name: string;
  level: number;
  order: number;
  parentId: string | null;
  parentName: string | null;
  listingCount: number;
  childCount: number;
};

export function CategoriesEditor({ initial }: { initial: Cat[] }) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Build a quick id->name map for the parent select
  const parentOptions = React.useMemo(
    () => initial.filter((c) => c.level < 3).map((c) => ({ id: c.id, label: `${"— ".repeat(c.level - 1)}${c.name}` })),
    [initial],
  );

  async function handleDelete(c: Cat) {
    if (!confirm(`Hapus kategori "${c.name}"? Tidak bisa di-undo.`)) return;
    setErr(null);
    try {
      await api(`/admin/categories/${c.id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }

  return (
    <div className="mt-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">{initial.length} kategori total</p>
        <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
          + Tambah kategori
        </Button>
      </div>

      {err && <p className="mt-3 text-sm text-crim-400">{err}</p>}

      {adding && (
        <Card className="mt-4">
          <CategoryForm
            mode="create"
            parents={parentOptions}
            onCancel={() => setAdding(false)}
            onSaved={() => { setAdding(false); router.refresh(); }}
            onError={(m) => setErr(m)}
          />
        </Card>
      )}

      <Card className="mt-4">
        <div className="grid grid-cols-[2fr_1fr_60px_60px_60px_180px] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          <span>Nama</span>
          <span>Parent</span>
          <span className="text-right">Lvl</span>
          <span className="text-right">Sub</span>
          <span className="text-right">List</span>
          <span className="text-right">Aksi</span>
        </div>
        {initial.map((c, i) => (
          <React.Fragment key={c.id}>
            <div className={"grid grid-cols-[2fr_1fr_60px_60px_60px_180px] items-center gap-4 px-5 py-3 text-sm " + (i < initial.length - 1 ? "border-b border-rule/60" : "")}>
              <div className="min-w-0">
                <p className="truncate font-medium text-fg" style={{ paddingLeft: (c.level - 1) * 16 }}>{c.name}</p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-fg-subtle">{c.slug}</p>
              </div>
              <span className="truncate text-fg-muted">{c.parentName ?? "—"}</span>
              <span className="text-right font-mono text-fg-muted">{c.level}</span>
              <span className="text-right font-mono text-fg-muted">{c.childCount}</span>
              <span className="text-right font-mono text-fg-muted">{c.listingCount}</span>
              <div className="flex justify-end gap-3 text-xs">
                <button onClick={() => setEditing(editing === c.id ? null : c.id)} className="text-fg-muted hover:text-brand-400">
                  {editing === c.id ? "Tutup" : "Edit"}
                </button>
                <button onClick={() => handleDelete(c)} className="text-fg-muted hover:text-crim-400">
                  Hapus
                </button>
              </div>
            </div>
            {editing === c.id && (
              <div className="border-b border-rule/60 bg-panel/30 px-5 py-4">
                <CategoryForm
                  mode="edit"
                  initial={c}
                  parents={parentOptions.filter((p) => p.id !== c.id)}
                  onCancel={() => setEditing(null)}
                  onSaved={() => { setEditing(null); router.refresh(); }}
                  onError={(m) => setErr(m)}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </Card>
    </div>
  );
}

function CategoryForm({
  mode, initial, parents, onCancel, onSaved, onError,
}: {
  mode: "create" | "edit";
  initial?: Cat;
  parents: Array<{ id: string; label: string }>;
  onCancel: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [slug, setSlug]         = React.useState(initial?.slug ?? "");
  const [name, setName]         = React.useState(initial?.name ?? "");
  const [parentId, setParentId] = React.useState(initial?.parentId ?? "");
  const [order, setOrder]       = React.useState(initial?.order ?? 0);
  const [busy, setBusy]         = React.useState(false);

  async function submit() {
    setBusy(true);
    try {
      const body = {
        slug: slug.trim(),
        name: name.trim(),
        parentId: parentId || null,
        order: Number(order) || 0,
        // Level inferred client-side from parent depth; API will validate.
        level: parentId ? Math.min(3, (parents.find((p) => p.id === parentId)?.label.split("— ").length ?? 1) + 1) : 1,
      };
      if (mode === "create") await api("/admin/categories", { method: "POST", body });
      else                    await api(`/admin/categories/${initial!.id}`, { method: "PATCH", body });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label>Nama</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pokémon" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Slug (huruf kecil, tanpa spasi)</Label>
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="pokemon" className="font-mono" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Parent (kosong = top-level)</Label>
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="h-10 rounded-lg border border-rule bg-panel px-3 text-sm text-fg"
        >
          <option value="">— Top level —</option>
          {parents.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Urutan (kecil = lebih dulu)</Label>
        <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
      </div>
      <div className="flex justify-end gap-2 md:col-span-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Batal</Button>
        <Button variant="primary" size="sm" onClick={submit} disabled={busy || !slug || !name}>
          {busy ? "Menyimpan…" : mode === "create" ? "Buat" : "Simpan"}
        </Button>
      </div>
    </div>
  );
}
