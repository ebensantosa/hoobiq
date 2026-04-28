import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card } from "@hoobiq/ui";
import { KomercePayLauncher } from "@/components/komerce-pay-launcher";
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

export default async function CheckoutWaitPage({
  params,
  searchParams,
}: {
  params: Promise<{ humanId: string }>;
  searchParams: Promise<{ m?: string; c?: string }>;
}) {
  const { humanId } = await params;
  const sp = await searchParams;
  // m = "qris" or "va" / "ewallet"; c = bank/wallet code (BCA, OVO, ...).
  const method: "qris" | "va" | "ewallet" = sp.m === "qris" || sp.m === "ewallet" ? sp.m : "va";
  const channel = sp.c ?? "";
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

  if (o.status !== "pending_payment") {
    redirect(`/pesanan/${encodeURIComponent(o.humanId)}`);
  }

  return (
    <AppShell active="Marketplace">
      <div className="mx-auto max-w-2xl px-6 pb-8 lg:px-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-flame-500">
          Hoobiq Pay · Pilih pembayaran
        </span>
        <h1 className="mt-2 text-3xl font-bold text-fg">Selesaikan pembayaran.</h1>
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
            <KomercePayLauncher humanId={o.humanId} method={method} channel={channel} />
          </div>
        </Card>

        <div className="mt-8 text-center text-xs text-fg-muted">
          Mau batal? <Link href="/marketplace" className="text-brand-500 hover:underline">Kembali ke marketplace</Link> — order otomatis dibatalkan kalau tidak dibayar dalam 24 jam.
        </div>
      </div>
    </AppShell>
  );
}
