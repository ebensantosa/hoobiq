"use client";
import * as React from "react";
import { Avatar, Button, Card } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";

export type Review = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  buyer: { username: string; name: string | null; avatarUrl: string | null; city: string | null };
  sellerReply: string | null;
  sellerReplyAt: string | null;
};

export type ReviewSummary = {
  avg: number | null;
  total: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

type ReviewStatus = {
  canReview: boolean;
  orderId: string | null;
  existingReview: { id: string; rating: number; body: string | null; createdAt: string } | null;
};

/**
 * Reviews section for the listing detail page. Lazy-loads the review list
 * + the current user's review eligibility on mount, then lets the user
 * submit a 1–5 star rating with optional body. Re-renders the list
 * optimistically after submit.
 */
export function ListingReviews({
  listingId, slug, isLoggedIn, isOwn,
}: {
  listingId: string;
  slug: string;
  isLoggedIn: boolean;
  isOwn: boolean;
}) {
  const [summary, setSummary]   = React.useState<ReviewSummary | null>(null);
  const [items, setItems]       = React.useState<Review[]>([]);
  const [status, setStatus]     = React.useState<ReviewStatus | null>(null);
  const [loading, setLoading]   = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<{ summary: ReviewSummary; items: Review[] }>(`/listings/${encodeURIComponent(slug)}/reviews`),
      isLoggedIn && !isOwn
        ? api<ReviewStatus>(`/listings/${encodeURIComponent(slug)}/my-review-status`).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([list, st]) => {
        if (cancelled) return;
        setSummary(list.summary);
        setItems(list.items);
        setStatus(st);
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, isLoggedIn, isOwn]);

  function onSubmitted(newReview: Review, isUpdate: boolean) {
    setShowForm(false);
    setItems((prev) => {
      const filtered = prev.filter((r) => r.id !== newReview.id);
      return [newReview, ...filtered];
    });
    setSummary((prev) => {
      const total = isUpdate ? (prev?.total ?? 1) : (prev?.total ?? 0) + 1;
      // We don't try to recompute avg locally — just bump total. A refresh
      // will pull the authoritative number.
      return prev ? { ...prev, total } : { avg: newReview.rating, total: 1, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, [newReview.rating]: 1 } as ReviewSummary["distribution"] };
    });
    setStatus((prev) => prev ? { ...prev, canReview: false, existingReview: { id: newReview.id, rating: newReview.rating, body: newReview.body, createdAt: newReview.createdAt } } : prev);
  }

  return (
    <section className="mt-10 border-t border-rule pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-fg">Review pembeli</h2>
          {summary && summary.total > 0 ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-fg-muted">
              <RatingStars value={summary.avg ?? 0} size="md" />
              <span className="font-mono font-semibold text-fg">{summary.avg?.toFixed(1) ?? "—"}</span>
              <span>·</span>
              <span>{summary.total} review</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-fg-muted">Belum ada review.</p>
          )}
        </div>
        {isLoggedIn && !isOwn && status?.canReview && (
          <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Batal" : "Tulis review"}
          </Button>
        )}
        {isLoggedIn && !isOwn && status?.existingReview && !showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            Edit reviewku
          </Button>
        )}
      </div>

      {summary && summary.total > 0 && (
        <div className="mt-4 max-w-md">
          <RatingDistribution dist={summary.distribution} total={summary.total} />
        </div>
      )}

      {showForm && status?.orderId && (
        <ReviewForm
          listingId={listingId}
          orderId={status.orderId}
          existing={status.existingReview ?? undefined}
          onDone={onSubmitted}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="mt-6 flex flex-col gap-3">
        {loading ? (
          <p className="text-sm text-fg-subtle">Memuat review…</p>
        ) : items.length === 0 ? (
          <Card>
            <div className="p-5 text-center text-sm text-fg-muted">
              {isOwn
                ? "Belum ada review. Pembeli bisa kasih review setelah pesanan selesai."
                : isLoggedIn
                ? "Jadilah yang pertama review listing ini setelah pembelian."
                : "Belum ada review dari pembeli."}
            </div>
          </Card>
        ) : (
          items.map((r) => (
            <ReviewItem
              key={r.id}
              review={r}
              listingId={listingId}
              canReply={isOwn}
              onReplied={(reply, repliedAt) =>
                setItems((prev) =>
                  prev.map((it) => (it.id === r.id ? { ...it, sellerReply: reply, sellerReplyAt: repliedAt } : it)),
                )
              }
            />
          ))
        )}
      </div>
    </section>
  );
}

