"use client";
import * as React from "react";
import { api, ApiError } from "@/lib/api/client";
import { Spinner } from "@/components/spinner";

/**
 * "Bayar sekarang" affordance on a pending_payment order row in the
 * /pesanan list. Hits POST /orders/:humanId/resume-pay to re-create
 * a Snap charge for the existing order, then redirects the buyer to
 * the Snap URL. Used by buyers who paid the first leg of a multi-item
 * checkout and bounced — this lets them clear the rest one by one.
 */
export function PayButton({ humanId }: { humanId: string }) {
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);

  function go(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setErr(null);
    start(async () => {
      try {
        const res = await api<{ paymentRedirectUrl: string }>(
          `/orders/${encodeURIComponent(humanId)}/resume-pay`,
          { method: "POST" },
        );
        window.location.href = res.paymentRedirectUrl;
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal buka pembayaran.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand-500 px-3 text-xs font-bold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <Spinner size={11} /> : null}
        {pending ? "Membuka…" : "Bayar sekarang"}
      </button>
      {err && <p className="text-[10px] text-flame-600">{err}</p>}
    </div>
  );
}
