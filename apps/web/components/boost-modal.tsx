"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { useToast } from "./toast-provider";

type Tier = {
  id: string;
  durationDays: number;
  priceIdr: number;
  priceCents: number;
  label: string;
};
type Status = {
  active: boolean;
  boostedUntil: string | null;
  remainingDays: number;
};

/**
 * Boost-listing modal triggered from the seller's view of /listing/[id].
 * Pulls live tier pricing + current boost status from
 * GET /listings/:id/boost, lets the seller pick a tier, and POSTs to
 * /listings/:id/boost — server returns a Midtrans Snap redirect URL
 * that we send the browser to. When Snap finishes the buyer bounces
 * back via callbacks.finish (set in BoostService.buy).
 */
export function BoostModal({
  listingId,
  open,
  onClose,
}: {
  listingId: string;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [tiers, setTiers] = React.useState<Tier[]>([]);
  const [status, setStatus] = React.useState<Status | null>(null);
  const [picked, setPicked] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    api<{ tiers: Tier[]; status: Status }>(`/listings/${encodeURIComponent(listingId)}/boost`)
      .then((res) => {
        setTiers(res.tiers);
        setStatus(res.status);
        if (res.tiers[0]) setPicked(res.tiers[0].id);
      })
      .catch(() => toast.error("Gagal memuat paket boost", "Coba lagi nanti."))
      .finally(() => setLoading(false));
  }, [open, listingId, toast]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  function buy() {
    if (!picked) return;
    start(async () => {
      try {
        const res = await api<{ redirectUrl: string | null }>(
          `/listings/${encodeURIComponent(listingId)}/boost`,
          { method: "POST", body: { tierId: picked } },
        );
        if (res.redirectUrl) {
          window.location.href = res.redirectUrl;
        } else {
          toast.error("Gagal mulai pembayaran", "Coba lagi atau hubungi admin.");
        }
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal membeli boost.";
        toast.error("Gagal membeli boost", msg);
      }
    });
  }

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="boost-title"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-panel shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-rule px-5 py-4">
          <div>
            <p id="boost-title" className="text-base font-bold text-fg">⚡ Boost listing</p>
            <p className="text-xs text-fg-muted">Listing kamu naik di home + marketplace + kategori.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-panel-2 hover:text-fg"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {status?.active && (
          <div className="border-b border-rule bg-flame-400/5 px-5 py-3 text-xs text-flame-700 dark:text-flame-400">
            Listing kamu sedang di-boost — sisa {status.remainingDays} hari. Pembelian baru akan
            menambah durasi setelah boost yang sekarang habis.
          </div>
        )}

        <div className="flex flex-col gap-2 p-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-fg-muted">Memuat paket…</p>
          ) : tiers.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPicked(t.id)}
              className={
                "flex items-center justify-between rounded-xl border p-4 text-left transition-colors " +
                (picked === t.id
                  ? "border-brand-400 bg-brand-400/10"
                  : "border-rule hover:border-brand-400/60 hover:bg-panel-2")
              }
            >
              <div>
                <p className="text-base font-bold text-fg">{t.label}</p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {t.durationDays} hari · Rp {Math.round(t.priceIdr / t.durationDays).toLocaleString("id-ID")}/hari
                </p>
              </div>
              <p className="text-lg font-extrabold text-fg">Rp {t.priceIdr.toLocaleString("id-ID")}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-rule p-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button type="button" variant="primary" size="md" onClick={buy} disabled={pending || !picked}>
            {pending ? "Memproses…" : "Beli & bayar"}
          </Button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(node, document.body) : null;
}
