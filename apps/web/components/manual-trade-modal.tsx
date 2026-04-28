"use client";
import * as React from "react";
import { Button, Card } from "@hoobiq/ui";
import { api } from "@/lib/api/client";

type Mini = {
  id: string;
  slug: string;
  title: string;
  priceIdr: number;
  cover: string | null;
  condition: string;
};

type MyListing = Mini & { isPublished: boolean; moderation: string };

/**
 * Manual trade proposal — for when wishlist matching returns nothing but
 * both users have items they're willing to trade. Independent of the
 * deck's two-sided wishlist requirement; talks straight to /trades/propose.
 *
 * Flow:
 *   - Open: fetches both /listings/mine (filtered to live, in-stock) and
 *     /users/:username/collection in parallel.
 *   - Pick one from each side + optional message.
 *   - Submit → POST /trades/propose. Counterparty gets a notification and
 *     the proposal shows up in their /trades/inbox.
 */
export function ManualTradeModal({
  open,
  onClose,
  targetUsername,
}: {
  open: boolean;
  onClose: () => void;
  targetUsername: string;
}) {
  const [mine, setMine]       = React.useState<MyListing[] | null>(null);
  const [theirs, setTheirs]   = React.useState<Mini[] | null>(null);
  const [pickMine, setPickMine] = React.useState<string | null>(null);
  const [pickTheirs, setPickTheirs] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  // Lazy-load so we don't fetch until the modal actually opens.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setErr(null); setDone(false); setPickMine(null); setPickTheirs(null);
    (async () => {
      try {
        const [m, t] = await Promise.all([
          api<{ items: MyListing[] }>("/listings/mine"),
          api<{ items: Mini[] }>(`/users/${encodeURIComponent(targetUsername)}/collection`),
        ]);
        if (cancelled) return;
        // Only listings that are publicly visible can be proposed — mirrors
        // the API guard (mine must be active+published, theirs must be a
        // valid live listing).
        setMine(m.items.filter((l) => l.isPublished && l.moderation === "active"));
        setTheirs(t.items);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Gagal memuat.");
      }
    })();
    return () => { cancelled = true; };
  }, [open, targetUsername]);

  async function submit() {
    if (!pickMine || !pickTheirs || submitting) return;
    setSubmitting(true); setErr(null);
    try {
      await api("/trades/propose", {
        method: "POST",
        body: { fromListingId: pickMine, toListingId: pickTheirs, message: message.trim() || undefined },
      });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal mengirim proposal.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-rule bg-canvas shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-rule px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-fg">Propose trade ke @{targetUsername}</h2>
            <p className="mt-1 text-sm text-fg-muted">Pilih barang kamu untuk ditukar dengan barangnya.</p>
          </div>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">✕</button>
        </div>

        {done ? (
          <div className="p-10 text-center">
            <p className="text-base font-semibold text-fg">Proposal terkirim ✓</p>
            <p className="mt-2 text-sm text-fg-muted">@{targetUsername} akan dapat notifikasi. Lihat status di tab "Inbox" /trades.</p>
            <Button variant="primary" size="md" className="mt-5" onClick={onClose}>Tutup</Button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 p-6 md:grid-cols-2">
              <Column
                title="Barang kamu (yang ditawarkan)"
                hint="Hanya listing aktif yang bisa di-trade"
                items={mine}
                pick={pickMine}
                onPick={setPickMine}
                emptyText="Kamu belum punya listing aktif. Upload dulu di /jual."
              />
              <Column
                title={`Barang @${targetUsername} (yang diminta)`}
                items={theirs}
                pick={pickTheirs}
                onPick={setPickTheirs}
                emptyText={`@${targetUsername} belum punya listing publik.`}
              />
            </div>

            <div className="border-t border-rule px-6 py-5">
              <label className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Pesan (opsional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Halo, mau tukar yang ini sama yang itu yuk…"
                maxLength={500}
                className="mt-2 w-full rounded-lg border border-rule bg-panel px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400/60 focus:outline-none"
              />
              {err && <p role="alert" className="mt-3 text-sm text-flame-600">{err}</p>}
              <div className="mt-4 flex items-center justify-end gap-3">
                <Button variant="ghost" size="md" onClick={onClose}>Batal</Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={submit}
                  disabled={!pickMine || !pickTheirs || submitting}
                >
                  {submitting ? "Mengirim…" : "Kirim proposal"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Column({
  title, hint, items, pick, onPick, emptyText,
}: {
  title: string;
  hint?: string;
  items: Mini[] | null;
  pick: string | null;
  onPick: (id: string) => void;
  emptyText: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{title}</p>
      {hint && <p className="mt-1 text-[11px] text-fg-subtle">{hint}</p>}
      {items === null ? (
        <Card className="mt-3"><div className="p-5 text-center text-sm text-fg-muted">Memuat…</div></Card>
      ) : items.length === 0 ? (
        <Card className="mt-3"><div className="p-5 text-center text-sm text-fg-muted">{emptyText}</div></Card>
      ) : (
        <div className="mt-3 max-h-[40vh] space-y-2 overflow-y-auto pr-1">
          {items.map((it) => (
            <button
              type="button"
              key={it.id}
              onClick={() => onPick(it.id)}
              className={
                "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors " +
                (pick === it.id
                  ? "border-brand-400 bg-brand-400/5"
                  : "border-rule bg-panel hover:border-brand-400/40")
              }
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-panel-2">
                {it.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.cover} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-400/20 to-flame-400/15" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{it.title}</p>
                <p className="truncate text-xs text-fg-subtle">
                  Rp {it.priceIdr.toLocaleString("id-ID")} · {it.condition.replace("_", " ")}
                </p>
              </div>
              {pick === it.id && (
                <span className="font-mono text-[11px] font-semibold text-brand-500">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
