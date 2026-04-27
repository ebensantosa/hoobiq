import { AdminShell } from "@/components/admin-shell";
import { Badge, Button, Card, TextTabs } from "@hoobiq/ui";

export const metadata = { title: "Payout · Admin Hoobiq", robots: { index: false } };

type Payout = {
  id: string;
  seller: string;
  amount: string;
  bank: string;
  account: string;
  requested: string;
  risk: "low" | "mid" | "high";
  status: "pending" | "review" | "sent";
  note?: string;
};

const items: Payout[] = [
  { id: "PO-24192", seller: "adityacollects", amount: "Rp 3.240.000", bank: "BCA",     account: "•••• 6789", requested: "25 Apr 08:12", risk: "low",  status: "pending" },
  { id: "PO-24191", seller: "figurehunt",     amount: "Rp 2.150.000", bank: "Mandiri", account: "•••• 4412", requested: "25 Apr 07:44", risk: "low",  status: "pending" },
  { id: "PO-24190", seller: "opccollector",   amount: "Rp 1.680.000", bank: "BCA",     account: "•••• 1122", requested: "25 Apr 06:30", risk: "low",  status: "pending" },
  { id: "PO-24189", seller: "grayAccount",    amount: "Rp 5.500.000", bank: "BRI",     account: "•••• 9988", requested: "24 Apr 22:10", risk: "high", status: "review", note: "Multi-akun terdeteksi · butuh review manual" },
  { id: "PO-24188", seller: "newbie22",       amount: "Rp 1.200.000", bank: "BNI",     account: "•••• 5555", requested: "24 Apr 19:04", risk: "mid",  status: "review", note: "Akun < 30 hari, payout pertama" },
  { id: "PO-24187", seller: "pokemonid",      amount: "Rp 8.920.000", bank: "BCA",     account: "•••• 3021", requested: "24 Apr 18:10", risk: "low",  status: "sent" },
  { id: "PO-24186", seller: "komikpop",       amount: "Rp 1.080.000", bank: "Mandiri", account: "•••• 7733", requested: "24 Apr 14:48", risk: "low",  status: "sent" },
];

const statusMap = {
  pending: { label: "Menunggu approval", tone: "crim"  as const },
  review:  { label: "Butuh review",      tone: "crim"  as const },
  sent:    { label: "Terkirim",          tone: "ghost" as const },
};

const riskDot = (r: Payout["risk"]) =>
  r === "high" ? "bg-flame-400" : r === "mid" ? "bg-brand-400" : "bg-fg-subtle";

export default function AdminPayoutPage() {
  return (
    <AdminShell active="Payout">
      <div className="px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
          <div>
            <h1 className="text-3xl font-bold text-fg">Antrian payout</h1>
            <p className="mt-2 text-sm text-fg-muted">
              Penarikan dana seller. Pending low-risk disetujui otomatis dalam 1×24 jam. Review manual untuk high/mid-risk.
            </p>
          </div>
          <TextTabs options={["Semua", "Menunggu", "Review", "Terkirim"]} />
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          <Tile label="Total pending" value="12" />
          <Tile label="Nominal pending" value="Rp 18.4jt" />
          <Tile label="Butuh review" value="2" accent />
          <Tile label="Terkirim hari ini" value="Rp 10.0jt" />
        </div>

        <Card className="mt-8">
          <div className="grid grid-cols-[100px_1fr_1fr_1fr_120px_140px] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            <span>ID</span>
            <span>Seller</span>
            <span>Bank tujuan</span>
            <span>Status</span>
            <span className="text-right">Nominal</span>
            <span className="text-right">Aksi</span>
          </div>
          {items.map((p, i) => (
            <div
              key={p.id}
              className={
                "px-5 py-3 " + (i < items.length - 1 ? "border-b border-rule/60" : "")
              }
            >
              <div className="grid grid-cols-[100px_1fr_1fr_1fr_120px_140px] items-center gap-4 text-sm">
                <span className="font-mono text-xs text-fg-subtle">{p.id}</span>
                <span className="flex items-center gap-2 text-fg">
                  <span className={"h-1.5 w-1.5 rounded-full " + riskDot(p.risk)} />
                  @{p.seller}
                </span>
                <span className="text-sm text-fg-muted">
                  {p.bank} <span className="font-mono">{p.account}</span>
                </span>
                <span>
                  <Badge tone={statusMap[p.status].tone} size="xs">
                    {statusMap[p.status].label}
                  </Badge>
                </span>
                <span className="text-right font-mono font-medium text-fg">{p.amount}</span>
                <span className="flex justify-end gap-1.5">
                  {p.status !== "sent" ? (
                    <>
                      <button className="rounded-lg border border-brand-400/50 bg-brand-400/10 px-2.5 py-1 text-[11px] font-semibold text-brand-400 hover:bg-brand-400/20">
                        Approve
                      </button>
                      <button className="rounded-lg border border-rule px-2.5 py-1 text-[11px] text-fg-muted hover:border-crim-400/50 hover:text-crim-400">
                        Tahan
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-fg-subtle">{p.requested}</span>
                  )}
                </span>
              </div>
              {p.note && (
                <p className="mt-2 ml-[104px] text-xs text-flame-400">⚠ {p.note}</p>
              )}
            </div>
          ))}
        </Card>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button variant="primary" size="md">Approve semua low-risk (8)</Button>
          <Button variant="outline" size="md">Unduh laporan CSV</Button>
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
        <p className={"mt-2 text-2xl font-bold " + (accent ? "text-flame-400" : "text-fg")}>{value}</p>
      </div>
    </Card>
  );
}
