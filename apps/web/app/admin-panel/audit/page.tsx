import { AdminShell } from "@/components/admin-shell";
import { Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Audit log · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type Entry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  ip: string | null;
  createdAt: string;
};

export default async function AdminAuditPage() {
  const data = await serverApi<{ entries: Entry[] }>("/admin/audit");
  const entries = data?.entries ?? [];

  return (
    <AdminShell active="Audit log">
      <div className="px-8 py-8">
        <header className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Audit log</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Setiap tindakan admin dicatat permanen. Retensi 5 tahun, tidak bisa dihapus.
          </p>
        </header>

        {entries.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-rule bg-panel/40 p-10 text-center text-sm text-fg-muted">
            Belum ada entri audit.
          </div>
        ) : (
          <Card className="mt-6">
            <div className="grid grid-cols-[1fr_1fr_1.4fr_120px_140px] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <span>Actor</span>
              <span>Action</span>
              <span>Target</span>
              <span>IP</span>
              <span className="text-right">Waktu</span>
            </div>
            {entries.map((e, i) => (
              <div key={e.id} className={"grid grid-cols-[1fr_1fr_1.4fr_120px_140px] items-center gap-4 px-5 py-3 text-sm " + (i < entries.length - 1 ? "border-b border-rule/60" : "")}>
                <span className="text-fg">{e.actor}</span>
                <span className="font-mono text-xs text-fg-muted">{e.action}</span>
                <span className="truncate text-sm text-fg-muted">{e.target}</span>
                <span className="font-mono text-xs text-fg-muted">{e.ip ?? "—"}</span>
                <span className="text-right font-mono text-xs text-fg-muted">{new Date(e.createdAt).toLocaleString("id-ID")}</span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
