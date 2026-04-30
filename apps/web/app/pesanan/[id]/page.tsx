import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Avatar, Badge, Card } from "@hoobiq/ui";
import { OrderActions } from "@/components/order-actions";
import { OrderChat } from "@/components/order-chat";
import { TrackingTimeline } from "@/components/tracking-timeline";
import { conditionBadge } from "@/lib/condition-badge";
import { serverApi } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/session";

type ChatThread = React.ComponentProps<typeof OrderChat>["initial"];

export const dynamic = "force-dynamic";

type OrderStatus =
  | "pending_payment" | "paid" | "shipped" | "delivered" | "completed"
  | "cancelled" | "refunded" | "returning" | "disputed";

type OrderDetail = {
  id: string;
  humanId: string;
  status: OrderStatus;
  qty: number;
  priceIdr: number;
  shippingIdr: number;
  platformFeeIdr: number;
  payFeeIdr: number;
  insuranceIdr: number;
  totalIdr: number;
  courierCode: string;
  trackingNumber: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  autoReleaseAt: string | null;
  shipmentDeadlineAt: string | null;
  cancelRequest: {
    id: string; reason: string; status: string; rejectNote: string | null;
    expiresAt: string; createdAt: string;
  } | null;
  returnRequest: {
    id: string; reason: string; description: string;
    evidence: string[];
    status: string; rejectNote: string | null;
    returnTrackingNumber: string | null; returnCourierCode: string | null;
    responseDeadlineAt: string;
    shipBackDeadlineAt: string | null;
    confirmDeadlineAt: string | null;
  } | null;
  dispute: {
    id: string; kind: string; status: string; decision: string | null;
    reason: string; description: string; evidence: string[];
    adminNote: string | null; createdAt: string; resolvedAt: string | null;
  } | null;
  listing: {
    id: string;
    slug: string;
    title: string;
    condition: string;
    cover: string | null;
    category: { name: string; slug: string } | null;
  };
  buyer:  { username: string; name: string | null; avatarUrl: string | null; city: string | null; trustScore: number };
  seller: { username: string; name: string | null; avatarUrl: string | null; city: string | null; trustScore: number };
  address: {
    recipient: string; phone: string;
    line1: string; line2: string | null;
    city: string; province: string; postalCode: string;
  };
  payment: {
    method: string;
    provider: string;
    vaNumber: string | null;
    status: string;
  } | null;
};

