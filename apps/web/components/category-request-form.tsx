"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Textarea } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";

type Node = {
  id: string;
  slug: string;
  name: string;
  level: number;
  children?: Node[];
};

/**
 * Lets users propose a new sub-category that admin reviews. Picks a
 * parent (level-1 or level-2) from the existing tree, names the new
 * entry, optionally suggests a slug, and submits.
 *
 * Reused on /pengaturan/kategori-baru (standalone page) AND inline on
 * the upload form so seller can request a missing series mid-listing
 * without leaving the page.
 *
 * After a successful submit it shows a small inline confirmation; the
 * user can then continue uploading or close the form.
 */
export function CategoryRequestForm({
  tree,
  inline,
  onDone,
}: {
  tree: Node[];
  /** Inline = no Card wrapper, denser layout (used inside the upload page). */
  inline?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [parentId, setParentId] = React.useState("");
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  // Flatten only level-1 and level-2 (admin only allows up to depth 3).
  const parents = React.useMemo(() => {
    const out: { id: string; label: string; level: number }[] = [];
    const walk = (nodes: Node[], parents: string[]) => {
      for (const n of nodes) {
        if (n.level <= 2) {
          out.push({
            id: n.id,
            label: [...parents, n.name].join(" › "),
            level: n.level,
          });
        }
        if (n.children?.length) walk(n.children, [...parents, n.name]);
      }
    };
    walk(tree, []);
    return out;
  }, [tree]);

  function submit() {
    if (!parentId || name.trim().length < 2) {
      setErr("Pilih induk kategori dan isi nama (min 2 karakter).");
      return;
    }
    setErr(null);
    start(async () => {
      try {
        await api<{ id: string }>("/categories/requests", {
          method: "POST",
          body: {
            parentId,
            name: name.trim(),
            slugHint: slug.trim() || undefined,
            description: desc.trim() || undefined,
          },
        });
        setDone(true);
        setName(""); setSlug(""); setDesc(""); setParentId("");
        // Let the upload form (or any parent) react to the submission —
        // typically by closing the inline panel.
        onDone?.();
        // Refresh server data so /pengaturan/kategori-baru sees the new row.
        router.refresh();
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal kirim request.");
      }
    });
  }

  const Wrapper: React.FC<{ children: React.ReactNode }> = inline
    ? ({ children }) => <div className="rounded-xl border border-rule bg-panel-2/40 p-4">{children}</div>
    : ({ children }) => <Card><div className="space-y-4 p-6">{children}</div></Card>;

  return (
    <Wrapper>
      {!inline && (
        <div>
          <h2 className="text-lg font-bold text-fg">Request kategori baru</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Belum ada series/anime yang kamu cari? Ajuin sub-kategori baru — admin
            review dalam 1–2 hari, kalau di-approve langsung muncul untuk semua user.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Induk kategori</Label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="h-11 rounded-md border border-rule bg-panel px-3 text-sm text-fg focus:border-brand-400 focus:outline-none"
          >
            <option value="">— Pilih kategori induk —</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Nama sub-kategori</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Contoh: Hatsune Miku, Crocs, JoJo's Bizarre Adventure"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Slug (opsional)</Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            maxLength={64}
            placeholder="hatsune-miku"
          />
          <p className="text-[11px] text-fg-subtle">Huruf kecil, angka, strip. Admin bisa override saat approve.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Catatan untuk admin (opsional)</Label>
          <Textarea
            rows={2}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            maxLength={500}
            placeholder="Kenapa perlu kategori ini? Contoh listing yang relevan, dll."
          />
        </div>
      </div>

      {err && (
        <p role="alert" className="rounded-md border border-flame-400/40 bg-flame-400/10 px-3 py-2 text-xs text-flame-600">
          {err}
        </p>
      )}
      {done && (
        <p role="status" className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          Request terkirim. Cek statusnya di <a href="/pengaturan/kategori-baru" className="underline">/pengaturan/kategori-baru</a>.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="primary" size="sm" onClick={submit} disabled={pending}>
          {pending ? "Mengirim…" : "Kirim request"}
        </Button>
      </div>
    </Wrapper>
  );
}
