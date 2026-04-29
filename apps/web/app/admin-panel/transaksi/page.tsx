import { AdminShell } from "@/components/admin-shell";
import { Badge, Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Transaksi · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type AdminOrder = {
  id: string;
  humanId: string;
  status: string;
  totalIdr: number;
  courier: string;
  buyer: string;
  seller: string;
  item: string;
  createdAt: string;
};

const statusTone: Record<string, "mint" | "crim" | "ghost"> = {
  paid: "mint",
  shipped: "mint",
  delivered: "mint",
  completed: "ghost",
  pending_payment: "crim",
  disputed: "crim",
  refunded: "crim",
  cancelled: "ghost",
  expired: "ghost",
};

export default async function AdminTxPage() {
  const data = await serverApi<{ items: AdminOrder[] }>("/admin/orders");
  const items = data?.items ?? [];

  return (
    <AdminShell active="Transaksi">
      <div className="px-8 py-8">
        <header className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Transaksi</h1>
          <p className="mt-2 text-sm text-fg-muted">{items.length} transaksi terbaru</p>
        </header>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-rule bg-panel/40 p-10 text-center text-sm text-fg-muted">
            Belum ada transaksi.
          </div>
        ) : (
          <Card className="mt-6">
            <div className="grid grid-cols-[160px_2fr_1fr_1fr_120px] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <span>ID</span>
              <span>Item</span>
              <span>Buyer & Seller</span>
              <span>Status</span>
              <span className="text-right">Nominal</span>
            </div>
            {items.map((t, i) => (
              <div key={t.id} className={"grid grid-cols-[160px_2fr_1fr_1fr_120px] items-center gap-4 px-5 py-3 text-sm " + (i < items.length - 1 ? "border-b border-rule/60" : "")}>
                <span className="truncate font-mono text-xs text-fg-subtle">{t.humanId}</span>
                <p className="truncate text-fg">{t.item}</p>
                <p className="truncate text-xs text-fg-muted">@{t.buyer} <span className="text-fg">@{t.seller}</span></p>
                <span><Badge tone={statusTone[t.status] ?? "ghost"} size="xs">{t.status.replace("_", " ")}</Badge></span>
                <span className="text-right font-mono font-medium text-fg">Rp {t.totalIdr.toLocaleString("id-ID")}</span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