const STATUS_LABELS: Record<OrderStatus, { label: string; tone: "mint" | "near" | "ghost" | "crim" }> = {
  pending_payment: { label: "Menunggu pembayaran", tone: "near" },
  paid:            { label: "Dibayar — disiapkan",  tone: "mint" },
  shipped:         { label: "Dalam pengiriman",     tone: "mint" },
  delivered:       { label: "Sampai tujuan",        tone: "mint" },
  completed:       { label: "Selesai",              tone: "mint" },
  cancelled:       { label: "Dibatalkan",           tone: "ghost" },
  refunded:        { label: "Direfund",             tone: "ghost" },
  returning:       { label: "Retur diproses",       tone: "near" },
  disputed:        { label: "Dispute aktif",        tone: "crim" },
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getSessionUser();
  if (!me) {
    return (
      <AppShell active="Marketplace">
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <p className="text-base font-medium text-fg">Kamu perlu masuk dulu.</p>
          <Link href={`/masuk?next=/pesanan/${encodeURIComponent(id)}`} className="mt-4 inline-block text-sm text-brand-500">
            Masuk
          </Link>
        </div>
      </AppShell>
    );
  }

  const [data, chatRes] = await Promise.all([
    serverApi<{ order: OrderDetail }>(`/orders/${encodeURIComponent(id)}`),
    serverApi<ChatThread>(`/orders/${encodeURIComponent(id)}/messages`).catch(() => null),
  ]);
  if (!data?.order) notFound();
  const o = data.order;
  const isBuyer = me.username === o.buyer.username;
  const counterpart = isBuyer ? o.seller : o.buyer;
  const statusInfo = STATUS_LABELS[o.status] ?? { label: o.status, tone: "ghost" as const };

  /* Build timeline from real timestamps. The "current" step is the latest
     done step; remaining steps render as future. */
  const timeline: Array<{ label: string; when: string | null; detail?: string; done: boolean }> = [
    { label: "Pesanan dibuat",                 when: o.createdAt,    detail: o.payment ? `${o.payment.method.toUpperCase()} · Rp ${o.totalIdr.toLocaleString("id-ID")}` : undefined, done: true },
    { label: "Pembayaran diterima",            when: o.paidAt,       detail: o.payment?.vaNumber ? `VA ${o.payment.vaNumber}` : "Hoobiq Pay (escrow aktif)",                          done: !!o.paidAt },
    { label: "Seller mengirim barang",         when: o.shippedAt,    detail: o.trackingNumber ? `${o.courierCode.toUpperCase()} · ${o.trackingNumber}` : `${o.courierCode.toUpperCase()}`, done: !!o.shippedAt },
    { label: "Barang sampai",                  when: o.deliveredAt,  done: !!o.deliveredAt },
    { label: "Transaksi selesai",              when: o.completedAt,  detail: o.autoReleaseAt && !o.completedAt ? `Auto-release ${formatDate(o.autoReleaseAt)}` : "Dana cair ke seller", done: !!o.completedAt },
  ];
  // Mark the most recent done step as "current" for highlight.
  const lastDoneIdx = timeline.map((s) => s.done).lastIndexOf(true);
  const timelineWithCurrent = timeline.map((s, i) => ({ ...s, current: i === lastDoneIdx && o.status !== "completed" }));

  return (
    <AppShell active="Marketplace">
      <div className="px-6 pb-8 lg:px-10">
        <nav className="mb-6 text-xs text-fg-subtle">
          <Link href="/pesanan" className="hover:text-fg">Pesanan</Link>
          <span className="mx-2">/</span>
          <span className="font-mono">{o.humanId}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone={statusInfo.tone} size="sm">{statusInfo.label}</Badge>
              <span className="font-mono text-xs text-fg-subtle">{o.humanId}</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold text-fg">
              {headlineFor(o)}
            </h1>
            <p className="mt-2 text-sm text-fg-muted">
              {subheadFor(o)}
            </p>
          </div>
          <OrderActions order={o} isBuyer={isBuyer} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col gap-6">
            {/* Timeline */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-fg">Progres pesanan</h2>
                <ol className="mt-6 space-y-6">
                  {timelineWithCurrent.map((s, i) => (
                    <li key={i} className="relative flex gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          className={
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 " +
                            (s.done
                              ? s.current
                                ? "border-brand-400 bg-brand-400 text-white"
                                : "border-brand-400 bg-brand-400/20 text-brand-400"
                              : "border-rule bg-canvas text-fg-subtle")
                          }
                        >
                          {s.done ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          )}
                        </span>
                        {i < timelineWithCurrent.length - 1 && (
                          <span className={"mt-1 w-px flex-1 " + (s.done ? "bg-brand-400/40" : "bg-rule")} />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className={"font-medium " + (s.done ? "text-fg" : "text-fg-muted")}>
                          {s.label}
                        </p>
                        {s.when && <p className="mt-0.5 text-xs text-fg-subtle">{formatDateTime(s.when)}</p>}
                        {s.detail && <p className="mt-0.5 text-xs text-fg-muted">{s.detail}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </Card>

            {/* Tracking — live updates from RajaOngkir/Komerce when resi is set */}
            {o.trackingNumber && (
              <TrackingTimeline courier={o.courierCode} awb={o.trackingNumber} />
            )}

            {/* Escrow chat — buyer + seller. Read-only when the order
                has been finalised more than 30 days ago. */}
            {chatRes && (
              <OrderChat
                humanId={o.humanId}
                initial={chatRes}
                frozen={isFrozenForChat(o)}
              />
            )}

            {/* Item */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-fg">Barang</h2>
                <div className="mt-4 flex gap-4">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-panel-2">
                    {o.listing.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.listing.cover} alt={o.listing.title} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-400/25 via-ultra-400/20 to-flame-400/25" />
                    )}
                    {(() => {
                      const c = conditionBadge(o.listing.condition);
                      return (
                        <Badge tone={c.tone} size="xs" className="absolute left-2 top-2">
                          {c.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div className="flex-1">
                    {o.listing.category && (
                      <p className="text-xs text-fg-subtle">{o.listing.category.name}</p>
                    )}
                    <Link href={`/listing/${o.listing.slug}`} className="mt-1 block font-medium text-fg hover:text-brand-500">
                      {o.listing.title}
                    </Link>
                    <div className="mt-3 flex items-center gap-3">
                      <Avatar
                        letter={counterpart.username[0]?.toUpperCase() ?? "U"}
                        size="sm"
                        src={counterpart.avatarUrl}
                        alt={`Avatar @${counterpart.username}`}
                      />
                      <div>
                        <p className="text-sm font-medium text-fg">{counterpart.name ?? `@${counterpart.username}`}</p>
                        <p className="text-xs text-fg-muted">
                          {counterpart.city ?? "—"} · ★ {counterpart.trustScore.toFixed(1)}
                        </p>
                      </div>
                      <Link
                        href={`/dm?to=${encodeURIComponent(counterpart.username)}`}
                        className="ml-auto text-xs text-brand-400"
                      >
                        Pesan {isBuyer ? "seller" : "buyer"}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <div className="p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Ringkasan</h3>
                <dl className="mt-4 flex flex-col gap-3 text-sm">
                  <Row label={`Subtotal${o.qty > 1 ? ` (×${o.qty})` : ""}`} value={`Rp ${(o.priceIdr * o.qty).toLocaleString("id-ID")}`} />
                  <Row label={`Ongkir ${o.courierCode.toUpperCase()}`}      value={`Rp ${o.shippingIdr.toLocaleString("id-ID")}`} />
                  <Row label="Biaya platform"                                value={`Rp ${o.platformFeeIdr.toLocaleString("id-ID")}`} />
                  <Row label="Biaya Hoobiq Pay"                              value={`Rp ${o.payFeeIdr.toLocaleString("id-ID")}`} />
                  {o.insuranceIdr > 0 && <Row label="Asuransi" value={`Rp ${o.insuranceIdr.toLocaleString("id-ID")}`} />}
                </dl>
                <div className="mt-5 flex items-end justify-between border-t border-rule pt-5">
                  <span className="text-sm text-fg-muted">Total</span>
                  <span className="text-2xl font-bold text-fg">Rp {o.totalIdr.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Alamat</h3>
                <p className="mt-3 font-medium text-fg">{o.address.recipient} · {o.address.phone}</p>
                <p className="mt-1 text-sm text-fg-muted">
                  {o.address.line1}
                  {o.address.line2 ? <>, {o.address.line2}</> : null}
                  <br />
                  {o.address.city}, {o.address.province} {o.address.postalCode}
                </p>
              </div>
            </Card>

            <div className="rounded-2xl border border-rule p-5 text-sm">
              <p className="font-medium text-fg">Ada masalah dengan pesanan?</p>
              <p className="mt-1 text-fg-muted">
                Buka dispute jika barang tidak sesuai deskripsi atau bermasalah saat diterima.
              </p>
              <Link href="/bantuan#dispute" className="mt-3 inline-block text-brand-400">
                Cara buka dispute
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="font-mono text-fg">{value}</dd>
    </div>
  );
}

function headlineFor(o: OrderDetail): string {
  switch (o.status) {
    case "pending_payment": return "Selesaikan pembayaran kamu.";
    case "paid":            return "Pembayaran diterima.";
    case "shipped":         return "Pesanan kamu sedang dalam pengiriman.";
    case "delivered":       return "Barang sudah sampai.";
    case "completed":       return "Transaksi selesai.";
    case "cancelled":       return "Pesanan dibatalkan.";
    case "refunded":        return "Pesanan direfund.";
    case "returning":       return "Retur sedang diproses.";
    case "disputed":        return "Pesanan dalam proses dispute.";
    default:                return "Status pesanan";
  }
}

function subheadFor(o: OrderDetail): string {
  if (o.status === "shipped" && o.trackingNumber) {
    return `Kurir ${o.courierCode.toUpperCase()} · resi ${o.trackingNumber}`;
  }
  if (o.status === "pending_payment" && o.payment?.vaNumber) {
    return `${o.payment.provider.toUpperCase()} VA ${o.payment.vaNumber}`;
  }
  return `Dibuat ${formatDateTime(o.createdAt)}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

/** Escrow chat is read-only after the order has been final (completed
 *  / cancelled / refunded) for 30+ days — buyer + seller still see the
 *  history but the composer is hidden so old threads don't surprise
 *  someone with new messages months later. */
function isFrozenForChat(o: OrderDetail): boolean {
  const finalIso = o.completedAt ?? o.cancelledAt ?? o.refundedAt;
  if (!finalIso) return false;
  const ageMs = Date.now() - new Date(finalIso).getTime();
  return ageMs > 30 * 86_400_000;
}
