"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@hoobiq/ui";
import { api } from "@/lib/api/client";
import { uploadImage } from "@/lib/api/uploads";
import { useActionDialog } from "@/components/action-dialog";

type Cat = {
  id: string;
  slug: string;
  name: string;
  level: number;
  order: number;
  parentId: string | null;
  parentName: string | null;
  imageUrl: string | null;
  listingCount: number;
  childCount: number;
};

type Node = Cat & { children: Node[] };

type Selection =
  | { kind: "none" }
  | { kind: "edit"; id: string }
  | { kind: "new"; parentId: string | null };

/**
 * Tree-on-left, form-on-right editor. Parents collapse to expose / hide
 * their subtree. The right panel always shows whatever the admin clicked
 * last — either the edit form for an existing category or a "new" form
 * pre-filled with the parent. Saves stay on the same selection so admins
 * can keep iterating without leaving the page.
 */
export function CategoriesEditor({ initial }: { initial: Cat[] }) {
  const router = useRouter();
  const dialog = useActionDialog();
  const [err, setErr] = React.useState<string | null>(null);
  const [sel, setSel] = React.useState<Selection>({ kind: "none" });
  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
    // Auto-expand level-1 (canonical buckets) so the tree opens with the
    // 5 top-level rails visible immediately.
    return new Set(initial.filter((c) => c.level === 1).map((c) => c.id));
  });

  const tree = React.useMemo(() => buildTree(initial), [initial]);
  const byId = React.useMemo(() => new Map(initial.map((c) => [c.id, c])), [initial]);
  // Parent picker options — flat with indent dashes. Self + descendants
  // are filtered out at render time so a category can't reparent into
  // itself.
  const parentOptions = React.useMemo(
    () =>
      initial
        .filter((c) => c.level < 3)
        .sort((a, b) => a.level - b.level || a.order - b.order || a.name.localeCompare(b.name))
        .map((c) => ({ id: c.id, label: `${"— ".repeat(c.level - 1)}${c.name}`, level: c.level })),
    [initial],
  );

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleDelete(c: Cat) {
    dialog.open({
      title: `Hapus kategori "${c.name}"?`,
      description: c.childCount > 0 || c.listingCount > 0
        ? `Tidak bisa dihapus — kategori ini punya ${c.childCount} sub-kategori dan ${c.listingCount} listing. Hapus / pindahkan dulu sebelum kategori ini bisa dihapus.`
        : "Aksi ini tidak bisa di-undo.",
      tone: "danger",
      confirmLabel: c.childCount > 0 || c.listingCount > 0 ? "OK" : "Hapus",
      onConfirm: async () => {
        if (c.childCount > 0 || c.listingCount > 0) return;
        try {
          await api(`/admin/categories/${c.id}`, { method: "DELETE" });
          if (sel.kind === "edit" && sel.id === c.id) setSel({ kind: "none" });
          router.refresh();
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Gagal menghapus");
        }
      },
    });
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-fg-muted">{initial.length} kategori total</p>
          <Button variant="primary" size="sm" onClick={() => setSel({ kind: "new", parentId: null })}>
            + Tambah top-level
          </Button>
        </div>

        {err && <p className="mt-3 text-sm text-flame-500">{err}</p>}

        <div className="mt-4 overflow-hidden rounded-2xl border border-rule bg-panel">
          {tree.length === 0 ? (
            <p className="p-6 text-center text-sm text-fg-muted">Belum ada kategori. Tambah top-level dulu.</p>
          ) : (
            <ul role="tree" className="py-2">
              {tree.map((n) => (
                <TreeRow
                  key={n.id}
                  node={n}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggle}
                  selectedId={sel.kind === "edit" ? sel.id : null}
                  onSelect={(id) => setSel({ kind: "edit", id })}
                  onAddChild={(parentId) => {
                    setExpanded((s) => new Set(s).add(parentId));
                    setSel({ kind: "new", parentId });
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        {sel.kind === "none" ? (
          <div className="rounded-2xl border border-dashed border-rule bg-panel/30 p-8 text-center text-sm text-fg-muted">
            <p className="font-semibold text-fg">Pilih kategori untuk edit</p>
            <p className="mt-1">Klik kategori di sebelah kiri, atau tombol "+ Tambah" untuk bikin baru.</p>
          </div>
        ) : (
          <CategoryForm
            key={sel.kind === "edit" ? sel.id : `new-${sel.parentId ?? "root"}`}
            mode={sel.kind === "edit" ? "edit" : "create"}
            initial={sel.kind === "edit" ? byId.get(sel.id) : undefined}
            initialParentId={sel.kind === "new" ? sel.parentId : undefined}
            parents={parentOptions}
            allCats={initial}
            onCancel={() => setSel({ kind: "none" })}
            onSaved={() => { setSel({ kind: "none" }); router.refresh(); }}
            onError={(m) => setErr(m)}
            onDelete={sel.kind === "edit" ? () => {
              const c = byId.get(sel.id);
              if (c) handleDelete(c);
            } : undefined}
          />
        )}
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Tree row                                                              */
/* -------------------------------------------------------------------- */

function TreeRow({
  node, depth, expanded, onToggle, selectedId, onSelect, onAddChild, onDelete,
}: {
  node: Node;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (c: Cat) => void;
}) {
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;
  // Cap depth at level 2 — admins shouldn't normally need level-3 sub
  // parents, but if the data has them we still render them flat. The
  // "+ Sub" button is hidden once depth ≥ 2 to prevent accidental
  // 4-deep trees that the marketplace UI doesn't render anywhere.
  const canAddChild = node.level < 3;

  return (
    <li>
      <div
        className={
          "group flex items-center gap-1 px-2 py-1.5 transition-colors " +
          (isSelected ? "bg-brand-400/10" : "hover:bg-panel-2/60")
        }
        style={{ paddingLeft: 8 + depth * 20 }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={isOpen ? "Tutup" : "Buka"}
            onClick={() => onToggle(node.id)}
            className="grid h-6 w-6 place-items-center rounded text-fg-subtle hover:bg-panel-2 hover:text-fg"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className={isOpen ? "rotate-90 transition-transform" : "transition-transform"}>
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" />
        )}

        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex flex-1 items-center gap-2.5 truncate text-left"
        >
          {node.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={node.imageUrl} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
          ) : (
            <span className={"grid h-7 w-7 shrink-0 place-items-center rounded text-[11px] font-bold uppercase " + toneFor(node.level)}>
              {node.name[0]?.toUpperCase()}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate">
            <span className={"text-sm " + (isSelected ? "font-semibold text-fg" : "text-fg")}>{node.name}</span>
            <span className="ml-2 font-mono text-[10px] text-fg-subtle">{node.slug}</span>
          </span>
        </button>

        <span className="hidden items-center gap-3 font-mono text-[10px] text-fg-subtle sm:flex">
          {hasChildren && <span>{node.childCount} sub</span>}
          <span>{node.listingCount} list</span>
        </span>

        <div className="ml-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {canAddChild && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
              className="rounded px-2 py-1 text-[11px] font-semibold text-fg-muted hover:bg-panel-2 hover:text-brand-500"
              title="Tambah sub-kategori"
            >
              + Sub
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(node); }}
            className="rounded px-2 py-1 text-[11px] font-semibold text-fg-muted hover:bg-flame-500/10 hover:text-flame-500"
            title="Hapus"
          >
            Hapus
          </button>
        </div>
      </div>

      {isOpen && hasChildren && (
        <ul role="group">
          {node.children.map((c) => (
            <TreeRow
              key={c.id}
              node={c}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------- */
/* Form                                                                  */
/* -------------------------------------------------------------------- */

function CategoryForm({
  mode, initial, initialParentId, parents, allCats, onCancel, onSaved, onError, onDelete,
}: {
  mode: "create" | "edit";
  initial?: Cat;
  initialParentId?: string | null;
  parents: Array<{ id: string; label: string; level: number }>;
  allCats: Cat[];
  onCancel: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
  onDelete?: () => void;
}) {
  const [slug, setSlug]         = React.useState(initial?.slug ?? "");
  const [name, setName]         = React.useState(initial?.name ?? "");
  const [parentId, setParentId] = React.useState<string>(initial?.parentId ?? initialParentId ?? "");
  const [order, setOrder]       = React.useState(initial?.order ?? 0);
  const [imageUrl, setImageUrl] = React.useState<string | null>(initial?.imageUrl ?? null);
  const [busy, setBusy]         = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  // Filter out self + descendants from parent options when editing, so
  // an admin can't accidentally reparent a category under one of its
  // own children (would create a cycle the API rejects anyway, but we
  // hide it for clarity).
  const descendantIds = React.useMemo(() => {
    if (!initial) return new Set<string>();
    const out = new Set<string>([initial.id]);
    let added = true;
    while (added) {
      added = false;
      for (const c of allCats) {
        if (c.parentId && out.has(c.parentId) && !out.has(c.id)) {
          out.add(c.id);
          added = true;
        }
      }
    }
    return out;
  }, [initial, allCats]);
  const allowedParents = parents.filter((p) => !descendantIds.has(p.id));

  // Auto-suggest slug from name on create only — editing keeps the slug
  // stable so URLs / listings don't break.
  function onNameChange(v: string) {
    setName(v);
    if (mode === "create" && (slug === "" || slug === slugify(name))) {
      setSlug(slugify(v));
    }
  }

  async function pickImage(file: File) {
    setUploading(true);
    try {
      const url = await uploadImage(file, "branding");
      setImageUrl(url);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setBusy(true);
    try {
      const parentLevel = parentId ? (parents.find((p) => p.id === parentId)?.level ?? 1) : 0;
      const body = {
        slug: slug.trim(),
        name: name.trim(),
        parentId: parentId || null,
        order: Number(order) || 0,
        imageUrl,
        level: Math.min(3, parentLevel + 1),
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
    <div className="rounded-2xl border border-rule bg-panel p-5">
      <div className="flex items-center justify-between gap-2 border-b border-rule pb-3">
        <h2 className="text-base font-bold text-fg">
          {mode === "create" ? "Kategori baru" : `Edit ${initial?.name ?? ""}`}
        </h2>
        {mode === "edit" && initial && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
            LV {initial.level}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Nama</Label>
          <Input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Pokémon" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="pokemon" className="font-mono" />
          <p className="text-[10px] text-fg-subtle">Huruf kecil, tanpa spasi. Pakai dash untuk pisah kata.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Parent</Label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="h-10 rounded-lg border border-rule bg-panel px-3 text-sm text-fg"
          >
            <option value="">— Top level —</option>
            {allowedParents.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Urutan</Label>
          <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
          <p className="text-[10px] text-fg-subtle">Kecil = lebih dulu di list.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Gambar (slider home)</Label>
          <CategoryImagePicker
            url={imageUrl}
            uploading={uploading}
            onPick={pickImage}
            onClear={() => setImageUrl(null)}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-4">
        {mode === "edit" && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md px-2 py-1 text-xs font-semibold text-flame-500 hover:bg-flame-500/10"
          >
            Hapus kategori
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Batal</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={busy || !slug || !name}>
            {busy ? "Menyimpan…" : mode === "create" ? "Buat" : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CategoryImagePicker({
  url, uploading, onPick, onClear,
}: {
  url: string | null;
  uploading: boolean;
  onPick: (f: File) => void;
  onClear: () => void;
}) {
  const id = React.useId();
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-rule bg-panel-2/40">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[11px] text-fg-subtle">Belum diset</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor={id}
          className="cursor-pointer text-xs font-semibold text-brand-500 hover:text-brand-600"
        >
          {uploading ? "Mengupload…" : url ? "Ganti foto" : "Upload foto"}
        </label>
        {url && (
          <button type="button" onClick={onClear} className="text-left text-xs text-fg-muted hover:text-flame-500">
            Hapus foto
          </button>
        )}
        <span className="text-[10px] text-fg-subtle">JPG/PNG ≤ 2MB. Rasio 4:3 dianjurkan.</span>
        <input
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ""; }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Helpers                                                               */
/* -------------------------------------------------------------------- */

function buildTree(items: Cat[]): Node[] {
  const map = new Map<string, Node>();
  for (const it of items) map.set(it.id, { ...it, children: [] });
  const roots: Node[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortFn = (a: Node, b: Node) => a.order - b.order || a.name.localeCompare(b.name);
  roots.sort(sortFn);
  for (const n of map.values()) n.children.sort(sortFn);
  return roots;
}

function toneFor(level: number): string {
  switch (level) {
    case 1: return "bg-brand-500/15 text-brand-600 dark:text-brand-400";
    case 2: return "bg-flame-500/15 text-flame-600 dark:text-flame-400";
    default: return "bg-ultra-500/15 text-ultra-600 dark:text-ultra-400";
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
