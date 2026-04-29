"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { useToast } from "@/components/toast-provider";

export type PayoutRow = {
  id: string;
  amountIdr: number;
  status: string;
  opsNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  paidAt: string | null;
  user: { id: string; username: string; name: string | null; email: string };
  bank: { id: string; bank: string; numberLast4: string; holderName: string } | null;
};

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export function PayoutQueue({ initial, status }: { initial: PayoutRow[]; status: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = React.useTransition();

  function decide(id: string, decision: "approve" | "reject" | "mark_paid") {
    const note = decision === "reject" ? window.prompt("Alasan penolakan:")?.trim() : undefined;
    if (decision === "reject" && !note) return;
    start(async () => {
      try {
        await api(`/payouts/${encodeURIComponent(id)}/decide`, {
          method: "POST",
          body: { decision, note },
        });
        toast.success("Berhasil", "Status diperbarui.");
        router.refresh();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal";
        toast.error("Gagal update", msg);
      }
    });
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap gap-1 border-b border-rule px-4 pt-3">
        {TABS.map((t) => (
          <a
            key={t.value}
            href={`/admin-panel/payout?status=${t.value}`}
            className={
              "rounded-t-md px-4 py-2 text-sm font-medium transition-colors " +
              (status === t.value
                ? "bg-panel text-fg shadow-sm"
                : "text-fg-muted hover:text-fg")
            }
          >
            {t.label}
          </a>
        ))}
      </div>

      {initial.length === 0 ? (
        <div className="p-10 text-center text-sm text-fg-muted">Tidak ada data.</div>
      ) : (
        <div>
          {initial.map((r) => (
            <div key={r.id} className="grid grid-cols-1 gap-3 border-b border-rule/60 px-5 py-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
              <div>
                <p className="text-base font-bold text-fg">Rp {r.amountIdr.toLocaleString("id-ID")}</p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {r.user.name ?? `@${r.user.username}`} · @{r.user.username} · {r.user.email}
                </p>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  {new Date(r.createdAt).toLocaleString("id-ID")}
                </p>
              </div>
              <div className="text-sm">
                {r.bank ? (
                  <>
                    <p className="font-mono">{r.bank.bank} •••• {r.bank.numberLast4}</p>
                    <p className="text-xs text-fg-muted">{r.bank.holderName}</p>
                  </>
                ) : (
                  <p className="text-xs text-fg-subtle">Rekening tidak ditemukan</p>
                )}
                {r.opsNote && <p className="mt-1 text-xs text-flame-500">Note: {r.opsNote}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {r.status === "pending" && (
                  <>
                    <Button size="sm" variant="primary" disabled={pending} onClick={() => decide(r.id, "approve")}>Approve</Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => decide(r.id, "reject")}>Reject</Button>
                  </>
                )}
                {r.status === "approved" && (
                  <>
                    <Button size="sm" variant="primary" disabled={pending} onClick={() => decide(r.id, "mark_paid")}>Mark paid</Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => decide(r.id, "reject")}>Reject</Button>
                  </>
                )}
                {(r.status === "paid" || r.status === "rejected" || r.status === "cancelled") && (
                  <span className="text-xs text-fg-subtle">{r.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
