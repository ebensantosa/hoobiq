"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";

/**
 * Background reconciler for the buyer's order list. For every order
 * currently sitting in pending_payment, it asks the API to query Komerce
 * GET /user/payment/status/{payment_id} and flip the order to paid if
 * Komerce reports it as paid.
 *
 * Why this lives on /pesanan: the wait page's poller only runs while the
 * buyer is sitting on /checkout/wait. After paying, the sandbox doesn't
 * auto-redirect, so the buyer often navigates here directly — this is
 * where they need to see "paid" without manually refreshing.
 *
 * Cost: one POST per pending order on mount + one set after a 4s delay
 * (in case the buyer just paid seconds ago). Reconcile is a no-op when
 * Komerce still says "pending", and Komerce rate-limits to 1 req/3s per
 * payment_id, so this is cheap.
 */
export function PendingOrdersReconciler({ humanIds }: { humanIds: string[] }) {
  const router = useRouter();

  React.useEffect(() => {
    if (humanIds.length === 0) return;
    let alive = true;

    const reconcileAll = async () => {
      const results = await Promise.allSettled(
        humanIds.map((id) =>
          api<{ status: string; reconciled: boolean }>(`/payments/komerce/reconcile`, {
            method: "POST",
            body: { orderHumanId: id },
          }),
        ),
      );
      if (!alive) return;
      const anyPaid = results.some(
        (r) => r.status === "fulfilled" && r.value?.reconciled,
      );
      if (anyPaid) router.refresh();
    };

    reconcileAll();
    const t = setTimeout(reconcileAll, 4000);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [humanIds.join(","), router]);

  return null;
}
