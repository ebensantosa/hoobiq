"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";

/**
 * Polls /orders/:humanId every 4s while the buyer waits. The Komerce
 * webhook is the primary path for flipping the order to "paid" — this is
 * a fallback so the wait tab doesn't sit stale if:
 *   - Komerce's hosted page doesn't honor `return_url` (sandbox often
 *     doesn't), so the buyer never bounces back automatically.
 *   - The buyer paid in another tab and switched back here.
 *   - The webhook is delayed and SSR's first render still saw "pending_payment".
 *
 * Once status changes from `pending_payment`, we navigate to /pesanan/:id.
 * Keeping the request small (just status) keeps the poll cheap.
 */
export function PaymentStatusPoller({ humanId }: { humanId: string }) {
  const router = useRouter();

  React.useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (!alive) return;
      try {
        // Active reconciliation: the API will query Komerce
        // GET /user/payment/status/{payment_id} and mark the order paid
        // if Komerce reports it as paid. Komerce rate-limits this to
        // 1 req / 3s per payment_id, so we tick at 4s.
        const data = await api<{ status: string }>(
          `/payments/komerce/reconcile`,
          { method: "POST", body: { orderHumanId: humanId } },
        );
        if (!alive) return;
        if (data?.status && data.status !== "pending_payment") {
          router.replace(`/pesanan/${encodeURIComponent(humanId)}`);
          return;
        }
      } catch {
        // Network blip / 4xx is fine — try again on next tick.
      }
      timer = setTimeout(tick, 4000);
    };

    timer = setTimeout(tick, 4000);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [humanId, router]);

  return null;
}
