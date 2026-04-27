"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";

/**
 * Dev-only "I have transferred" button. Calls the API's `dev-mark-paid`
 * endpoint (disabled in production) which fires `OrdersService.markPaid`
 * just like a real Midtrans webhook would. Then redirects to the order
 * detail page so the user sees the post-payment state immediately.
 */
export function PaymentSimulator({ humanId }: { humanId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function markPaid() {
    if (pending) return;
    setErr(null);
    setPending(true);
    try {
      await api(`/orders/${encodeURIComponent(humanId)}/dev-mark-paid`, { method: "POST" });
      router.push(`/pesanan/${encodeURIComponent(humanId)}`);
    } catch (e) {
      setErr(
        e instanceof ApiError ? e.message :
        e instanceof Error ? e.message :
        "Gagal menandai paid."
      );
      setPending(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col items-stretch gap-2">
      <Button variant="primary" size="lg" onClick={markPaid} disabled={pending}>
        {pending ? "Memverifikasi…" : "Tandai sudah bayar (simulasi)"}
      </Button>
      {err && (
        <p role="alert" className="text-center text-xs text-flame-600">{err}</p>
      )}
    </div>
  );
}
