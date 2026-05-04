"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Textarea } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { useToast } from "./toast-provider";

type Node = {
  id: string;
  slug: string;
  name: string;
  level: number;
  children?: Node[];
};

const PRIMARY_SLUGS = ["collection-cards", "trading-cards", "merchandise", "toys", "others"] as const;

/**
 * Three-step picker:
 *
 *   Induk Kategori   → must be one of the 5 canonical level-1 buckets.
 *   Sub Kategori     → existing level-2 under that induk, OR a brand-new
 *                      name the user types in (creatable).
 *   Series / Set     → free-text name of the actual thing the user wants.
 *
 * What gets sent to the server:
 *   - If sub is existing  → request is a NEW level-3 series/set under it.
 *     payload: { parentId: <subId>, name: <series>, slugHint, description }
 *   - If sub is new       → request is a NEW level-2 sub. The series name
 *     becomes the description ("first series: <name>") so the admin sees
 *     context and can either create just the sub or both. Once approved,
 *     the user can come back and request the series under the sub.
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
  const toast = useToast();
  const [indukId, setIndukId] = React.useState("");
  // Sub picker has special values: ""  → not chosen, "__new__" → user wants
  // to create a brand-new sub, otherwise a real category id.
  const [subValue, setSubValue] = React.useState("");
  const [newSubName, setNewSubName] = React.useState("");
  const [seriesName, setSeriesName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [pending, start] = React.useTransition();

  // Surface only canonical level-1 buckets in the induk picker. Sort
  // canonical-first so the dropdown reads in the marketing order.
  const indukOptions = React.useMemo(() => {
    const order = new Map(PRIMARY_SLUGS.map((s, i) => [s, i]));
    return tree
      .filter((n) => order.has(n.slug as typeof PRIMARY_SLUGS[number]))
      .sort((a, b) => (order.get(a.slug as typeof PRIMARY_SLUGS[number])! - order.get(b.slug as typeof PRIMARY_SLUGS[number])!))
      .map((n) => ({ id: n.id, name: n.name, slug: n.slug }));
  }, [tree]);

  // Existing sub-categories under the chosen induk.
  const subOptions = React.useMemo(() => {
    if (!indukId) return [];
    const induk = tree.find((n) => n.id === indukId);
    if (!induk?.children) return [];
    return induk.children
      .filter((c) => c.level === 2)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ id: c.id, name: c.name }));
  }, [indukId, tree]);

  const isCreatingNewSub = subValue === "__new__";
  // Reset the sub picker when induk changes so a stale id from a different
  // bucket doesn't leak through.
  React.useEffect(() => {
    setSubValue("");
    setNewSubName("");
  }, [indukId]);

  function submit() {
    if (!indukId) {
      toast.error("Induk belum dipilih", "Pilih salah satu dari 5 kategori utama.");
      return;
    }
    if (!subValue) {
      toast.error("Sub kategori belum dipilih", "Pilih sub yang ada atau buat baru.");
      return;
    }
    if (isCreatingNewSub && newSubName.trim().length < 2) {
      toast.error("Nama sub baru kosong", "Minimal 2 karakter.");
      return;
    }
    if (seriesName.trim().length < 2) {
      toast.error("Nama series/set kosong", "Tulis series/anime/brand yang ingin diajukan.");
      return;
    }

    // Two distinct request shapes — see the doc-comment at the top.
    const parentId = isCreatingNewSub ? indukId : subValue;
    const name = isCreatingNewSub ? newSubName.trim() : seriesName.trim();
    const description = isCreatingNewSub
      ? [
          `Series/Set pertama yang ingin di-list: ${seriesName.trim()}.`,
          desc.trim(),
        ].filter(Boolean).join("\n\n")
      : desc.trim();

    start(async () => {
      try {
        await api<{ id: string }>("/categories/requests", {
          method: "POST",
          body: {
            parentId,
            name,
            slugHint: slug.trim() || undefined,
            description: description || undefined,
          },
        });
        toast.success("Request terkirim", "Tim Hoobiq akan review dalam 1–2 hari.");
        setIndukId("");
        setSubValue("");
        setNewSubName("");
        setSeriesName("");
        setSlug("");
        setDesc("");
        onDone?.();
        router.refresh();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal kirim request.";
        toast.error("Gagal kirim request", msg);
      }
    });
  }

  const selectClass = "h-11 rounded-md border border-rule bg-panel px-3 text-sm text-fg focus:border-brand-400 focus:outline-none";

  // Inline the wrapper instead of declaring it inside the component
  // body — defining a component there gives it a fresh identity every
  // render, which makes React unmount + remount the entire input tree
  // on each keystroke. That was killing focus after every character.
  const inner = (
    <>
      {!inline && (
        <div>
          <h2 className="text-lg font-bold text-fg">Request kategori baru</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Belum ada sub-kategori atau series/anime/brand yang kamu cari? Ajukan
            di sini — admin review 1–2 hari, kalau di-approve langsung muncul
            untuk semua kolektor.
          </p>
        </div>
      )}

      <div className="grid gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Induk kategori</Label>
          <select
            value={indukId}
            onChange={(e) => setIndukId(e.target.value)}
            className={selectClass}
          >
            <option value="">— Pilih kategori utama —</option>
            {indukOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="text-[11px] text-fg-subtle">5 kategori utama Hoobiq.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Sub kategori</Label>
          <select
            value={subValue}
            onChange={(e) => setSubValue(e.target.value)}
            disabled={!indukId}
            className={selectClass + (indukId ? "" : " opacity-60")}
          >
            <option value="">{indukId ? "— Pilih sub kategori —" : "Pilih induk dulu"}</option>
            {subOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            {indukId && (
              <option value="__new__">+ Buat sub kategori baru</option>
            )}
          </select>

          {isCreatingNewSub && (
            <div className="mt-2 flex flex-col gap-1.5 rounded-lg border border-brand-400/30 bg-brand-400/5 p-3">
              <Label>Nama sub kategori baru</Label>
              <Input
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                maxLength={80}
                placeholder="Contoh: K-Pop Photocard"
              />
              <p className="text-[10px] text-fg-subtle">
                Admin akan buat sub baru ini di bawah induk. Series/set di bawah akan dipakai sebagai contoh awal.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Series / Set</Label>
          <Input
            value={seriesName}
            onChange={(e) => setSeriesName(e.target.value)}
            maxLength={80}
            placeholder="Contoh: Hatsune Miku, JoJo's Bizarre Adventure, Stray Kids - 5★ Star"
          />
          <p className="text-[11px] text-fg-subtle">
            Series/anime/brand spesifik yang mau kamu list barangnya.
          </p>
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

      <div className="flex justify-end gap-2">
        <Button type="button" variant="primary" size="sm" onClick={submit} disabled={pending}>
          {pending ? "Mengirim…" : "Kirim request"}
        </Button>
      </div>
    </>
  );

  return inline
    ? <div className="rounded-xl border border-rule bg-panel-2/40 p-4">{inner}</div>
    : <Card><div className="space-y-4 p-6">{inner}</div></Card>;
}
