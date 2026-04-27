"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@hoobiq/ui";
import { api } from "@/lib/api/client";

type ActiveCancel = {
  id: string;
  reason: string;
  status: string;
  rejectNote: string | null;
  expiresAt: string;
} | null;

type ActiveReturn = {
  id: string;
  reason: string;
  description: string;
  status: string;
  rejectNote: string | null;
  returnTrackingNumber: string | null;
  responseDeadlineAt: string;
  shipBackDeadlineAt: string | null;
  confirmDeadlineAt: string | null;
} | null;

type ActiveDispute = {
  id: string;
  status: string;
  decision: string | null;
} | null;

export type OrderForActions = {
  humanId: string;
  status: string;
  courierCode: string;
  trackingNumber: string | null;
  cancelRequest?: ActiveCancel;
  returnRequest?: ActiveReturn;
  dispute?: ActiveDispute;
};

function trackingUrl(code: string, tracking: string): string | null {
  const t = encodeURIComponent(tracking);
  switch (code.toLowerCase()) {
    case "jne":      return `https://www.jne.co.id/tracking-package?awb=${t}`;
    case "jnt":
    case "j&t":      return `https://www.jet.co.id/track?awb=${t}`;
    case "sicepat":  return `https://www.sicepat.com/checkAwb/${t}`;
    case "anteraja": return `https://www.anteraja.id/tracking?awb=${t}`;
    case "ninja":    return `https://www.ninjavan.co/id-id/tracking?id=${t}`;
    case "pos":      return `https://www.posindonesia.co.id/id/tracking?awb=${t}`;
    default:         return `https://cekresi.com/?noresi=${t}`;
  }
}

