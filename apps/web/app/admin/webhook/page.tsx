import { AdminShell } from "@/components/admin-shell";
import { Badge, Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Webhook · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type Hook = {
  id: string;
  source: string;
  event: string;
  statusRaw: string;
  latencyMs: number;
  signatureOk: boolean;
  createdAt: string;
};

export default async function AdminWebhookPage() {
  const data = await serverApi<{ items: Hook[] }>("/admin/webhooks");
  const items = data?.items ?? [];

  return (
    <AdminShell active="Webhook">
      <div className="px-8 py-8">
        <header className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Webhook & integrasi</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Log panggilan masuk dari mitra eksternal. Signature divalidasi sebelum diterima.
          </p>
        </header>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-rule bg-panel/40 p-10 text-center text-sm text-fg-muted">
            Belum ada webhook diterima.
          </div>
        ) : (
          <Card className="mt-6">
            <div className="grid grid-cols-[110px_1fr_120px_90px_140px] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <span>Source</span>
              <span>Event</span>
              <span>Signature</span>
              <span className="text-right">Latency</span>
              <span className="text-right">Waktu</span>
            </div>
            {items.map((h, i) => (
              <div key={h.id} className={"grid grid-cols-[110px_1fr_120px_90px_140px] items-center gap-4 px-5 py-3 text-sm " + (i < items.length - 1 ? "border-b border-rule/60" : "")}>
                <span className="font-mono text-xs uppercase text-fg-muted">{h.source}</span>
                <span className="truncate text-fg">{h.event} <span className="text-fg-subtle">· {h.statusRaw}</span></span>
                <span><Badge tone={h.signatureOk ? "mint" : "crim"} size="xs">{h.signatureOk ? "Valid" : "Invalid"}</Badge></span>
                <span className="text-right font-mono text-xs text-fg-muted">{h.latencyMs} ms</span>
                <span className="text-right font-mono text-xs text-fg-muted">{new Date(h.createdAt).toLocaleString("id-ID")}</span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