/* ---------------- form ---------------- */

function ReviewForm({
  listingId, orderId, existing, onDone, onCancel,
}: {
  listingId: string;
  orderId: string;
  existing?: { id: string; rating: number; body: string | null };
  onDone: (review: Review, isUpdate: boolean) => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = React.useState<number>(existing?.rating ?? 0);
  const [body, setBody]     = React.useState<string>(existing?.body ?? "");
  const [pending, setPending] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) { setErr("Pilih bintang dulu."); return; }
    setPending(true); setErr(null);
    try {
      const res = await api<{ id: string; updated: boolean }>(
        `/listings/${encodeURIComponent(listingId)}/reviews`,
        { method: "POST", body: { orderId, rating, body: body.trim() || undefined } }
      );
      onDone(
        {
          id: res.id,
          rating,
          body: body.trim() || null,
          createdAt: new Date().toISOString(),
          buyer: { username: "kamu", name: null, avatarUrl: null, city: null },
          sellerReply: null,
          sellerReplyAt: null,
        },
        res.updated
      );
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal kirim review.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-2xl border border-brand-400/30 bg-brand-400/5 p-5">
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold text-fg">{existing ? "Edit review" : "Beri rating"}</p>
        <RatingPicker value={rating} onChange={setRating} />
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Cerita pengalaman kamu — packing, akurasi deskripsi, kondisi barang… (opsional)"
        maxLength={1000}
        rows={4}
        className="mt-4 w-full resize-none rounded-xl border border-rule bg-panel px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/15"
      />
      {err && (
        <p role="alert" className="mt-2 text-xs text-flame-600">{err}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-[11px] text-fg-subtle">{body.length} / 1000</span>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>Batal</Button>
          <Button type="submit" variant="primary" size="sm" disabled={pending || rating < 1}>
            {pending ? "Mengirim…" : existing ? "Simpan" : "Kirim review"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ---------------- review item ---------------- */

function ReviewItem({
  review, listingId, canReply, onReplied,
}: {
  review: Review;
  listingId: string;
  canReply: boolean;
  onReplied: (reply: string, repliedAt: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(review.sellerReply ?? "");
  const [pending, setPending] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function submitReply() {
    const trimmed = draft.trim();
    if (!trimmed) { setErr("Tulis balasan dulu."); return; }
    setPending(true); setErr(null);
    try {
      const res = await api<{ sellerReply: string; sellerReplyAt: string }>(
        `/listings/${encodeURIComponent(listingId)}/reviews/${encodeURIComponent(review.id)}/reply`,
        { method: "POST", body: { body: trimmed } },
      );
      onReplied(res.sellerReply, res.sellerReplyAt);
      setEditing(false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal kirim balasan.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <div className="flex gap-4 p-5">
        <Avatar
          letter={review.buyer.username[0]?.toUpperCase() ?? "U"}
          size="md"
          src={review.buyer.avatarUrl ?? null}
          alt={`Avatar @${review.buyer.username}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-sm font-semibold text-fg">
              {review.buyer.name ?? `@${review.buyer.username}`}
            </p>
            {review.buyer.city && (
              <span className="text-xs text-fg-subtle">{review.buyer.city}</span>
            )}
            <span className="ml-auto text-xs text-fg-subtle">{relTime(review.createdAt)}</span>
          </div>
          <RatingStars value={review.rating} size="sm" className="mt-1" />
          {review.body && (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-fg">
              {review.body}
            </p>
          )}

          {/* Existing seller reply */}
          {review.sellerReply && !editing && (
            <div className="mt-3 rounded-xl border border-brand-400/25 bg-brand-400/[0.06] px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-brand-500">Balasan seller</span>
                {review.sellerReplyAt && (
                  <span className="text-[11px] text-fg-subtle">{relTime(review.sellerReplyAt)}</span>
                )}
              </div>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-fg">
                {review.sellerReply}
              </p>
              {canReply && (
                <button
                  type="button"
                  onClick={() => { setDraft(review.sellerReply ?? ""); setEditing(true); }}
                  className="mt-2 text-xs font-semibold text-brand-500 hover:underline"
                >
                  Edit balasan
                </button>
              )}
            </div>
          )}

          {/* Reply CTA when none yet */}
          {canReply && !review.sellerReply && !editing && (
            <button
              type="button"
              onClick={() => { setDraft(""); setEditing(true); }}
              className="mt-3 text-xs font-semibold text-brand-500 hover:underline"
            >
              Balas review
            </button>
          )}

          {/* Reply form */}
          {canReply && editing && (
            <div className="mt-3 rounded-xl border border-brand-400/30 bg-brand-400/5 p-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Balas review pembeli — terima kasih, klarifikasi, atau info tambahan."
                maxLength={1000}
                rows={3}
                className="w-full resize-none rounded-lg border border-rule bg-panel px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/15"
              />
              {err && <p role="alert" className="mt-1 text-xs text-flame-600">{err}</p>}
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[11px] text-fg-subtle">{draft.length} / 1000</span>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                    Batal
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={submitReply} disabled={pending || !draft.trim()}>
                    {pending ? "Mengirim…" : "Kirim balasan"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ---------------- stars ---------------- */

function RatingStars({ value, size = "md", className }: { value: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const px = size === "sm" ? 12 : size === "lg" ? 20 : 14;
  return (
    <span className={"inline-flex items-center gap-0.5 " + (className ?? "")}>
      {[1, 2, 3, 4, 5].map((n) => {
        const full = value >= n;
        const half = !full && value >= n - 0.5;
        return (
          <svg key={n} width={px} height={px} viewBox="0 0 24 24" className={full || half ? "text-amber-400" : "text-fg/15"}>
            {half ? (
              <>
                <defs>
                  <linearGradient id={`half-${n}`}>
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="rgba(0,0,0,0)" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2 14.6 8.4 21.5 9 16.3 13.6 17.9 20.5 12 17 6.1 20.5 7.7 13.6 2.5 9 9.4 8.4Z"
                  fill={`url(#half-${n})`}
                  stroke="currentColor"
                  strokeWidth="0.8"
                />
              </>
            ) : (
              <path
                d="M12 2 14.6 8.4 21.5 9 16.3 13.6 17.9 20.5 12 17 6.1 20.5 7.7 13.6 2.5 9 9.4 8.4Z"
                fill="currentColor"
              />
            )}
          </svg>
        );
      })}
    </span>
  );
}

function RatingPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = React.useState(0);
  const display = hover || value;
  return (
    <span className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} bintang`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className="rounded p-0.5 transition-transform hover:scale-110"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" className={display >= n ? "text-amber-400" : "text-fg/20"}>
            <path d="M12 2 14.6 8.4 21.5 9 16.3 13.6 17.9 20.5 12 17 6.1 20.5 7.7 13.6 2.5 9 9.4 8.4Z" fill="currentColor" />
          </svg>
        </button>
      ))}
    </span>
  );
}

/* ---------------- distribution bar ---------------- */

function RatingDistribution({ dist, total }: { dist: ReviewSummary["distribution"]; total: number }) {
  return (
    <div className="space-y-1.5">
      {([5, 4, 3, 2, 1] as const).map((n) => {
        const count = dist[n];
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={n} className="flex items-center gap-2 text-xs">
            <span className="w-3 font-mono text-fg-muted">{n}</span>
            <span className="text-amber-400">★</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/[0.08]">
              <span className="block h-full bg-amber-400" style={{ width: `${pct}%` }} />
            </span>
            <span className="w-8 text-right font-mono text-[11px] tabular-nums text-fg-subtle">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j`;
  const d = Math.floor(h / 24);
  return d <= 6 ? `${d}h` : new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
