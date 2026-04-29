import { AppShell } from "@/components/app-shell";
import { Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";
import { WithdrawTrigger } from "@/components/withdraw-modal";

type Ktp = { status: string; verified: boolean };
type Payout = {
  items: Array<{
    id: string; amountIdr: number; status: string;
    opsNote: string | null; createdAt: string;
  }>;
};

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

function payoutStatusLabel(s: string): string {
  switch (s) {
    case "pending":   return "Menunggu review";
    case "approved":  return "Disetujui — siap transfer";
    case "paid":      return "Selesai ditransfer";
    case "rejected":  return "Ditolak";
    case "cancelled": return "Dibatalkan";
    default:          return s;
  }
}

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
  const [w, ktp, payouts] = await Promise.all([
    serverApi<Wallet>("/wallet"),
    serverApi<Ktp>("/users/me/ktp").catch(() => null),
    serverApi<Payout>("/payouts").catch(() => ({ items: [] } as Payout)).then((p) => p ?? ({ items: [] } as Payout)),
  ]);
  const available = w?.availableIdr ?? 0;
  const escrow    = w?.escrowIdr ?? 0;
  const ktpVerified = !!ktp?.verified;

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
                {!ktpVerified && " KTP wajib terverifikasi."}
              </p>
              <div className="mt-4">
                <WithdrawTrigger availableIdr={available} ktpVerified={ktpVerified} />
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
                Dalam escrow
              </p>
              <p className="mt-3 text-3xl font-bold text-fg">Rp {escrow.toLocaleString("id-ID")}</p>
              <p className="mt-2 text-xs text-fg-muted">Dana yang sedang menunggu konfirmasi pembeli.</p>
            </div>
          </Card>
        </div>

        {(payouts?.items ?? []).length > 0 && (
          <>
            <h2 className="mt-10 text-xl font-semibold text-fg">Permintaan tarik</h2>
            <Card className="mt-4">
              {payouts.items.map((p, i, arr) => (
                <div
                  key={p.id}
                  className={
                    "flex items-center justify-between gap-4 px-5 py-3 text-sm " +
                    (i < arr.length - 1 ? "border-b border-rule/60" : "")
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-fg">Rp {p.amountIdr.toLocaleString("id-ID")}</p>
                    <p className="mt-0.5 text-xs text-fg-subtle">
                      {payoutStatusLabel(p.status)} · {new Date(p.createdAt).toLocaleDateString("id-ID")}
                      {p.opsNote ? ` · ${p.opsNote}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}

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
