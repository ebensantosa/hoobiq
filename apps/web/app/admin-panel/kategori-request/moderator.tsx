"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { useToast } from "@/components/toast-provider";

type RequestItem = {
  id: string;
  name: string;
  slugHint: string | null;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  rejectNote: string | null;
  parent: { slug: string; name: string; level: number };
  user:   { username: string; name: string | null; avatarUrl: string | null };
  createdAt: string;
  decidedAt: string | null;
};

/**
 * Admin queue for pending sub-category requests. Approve = inline slug
 * editor + POST /categories/requests/:id/approve; reject = small note
 * dialog. After either action the row vanishes from the pending list
 * and the tree cache is busted server-side, so the new sub-category
 * shows up on /kategori on the next render.
 */
export function CategoryRequestsModerator({
  initial,
  status,
}: {
  initial: RequestItem[];
  status: string;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);

  React.useEffect(() => { setItems(initial); }, [initial]);

  const tabs = [
    { key: "pending",  label: "Menunggu" },
    { key: "approved", label: "Disetujui" },
    { key: "rejected", label: "Ditolak" },
  ];

  return (
    <div className="mt-6">
      <div className="flex items-center gap-1 border-b border-rule">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin-panel/kategori-request?status=${t.key}`}
            className={
              "border-b-2 px-3 py-2 text-sm font-semibold transition-colors " +
              (t.key === status
                ? "border-brand-400 text-brand-500"
                : "border-transparent text-fg-muted hover:text-fg")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="mt-6 rounded-md border border-rule bg-panel/40 p-8 text-center text-sm text-fg-muted">
          Tidak ada request {status === "pending" ? "menunggu review" : status === "approved" ? "yang disetujui" : "yang ditolak"}.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {items.map((r) => (
            <Row
              key={r.id}
              item={r}
              onChange={() => {
                setItems((prev) => prev.filter((i) => i.id !== r.id));
                router.refresh();
              }}
              status={status}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ item, onChange, status }: { item: RequestItem; onChange: () => void; status: string }) {
  const toast = useToast();
  const [slug, setSlug] = React.useState(item.slugHint ?? slugify(item.name));
  const [name, setName] = React.useState(item.name);
  const [note, setNote] = React.useState("");
  const [mode, setMode] = React.useState<"idle" | "rejecting">("idle");
  const [pending, start] = React.useTransition();

  function approve() {
    start(async () => {
      try {
        await api(`/categories/requests/${item.id}/approve`, {
          method: "POST",
          body: { slug, name },
        });
        toast.success("Kategori disetujui", `${name} sekarang aktif.`);
        onChange();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal approve.";
        toast.error("Gagal approve", msg);
      }
    });
  }

  function reject() {
    if (note.trim().length < 2) {
      toast.error("Catatan kosong", "Tulis alasan penolakan untuk user.");
      return;
    }
    start(async () => {
      try {
        await api(`/categories/requests/${item.id}/reject`, {
          method: "POST",
          body: { note: note.trim() },
        });
        toast.success("Request ditolak", "User akan lihat catatan kamu.");
        onChange();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal reject.";
        toast.error("Gagal reject", msg);
      }
    });
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
            <span className="font-mono uppercase tracking-[0.18em]">
              {new Date(item.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span>· dari {item.user.name ?? `@${item.user.username}`}</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-fg">{item.name}</p>
          <p className="text-xs text-fg-muted">
            Induk: <span className="font-mono">{item.parent.name}</span>
            {item.parent.level === 1 ? " (level 1)" : " (level 2)"}
          </p>
          {item.description && (
            <p className="mt-2 text-sm text-fg-muted">“{item.description}”</p>
          )}
          {status === "rejected" && item.rejectNote && (
            <p className="mt-2 rounded-md border border-flame-400/30 bg-flame-400/5 px-3 py-2 text-xs text-flame-600">
              <span className="font-semibold">Ditolak:</span> {item.rejectNote}
            </p>
          )}
        </div>

        {status === "pending" && (
          <div className="w-full max-w-md space-y-3">
            {mode === "idle" ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">Slug</label>
                    <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">Nama final</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setMode("rejecting")} disabled={pending}>
                    Tolak
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={approve} disabled={pending}>
                    {pending ? "Approving…" : "Approve"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">Catatan penolakan</label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Sudah ada di kategori X / nama tidak jelas / dll"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setMode("idle")} disabled={pending}>
                    Batal
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={reject} disabled={pending}>
                    {pending ? "Rejecting…" : "Konfirmasi tolak"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
