import { AdminShell } from "@/components/admin-shell";
import { Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";
import { PayoutQueue, type PayoutRow } from "./queue";

export const metadata = { title: "Payout · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPayoutPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "pending";
  const data = (await serverApi<{ items: PayoutRow[] }>(
    `/payouts/admin?status=${encodeURIComponent(status)}`,
  ).catch(() => ({ items: [] }))) ?? { items: [] };

  return (
    <AdminShell active="Payout">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Payout</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Antrian pencairan dana ke seller. Approve, transfer manual, lalu mark paid.
          </p>
        </div>
        <Card className="mt-6">
          <PayoutQueue initial={data.items} status={status} />
        </Card>
      </div>
    </AdminShell>
  );
}
