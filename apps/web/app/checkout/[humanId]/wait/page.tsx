import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card } from "@hoobiq/ui";
import { PaymentSimulator } from "@/components/payment-simulator";
import { serverApi } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

type OrderForWait = {
  id: string;
  humanId: string;
  status: string;
  totalIdr: number;
  courierCode: string;
  payment: { method: string; provider: string; vaNumber: string | null; status: string } | null;
  listing: { title: string; cover: string | null };
  buyer: { username: string };
};

export default async function CheckoutWaitPage({ params }: { params: Promise<{ humanId: string }> }) {
  const { humanId } = await params;
  const me = await getSessionUser();
  if (!me) redirect(`/masuk?next=${encodeURIComponent(`/checkout/${humanId}/wait`)}`);

  const data = await serverApi<{ order: OrderForWait }>(`/orders/${encodeURIComponent(humanId)}`);
  if (!data?.order) notFound();
  const o = data.order;

  if (me.username !== o.buyer.username) {
    return (
      <AppShell active="Marketplace">
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <p className="text-base font-medium text-fg">Bukan pesanan kamu.</p>
        </div>
      </AppShell>
    );
  }

  // If already paid, jump straight to the order detail.
  if (o.status !== "pending_payment") {
    redirect(`/pesanan/${encodeURIComponent(o.humanId)}`);
  }

  // Stub VA for the dev simulator. Real flow: payment provider returns the
  // VA number in createCharge() and it gets stored on the Payment row.
  const vaNumber = o.payment?.vaNumber ?? simulatedVa(o.humanId);

  return (
    <AppShell active="Marketplace">
      <div className="mx-auto max-w-2xl px-6 pb-8 lg:px-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-flame-500">
          Hoobiq Pay · Menunggu pembayaran
        </span>
        <h1 className="mt-2 text-3xl font-bold text-fg">Selesaikan transfer.</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Order ID <span className="font-mono text-fg">{o.humanId}</span>. Bayar
          dalam 24 jam atau pesanan otomatis dibatalkan.
        </p>

        <Card className="mt-6">
          <div className="flex items-center gap-4 border-b border-rule p-5">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-panel-2">
              {o.listing.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.listing.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
            </div>
            <p className="flex-1 truncate text-sm font-medium text-fg">{o.listing.title}</p>
            <p className="font-bold text-fg">Rp {o.totalIdr.toLocaleString("id-ID")}</p>
          </div>

          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              BCA Virtual Account
            </p>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-rule bg-panel-2/50 px-4 py-3">
              <span className="font-mono text-xl tabular-nums tracking-wider text-fg">{vaNumber}</span>
              <CopyVaButton va={vaNumber} />
            </div>
            <p className="mt-3 text-xs text-fg-muted">
              Total transfer: <span className="font-mono font-semibold text-fg">Rp {o.totalIdr.toLocaleString("id-ID")}</span> (transfer pas, tanpa pembulatan).
            </p>
          </div>
        </Card>

        <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
          <p className="font-semibold">Mode dev — simulator pembayaran aktif.</p>
          <p className="mt-1">
            Tombol di bawah cuma di environment ini. Klik "Tandai sudah bayar" untuk men-simulasikan webhook payment masuk dan melanjutkan flow ke halaman pesanan.
          </p>
        </div>

        <PaymentSimulator humanId={o.humanId} />

        <div className="mt-8 text-center text-xs text-fg-muted">
          Mau batal? <Link href="/marketplace" className="text-brand-500 hover:underline">Kembali ke marketplace</Link> — order otomatis dibatalkan kalau tidak dibayar dalam 24 jam.
        </div>
      </div>
    </AppShell>
  );
}

function simulatedVa(humanId: string): string {
  // Deterministic stub VA derived from the order humanId so the displayed
  // number stays the same across refreshes. Real provider issues a real VA.
  const digits = humanId.replace(/\D/g, "").padStart(16, "0").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function CopyVaButton({ va }: { va: string }) {
  // Server component — render plain markup; the actual copy interaction
  // lives in PaymentSimulator (client) where it has the toast. Keeping a
  // visual hint here.
  void va;
  return (
    <span aria-hidden className="ml-auto rounded-md border border-rule px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-fg-subtle">
      copy ↓
    </span>
  );
}
