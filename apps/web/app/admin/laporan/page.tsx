import { AdminShell } from "@/components/admin-shell";
import { Badge, Card, TextTabs } from "@hoobiq/ui";

export const metadata = { title: "Laporan · Admin Hoobiq", robots: { index: false } };

type Report = {
  id: number;
  target: string;
  kind: "user" | "listing" | "post";
  reason: string;
  reporters: number;
  age: string;
  severity: "high" | "mid" | "low";
  status: "open" | "acted" | "rejected";
};

const reports: Report[] = [
  { id: 12, target: "@spamseller88", kind: "user",    reason: "Penipuan — listing fake, transfer langsung", reporters: 4, age: "3 jam", severity: "high", status: "open" },
  { id: 11, target: "Listing #8812", kind: "listing", reason: "Bootleg dilabel asli — Pikachu Illustrator Rp 150rb", reporters: 3, age: "5 jam", severity: "high", status: "open" },
  { id: 10, target: "@rudewords",    kind: "user",    reason: "Ujaran kebencian di komentar post komunitas",  reporters: 2, age: "6 jam", severity: "mid",  status: "open" },
  { id: 9,  target: "Post #2041",    kind: "post",    reason: "Konten NSFW di feeds", reporters: 5, age: "1 hari", severity: "high", status: "acted" },
  { id: 8,  target: "@refundabuser", kind: "user",    reason: "Pola dispute abusif — 3 kali chargeback palsu", reporters: 1, age: "2 hari", severity: "mid",  status: "open" },
  { id: 7,  target: "Listing #8703", kind: "listing", reason: "Tebak-tebakan, bukan marketplace (gacha)", reporters: 2, age: "3 hari", severity: "low",  status: "rejected" },
];

const statusMap = {
  open:     { label: "Terbuka", tone: "crim"  as const },
  acted:    { label: "Ditindak", tone: "mint" as const },
  rejected: { label: "Ditolak", tone: "ghost" as const },
};

const sevDot = (s: Report["severity"]) =>
  s === "high" ? "bg-flame-400" : s === "mid" ? "bg-brand-400" : "bg-fg-subtle";

export default function AdminReportsPage() {
  return (
    <AdminShell active="Laporan & abuse">
      <div className="px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
          <div>
            <h1 className="text-3xl font-bold text-fg">Laporan & abuse</h1>
            <p className="mt-2 text-sm text-fg-muted">
              Laporan dari pengguna terhadap akun, listing, atau post. Agregasi berdasarkan target.
            </p>
          </div>
          <TextTabs options={["Semua", "Terbuka", "Ditindak", "Ditolak"]} />
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          <Tile label="Terbuka" value="4" accent />
          <Tile label="Target unik" value="4" />
          <Tile label="High severity" value="3" />
          <Tile label="Rata-rata respon" value="4.2 jam" />
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start gap-4 p-5">
                <span className={"mt-1.5 h-2 w-2 shrink-0 rounded-full " + sevDot(r.severity)} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusMap[r.status].tone} size="xs">{statusMap[r.status].label}</Badge>
                    <Badge tone="ghost" size="xs">{r.kind.toUpperCase()}</Badge>
                    <span className="font-mono text-xs text-fg-subtle">#{r.id}</span>
                    <span className="text-xs text-fg-subtle">· {r.age} lalu</span>
                  </div>
                  <p className="mt-2 text-sm">
                    <b className="text-fg">{r.target}</b>{" "}
                    <span className="text-fg-muted">· {r.reason}</span>
                  </p>
                  <p className="mt-1 text-xs text-fg-subtle">
                    Dilaporkan oleh {r.reporters} pengguna
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className="rounded-lg border border-brand-400/50 bg-brand-400/10 px-3 py-1.5 text-xs font-semibold text-brand-400 hover:bg-brand-400/20">
                    Tindak
                  </button>
                  <button className="rounded-lg border border-rule px-3 py-1.5 text-xs text-fg-muted hover:border-fg/40">
                    Tolak
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{label}</p>
        <p className={"mt-2 text-3xl font-bold " + (accent ? "text-flame-400" : "text-fg")}>{value}</p>
      </div>
    </Card>
  );
}
