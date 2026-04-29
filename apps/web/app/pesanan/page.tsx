import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";
import { PendingOrdersReconciler } from "@/components/pending-orders-reconciler";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  humanId: string;
  status: string;
  totalIdr: number;
  courier: string;
  createdAt: string;
  listing: { title: string; cover: string | null };
};

const statusMap: Record<string, { label: string; tone: "mint" | "crim" | "ghost" }> = {
  pending_payment: { label: "Menunggu bayar", tone: "crim" },
  paid:            { label: "Diproses",       tone: "mint" },
  awaiting_pickup: { label: "Diproses",       tone: "mint" },
  shipped:         { label: "Dalam pengiriman", tone: "mint" },
  delivered:       { label: "Sampai",         tone: "mint" },
  completed:       { label: "Selesai",        tone: "ghost" },
  cancelled:       { label: "Dibatalkan",     tone: "ghost" },
  refunded:        { label: "Refunded",       tone: "crim" },
  disputed:        { label: "Dispute",        tone: "crim" },
  expired:         { label: "Expired",        tone: "ghost" },
};

export default async function PesananPage() {
  const data = await serverApi<{ items: OrderRow[] }>("/orders?role=buyer");
  const items = data?.items ?? [];
  const pendingHumanIds = items
    .filter((o) => o.status === "pending_payment")
    .map((o) => o.humanId);

  return (
    <AppShell active="Marketplace">
      <PendingOrdersReconciler humanIds={pendingHumanIds} />
      <div className="px-4 pb-8 sm:px-6 lg:px-10">
        <header className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Pesanan saya</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Semua transaksi sebagai pembeli. Untuk dashboard seller, buka{" "}
            <Link href="/jual" className="text-brand-400">halaman Jual</Link>.
          </p>
        </header>

        {items.length === 0 ? (
          <div className="mt-10 rounded-xl border border-rule bg-panel/40 p-10 text-center">
            <p className="text-fg-muted">
              Belum ada pesanan.{" "}
              <Link href="/marketplace" className="text-brand-400">Mulai belanja</Link>
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {items.map((o) => {
              const s = statusMap[o.status] ?? { label: o.status, tone: "ghost" as const };
              return (
                <Link
                  key={o.id}
                  href={`/pesanan/${o.humanId}`}
                  className="block rounded-2xl border border-rule bg-panel transition-colors hover:border-brand-400/50"
                >
                  <div className="flex flex-wrap items-center gap-4 p-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-panel-2">
                      {o.listing.cover ? (
                        <img src={o.listing.cover} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-400/20 via-ultra-400/15 to-flame-400/20" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <Badge tone={s.tone} size="xs">{s.label}</Badge>
                        <span className="font-mono text-[10px] text-fg-subtle">{o.humanId}</span>
                        <span className="text-xs text-fg-subtle">
                          · {new Date(o.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </p>
                      <p className="mt-1 truncate font-medium text-fg">{o.listing.title}</p>
                      <p className="mt-0.5 text-xs text-fg-muted">via {o.courier}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-fg">Rp {o.totalIdr.toLocaleString("id-ID")}</p>
                      <span className="text-xs text-brand-400">Detail</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
