import { AdminShell } from "@/components/admin-shell";
import { Badge, Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Dispute · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type Dispute = {
  id: string;
  status: string;
  decision: string | null;
  reason: string;
  buyer: string;
  seller: string;
  item: string;
  humanId: string;
  amountIdr: number;
  createdAt: string;
};

export default async function AdminDisputePage() {
  const data = await serverApi<{ items: Dispute[] }>("/admin/disputes");
  const items = data?.items ?? [];

  return (
    <AdminShell active="Dispute">
      <div className="px-8 py-8">
        <header className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Dispute</h1>
          <p className="mt-2 text-sm text-fg-muted">{items.length} dispute · SLA review 5 hari kerja</p>
        </header>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-rule bg-panel/40 p-10 text-center text-sm text-fg-muted">
            Tidak ada dispute aktif. 🎉
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {items.map((d) => (
              <Card key={d.id}>
                <div className="flex items-start gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={d.status === "resolved" ? "ghost" : "crim"} size="xs">{d.status}</Badge>
                      <span className="font-mono text-xs text-fg-subtle">tx {d.humanId}</span>
                    </div>
                    <p className="mt-2 truncate font-medium text-fg">{d.item}</p>
                    <p className="mt-1 text-sm text-fg-muted">
                      @{d.buyer} <span className="text-fg-subtle">vs</span> @{d.seller} · {d.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-fg">Rp {d.amountIdr.toLocaleString("id-ID")}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
