"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@hoobiq/ui";
import { api } from "@/lib/api/client";

type AdminReview = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  listing: { id: string; slug: string; title: string };
  buyer: { id: string; username: string; name: string | null };
};

export function ReviewsModerator({ initial }: { initial: AdminReview[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function handleDelete(r: AdminReview) {
    if (!confirm(`Hapus review dari @${r.buyer.username} untuk "${r.listing.title}"? Tidak bisa di-undo.`)) return;
    setErr(null);
    try {
      await api(`/admin/reviews/${r.id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }

  return (
    <div className="mt-8 max-w-5xl">
      <p className="text-sm text-fg-muted">{initial.length} review · 100 terbaru</p>
      {err && <p className="mt-3 text-sm text-crim-400">{err}</p>}

      {initial.length === 0 ? (
        <Card className="mt-4">
          <div className="p-10 text-center text-sm text-fg-muted">Belum ada review.</div>
        </Card>
      ) : (
        <Card className="mt-4">
          {initial.map((r, i) => (
            <React.Fragment key={r.id}>
              <div
                className={
                  "grid gap-4 px-5 py-4 lg:grid-cols-[2fr_1fr_auto] lg:items-start " +
                  (i < initial.length - 1 ? "border-b border-rule/60" : "")
                }
              >
                <div className="min-w-0">
                  <Link
                    href={`/listing/${r.listing.slug}`}
                    className="truncate text-sm font-semibold text-fg hover:text-brand-500"
                  >
                    {r.listing.title}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-fg-subtle">
                    Oleh{" "}
                    <Link href={`/u/${r.buyer.username}`} className="hover:text-brand-500">
                      @{r.buyer.username}
                    </Link>
                    {" · "}
                    {new Date(r.createdAt).toLocaleString("id-ID")}
                    {r.updatedAt !== r.createdAt && (
                      <span className="ml-2 italic text-fg-muted">(edited)</span>
                    )}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="font-mono text-xs tabular-nums text-fg-muted">{r.rating}/5</span>
                  </div>
                  {r.body && (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-fg">{r.body}</p>
                  )}
                </div>

                <div className="text-xs text-fg-subtle lg:text-right">
                  <p className="font-mono uppercase tracking-widest">ID</p>
                  <p className="mt-1 font-mono text-fg-muted">{r.id.slice(0, 8)}…</p>
                </div>

                <div className="flex justify-end gap-3 text-xs">
                  <button
                    onClick={() => setEditing(editing === r.id ? null : r.id)}
                    className="text-fg-muted hover:text-brand-400"
                  >
                    {editing === r.id ? "Tutup" : "Edit"}
                  </button>
                  <button onClick={() => handleDelete(r)} className="text-fg-muted hover:text-crim-400">
                    Hapus
                  </button>
                </div>
              </div>

              {editing === r.id && (
                <div className="border-b border-rule/60 bg-panel/30 px-5 py-4">
                  <ReviewForm
                    initial={r}
                    onCancel={() => setEditing(null)}
                    onSaved={() => { setEditing(null); router.refresh(); }}
                    onError={(m) => setErr(m)}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </Card>
      )}
    </div>
  );
}

function ReviewForm({
  initial, onCancel, onSaved, onError,
}: {
  initial: AdminReview;
  onCancel: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [rating, setRating] = React.useState<number>(initial.rating);
  const [body, setBody]     = React.useState<string>(initial.body ?? "");
  const [busy, setBusy]     = React.useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api(`/admin/reviews/${initial.id}`, {
        method: "PATCH",
        body: { rating, body: body.trim() || null },
      });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-fg-subtle">Rating</p>
        <div className="mt-1.5 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="rounded p-0.5 transition-transform hover:scale-110"
              aria-label={`${n} bintang`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" className={rating >= n ? "text-amber-400" : "text-fg/20"}>
                <path d="M12 2 14.6 8.4 21.5 9 16.3 13.6 17.9 20.5 12 17 6.1 20.5 7.7 13.6 2.5 9 9.4 8.4Z" fill="currentColor" />
              </svg>
            </button>
          ))}
          <span className="ml-2 font-mono text-xs tabular-nums text-fg-muted">{rating}/5</span>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-fg-subtle">Body</p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={2000}
          className="mt-1.5 w-full resize-none rounded-xl border border-rule bg-panel px-3 py-2 text-sm text-fg focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/15"
          placeholder="Boleh kosong — server menyimpan null kalau dikosongin."
        />
        <p className="mt-1 font-mono text-[11px] text-fg-subtle">{body.length} / 2000</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Batal</Button>
        <Button variant="primary" size="sm" onClick={submit} disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="14" height="14" viewBox="0 0 24 24" className={value >= n ? "text-amber-400" : "text-fg/15"}>
          <path d="M12 2 14.6 8.4 21.5 9 16.3 13.6 17.9 20.5 12 17 6.1 20.5 7.7 13.6 2.5 9 9.4 8.4Z" fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}