export function OrderActions({ order, isBuyer }: { order: OrderForActions; isBuyer: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const trackHref = order.trackingNumber ? trackingUrl(order.courierCode, order.trackingNumber) : null;
  const isSeller = !isBuyer;
  const cancel = order.cancelRequest ?? null;
  const ret = order.returnRequest ?? null;

  async function call(path: string, body?: unknown, success?: string) {
    if (pending) return;
    setPending(true);
    try {
      await api(path, { method: "POST", body });
      if (success) setToast(success);
      router.refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setPending(false);
    }
  }

  // ----------------------- buyer: confirm receipt
  const canConfirm = isBuyer && (order.status === "shipped" || order.status === "delivered" || order.status === "paid");
  const confirmReceipt = () => {
    if (!window.confirm("Konfirmasi barang sudah diterima? Dana akan dirilis ke seller.")) return;
    call(`/orders/${encodeURIComponent(order.humanId)}/confirm-receipt`, undefined, "Pesanan selesai. Dana dirilis ke seller.");
  };

  // ----------------------- seller: input resi
  const canShip = isSeller && order.status === "paid" && !cancel;
  const shipOrder = () => {
    const tn = window.prompt("Masukkan nomor resi kurir:");
    if (!tn || tn.trim().length < 4) return;
    call(`/orders/${encodeURIComponent(order.humanId)}/ship`, { trackingNumber: tn.trim() }, "Resi tersimpan. Pesanan dikirim.");
  };

  // ----------------------- buyer: cancel request
  const canRequestCancel =
    isBuyer && !cancel && ["pending_payment", "paid"].includes(order.status);
  const requestCancel = () => {
    const reason = window.prompt("Alasan pembatalan (min 5 karakter):");
    if (!reason || reason.trim().length < 5) return;
    call(`/orders/${encodeURIComponent(order.humanId)}/cancel-request`, { reason: reason.trim() }, "Permintaan pembatalan dikirim ke seller.");
  };

  // ----------------------- seller: respond cancel
  const canRespondCancel = isSeller && cancel?.status === "pending";
  const acceptCancel = () => {
    if (!window.confirm("Setuju pembatalan? Dana akan direfund ke buyer.")) return;
    call(`/orders/${encodeURIComponent(order.humanId)}/cancel-respond`, { decision: "accept" }, "Pembatalan disetujui.");
  };
  const rejectCancel = () => {
    const note = window.prompt("Alasan penolakan (akan ditampilkan ke buyer):");
    if (!note || note.trim().length < 3) return;
    call(`/orders/${encodeURIComponent(order.humanId)}/cancel-respond`, { decision: "reject", rejectNote: note.trim() }, "Pembatalan ditolak.");
  };

  // ----------------------- buyer: return request
  const canRequestReturn =
    isBuyer && !ret && ["delivered", "shipped"].includes(order.status);
  const requestReturn = () => {
    const reason = window.prompt("Alasan retur (damaged | not_as_described | wrong_item | other):", "damaged");
    if (!reason) return;
    const reasons = ["damaged", "not_as_described", "wrong_item", "other"];
    if (!reasons.includes(reason)) { setToast("Alasan tidak valid."); return; }
    const desc = window.prompt("Deskripsi masalah (min 10 karakter):");
    if (!desc || desc.trim().length < 10) return;
    const evidence = window.prompt("URL bukti foto/video (pisah koma, min 1):");
    if (!evidence) return;
    const evidenceList = evidence.split(",").map((s) => s.trim()).filter(Boolean);
    if (evidenceList.length === 0) { setToast("Bukti wajib diisi."); return; }
    call(`/orders/${encodeURIComponent(order.humanId)}/return-request`, {
      reason, description: desc.trim(), evidence: evidenceList,
    }, "Retur diajukan. Menunggu respon seller (max 48 jam).");
  };

  // ----------------------- seller: respond return
  const canRespondReturn = isSeller && ret?.status === "requested";
  const approveReturn = () => {
    if (!window.confirm("Setuju retur? Buyer akan diminta kirim balik.")) return;
    call(`/orders/${encodeURIComponent(order.humanId)}/return-respond`, { decision: "approve" }, "Retur disetujui.");
  };
  const rejectReturn = () => {
    const note = window.prompt("Alasan tolak retur (akan masuk dispute admin):");
    if (!note || note.trim().length < 3) return;
    call(`/orders/${encodeURIComponent(order.humanId)}/return-respond`, { decision: "reject", rejectNote: note.trim() }, "Retur ditolak — masuk review admin.");
  };

  // ----------------------- buyer: ship back
  const canShipBack = isBuyer && ret?.status === "approved";
  const shipBack = () => {
    const courier = window.prompt("Kurir balik (jne-reg | jnt | sicepat | gosend):", "jne-reg");
    const couriers = ["jne-reg", "jnt", "sicepat", "gosend"];
    if (!courier || !couriers.includes(courier)) return;
    const tn = window.prompt("Resi balik:");
    if (!tn || tn.trim().length < 4) return;
    call(`/orders/${encodeURIComponent(order.humanId)}/return-ship-back`, {
      trackingNumber: tn.trim(), courierCode: courier,
    }, "Resi balik tersimpan.");
  };

  // ----------------------- seller: confirm return
  const canConfirmReturn = isSeller && ret?.status === "shipped_back";
  const confirmReturn = () => {
    if (!window.confirm("Konfirmasi barang retur sudah diterima? Refund akan diproses.")) return;
    call(`/orders/${encodeURIComponent(order.humanId)}/return-confirm`, undefined, "Retur selesai, refund diproses.");
  };

  // ----------------------- buyer: open dispute (manual escalation)
  const canOpenDispute =
    isBuyer && !order.dispute && ["paid", "shipped", "delivered", "returning"].includes(order.status);
  const openDispute = () => {
    const reason = window.prompt("Ringkasan masalah (min 5 karakter):");
    if (!reason || reason.trim().length < 5) return;
    const desc = window.prompt("Deskripsi detail (min 10 karakter):");
    if (!desc || desc.trim().length < 10) return;
    const evidence = window.prompt("URL bukti (pisah koma, opsional):", "");
    const evidenceList = (evidence ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    call(`/orders/${encodeURIComponent(order.humanId)}/dispute`, {
      kind: "other", reason: reason.trim(), description: desc.trim(), evidence: evidenceList,
    }, "Dispute dibuka. Admin akan mereview.");
  };

  return (
    <div className="flex max-w-md flex-wrap justify-end gap-2">
      {trackHref && (
        <a
          href={trackHref} target="_blank" rel="noopener noreferrer"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-rule bg-canvas px-3 text-xs font-semibold text-fg transition-colors hover:border-brand-400/50 hover:text-brand-500"
        >
          Lacak di kurir
        </a>
      )}

      {canShip && (
        <Button variant="primary" size="sm" onClick={shipOrder} disabled={pending}>
          {pending ? "..." : "Input resi"}
        </Button>
      )}

      {canConfirm && !ret && !cancel && (
        <Button variant="primary" size="sm" onClick={confirmReceipt} disabled={pending}>
          {pending ? "..." : "Konfirmasi diterima"}
        </Button>
      )}

      {canRequestCancel && (
        <Button variant="ghost" size="sm" onClick={requestCancel} disabled={pending}>
          Request batal
        </Button>
      )}

      {canRespondCancel && (
        <>
          <Button variant="primary" size="sm" onClick={acceptCancel} disabled={pending}>
            Setujui batal
          </Button>
          <Button variant="ghost" size="sm" onClick={rejectCancel} disabled={pending}>
            Tolak batal
          </Button>
        </>
      )}

      {canRequestReturn && (
        <Button variant="ghost" size="sm" onClick={requestReturn} disabled={pending}>
          Ajukan retur
        </Button>
      )}

      {canRespondReturn && (
        <>
          <Button variant="primary" size="sm" onClick={approveReturn} disabled={pending}>
            Setujui retur
          </Button>
          <Button variant="ghost" size="sm" onClick={rejectReturn} disabled={pending}>
            Tolak retur
          </Button>
        </>
      )}

      {canShipBack && (
        <Button variant="primary" size="sm" onClick={shipBack} disabled={pending}>
          Input resi balik
        </Button>
      )}

      {canConfirmReturn && (
        <Button variant="primary" size="sm" onClick={confirmReturn} disabled={pending}>
          Konfirmasi retur
        </Button>
      )}

      {canOpenDispute && (
        <Button variant="ghost" size="sm" onClick={openDispute} disabled={pending}>
          Buka dispute
        </Button>
      )}

      {/* Inline status banners */}
      {cancel?.status === "pending" && (
        <p className="basis-full text-right text-xs text-fg-muted">
          Cancel pending — auto-accept jika seller diam sampai {formatDateTime(cancel.expiresAt)}
        </p>
      )}
      {ret?.status === "requested" && (
        <p className="basis-full text-right text-xs text-fg-muted">
          Retur menunggu respon seller — auto-approve {formatDateTime(ret.responseDeadlineAt)}
        </p>
      )}
      {ret?.status === "approved" && ret.shipBackDeadlineAt && (
        <p className="basis-full text-right text-xs text-fg-muted">
          Retur approved — buyer wajib kirim balik sebelum {formatDateTime(ret.shipBackDeadlineAt)}
        </p>
      )}
      {ret?.status === "shipped_back" && ret.confirmDeadlineAt && (
        <p className="basis-full text-right text-xs text-fg-muted">
          Buyer sudah kirim balik (resi {ret.returnTrackingNumber}). Auto-confirm {formatDateTime(ret.confirmDeadlineAt)}
        </p>
      )}

      {toast && (
        <p role="status" className="basis-full text-right text-xs text-fg-muted" aria-live="polite">
          {toast}
        </p>
      )}
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
