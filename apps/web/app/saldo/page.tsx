import { AppShell } from "@/components/app-shell";
import { Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";

export const dynamic = "force-dynamic";

type Wallet = {
  availableIdr: number;
  escrowIdr: number;
  recent: Array<{
    id: string;
    kind: "in" | "out";
    status: string;
    amountIdr: number;
    date: string;
  }>;
};

const statusLabel: Record<string, string> = {
  pending_payment: "Menunggu bayar",
  paid: "Dibayar",
  awaiting_pickup: "Diproses",
  shipped: "Dikirim",
  delivered: "Sampai",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refunded: "Refunded",
  disputed: "Dispute",
  expired: "Expired",
};

export default async function SaldoPage() {
  const w = await serverApi<Wallet>("/wallet");
  const available = w?.availableIdr ?? 0;
  const escrow    = w?.escrowIdr ?? 0;

  return (
    <AppShell active="Marketplace">
      <div className="px-6 pb-8 lg:px-10">
        <header className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Hoobiq Pay</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Saldo kamu, dana di escrow, dan riwayat transaksi.
          </p>
        </header>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Card className="md:col-span-2 border-brand-400/30 bg-brand-400/5">
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
                Saldo siap ditarik
              </p>
              <p className="mt-3 text-5xl font-bold text-fg">Rp {available.toLocaleString("id-ID")}</p>
              <p className="mt-2 text-xs text-fg-muted">
                Payout ke rekening bank tiba dalam 1×24 jam hari kerja. Minimum tarik Rp 50.000.
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
                Dalam escrow
              </p>
              <p className="mt-3 text-3xl font-bold text-fg">Rp {escrow.toLocaleString("id-ID")}</p>
              <p className="mt-2 text-xs text-fg-muted">Dana yang ditahan menunggu konfirmasi pembeli.</p>
            </div>
          </Card>
        </div>

        <h2 className="mt-10 text-xl font-semibold text-fg">Riwayat</h2>
        {(w?.recent ?? []).length === 0 ? (
          <div className="mt-4 rounded-2xl border border-rule bg-panel/40 p-10 text-center text-sm text-fg-muted">
            Belum ada transaksi.
          </div>
        ) : (
          <Card className="mt-4">
            {(w!.recent).map((t, i, arr) => (
              <div
                key={t.id}
                className={
                  "flex items-center justify-between gap-4 px-5 py-3 text-sm " +
                  (i < arr.length - 1 ? "border-b border-rule/60" : "")
                }
              >
                <div className="min-w-0 flex-1">
                  <p className="text-fg">
                    {t.kind === "in" ? "Pemasukan" : "Pengeluaran"} · {statusLabel[t.status] ?? t.status}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-subtle">
                    {t.id} · {new Date(t.date).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <p className={"font-mono font-medium " + (t.kind === "in" ? "text-brand-500" : "text-flame-500")}>
                  {t.kind === "in" ? "+" : "-"}Rp {t.amountIdr.toLocaleString("id-ID")}
                </p>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
