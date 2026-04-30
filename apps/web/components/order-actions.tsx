"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { useActionDialog } from "./action-dialog";

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
  const dialog = useActionDialog();
  const [pending, setPending] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  /** POST helper that surfaces error inside the dialog (returning the
   *  message string keeps the dialog open with an inline error). Used
   *  by every modal-driven action below. */
  async function callDialog(path: string, body: unknown, success: string): Promise<string | void> {
    try {
      await api(path, { method: "POST", body });
      setToast(success);
      router.refresh();
    } catch (e) {
      return e instanceof ApiError ? e.message : "Gagal — coba lagi.";
    }
  }

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
    dialog.open({
      title: "Konfirmasi barang diterima?",
      description: "Setelah dikonfirmasi, dana akan dirilis ke seller. Aksi ini tidak bisa dibatalkan.",
      confirmLabel: "Ya, konfirmasi",
      onConfirm: () => callDialog(
        `/orders/${encodeURIComponent(order.humanId)}/confirm-receipt`, undefined,
        "Pesanan selesai. Dana dirilis ke seller.",
      ),
    });
  };

  // ----------------------- seller: input resi
  const canShip = isSeller && order.status === "paid" && !cancel;
  const shipOrder = () => {
    dialog.open({
      title: "Input resi pengiriman",
      description: "Masukkan nomor resi setelah paket dikirim. Buyer akan otomatis dapat tracking.",
      fields: [
        { key: "tracking", label: "Nomor resi", placeholder: "JNE / J&T / SiCepat", minLength: 4 },
      ],
      confirmLabel: "Simpan resi",
      onConfirm: (v) => callDialog(
        `/orders/${encodeURIComponent(order.humanId)}/ship`,
        { trackingNumber: v.tracking.trim() },
        "Resi tersimpan. Pesanan dikirim.",
      ),
    });
  };

  // ----------------------- buyer: cancel request
  const canRequestCancel =
    isBuyer && !cancel && ["pending_payment", "paid"].includes(order.status);
  const requestCancel = () => {
    dialog.open({
      title: "Request batalkan pesanan",
      description: "Tulis alasan supaya seller bisa menilai. Dana akan direfund kalau seller setuju.",
      fields: [
        { key: "reason", label: "Alasan pembatalan", type: "textarea", placeholder: "Salah pilih, alamat berubah, dll.", minLength: 5 },
      ],
      tone: "danger",
      confirmLabel: "Kirim request",
      onConfirm: (v) => callDialog(
        `/orders/${encodeURIComponent(order.humanId)}/cancel-request`,
        { reason: v.reason.trim() },
        "Permintaan pembatalan dikirim ke seller.",
      ),
    });
  };

  // ----------------------- seller: respond cancel
  const canRespondCancel = isSeller && cancel?.status === "pending";
  const acceptCancel = () => {
    dialog.open({
      title: "Setuju batalkan pesanan?",
      description: "Dana akan otomatis direfund ke buyer.",
      confirmLabel: "Ya, batalkan",
      tone: "danger",
      onConfirm: () => callDialog(
        `/orders/${encodeURIComponent(order.humanId)}/cancel-respond`,
        { decision: "accept" },
        "Pembatalan disetujui.",
      ),
    });
  };
  const rejectCancel = () => {
    dialog.open({
      title: "Tolak request pembatalan",
      description: "Alasan akan ditampilkan ke buyer.",
      fields: [
        { key: "note", label: "Alasan tolak", type: "textarea", minLength: 3 },
      ],
      confirmLabel: "Tolak",
      onConfirm: (v) => callDialog(
        `/orders/${encodeURIComponent(order.humanId)}/cancel-respond`,
        { decision: "reject", rejectNote: v.note.trim() },
        "Pembatalan ditolak.",
      ),
    });
  };

  // ----------------------- buyer: return request
  const canRequestReturn =
    isBuyer && !ret && ["delivered", "shipped"].includes(order.status);
  const requestReturn = () => {
    dialog.open({
      title: "Ajukan retur barang",
      description: "Sertakan bukti foto / video supaya proses retur bisa cepat.",
      fields: [
        { key: "reason", label: "Alasan", type: "select", defaultValue: "damaged",
          options: [
            { value: "damaged",         label: "Barang rusak" },
            { value: "not_as_described", label: "Tidak sesuai deskripsi" },
            { value: "wrong_item",       label: "Salah kirim barang" },
            { value: "other",            label: "Lainnya" },
          ] },
        { key: "description", label: "Deskripsi masalah", type: "textarea", minLength: 10 },
        { key: "evidence",    label: "URL bukti (pisah koma)", placeholder: "https://...", minLength: 1, hint: "Min 1 link foto/video." },
      ],
      tone: "danger",
      confirmLabel: "Ajukan retur",
      onConfirm: (v) => {
        const list = v.evidence.split(",").map((s) => s.trim()).filter(Boolean);
        if (list.length === 0) return "Bukti wajib diisi.";
        return callDialog(
          `/orders/${encodeURIComponent(order.humanId)}/return-request`,
          { reason: v.reason, description: v.description.trim(), evidence: list },
          "Retur diajukan. Menunggu respon seller (max 48 jam).",
        );
      },
    });
  };

  // ----------------------- seller: respond return
  const canRespondReturn = isSeller && ret?.status === "requested";
  const approveReturn = () => {
    dialog.open({
      title: "Setuju retur barang?",
      description: "Buyer akan diminta kirim balik. Refund diproses setelah barang diterima kembali.",
      confirmLabel: "Setujui retur",
      onConfirm: () => callDialog(
        `/orders/${encodeURIComponent(order.humanId)}/return-respond`,
        { decision: "approve" },
        "Retur disetujui.",
      ),
    });
  };
  const rejectReturn = () => {
    dialog.open({
      title: "Tolak retur",
      description: "Penolakan akan masuk ke review admin (dispute).",
      fields: [
        { key: "note", label: "Alasan tolak", type: "textarea", minLength: 3 },
      ],
      tone: "danger",
      confirmLabel: "Tolak retur",
      onConfirm: (v) => callDialog(
        `/orders/${encodeURIComponent(order.humanId)}/return-respond`,
        { decision: "reject", rejectNote: v.note.trim() },
        "Retur ditolak — masuk review admin.",
      ),
    });
  };

  // ----------------------- buyer: ship back
  const canShipBack = isBuyer && ret?.status === "approved";
  const shipBack = () => {
    dialog.open({
      title: "Input resi balik",
      fields: [
        { key: "courier", label: "Kurir balik", type: "select", defaultValue: "jne-reg",
          options: [
            { value: "jne-reg",  label: "JNE Reguler" },
            { value: "jnt",      label: "J&T" },
            { value: "sicepat",  label: "SiCepat" },
            { value: "gosend",   label: "GoSend" },
          ] },
        { key: "tracking", label: "Resi balik", minLength: 4 },
      ],
      confirmLabel: "Simpan",
      onConfirm: (v) => callDialog(
        `/orders/${encodeURIComponent(order.humanId)}/return-ship-back`,
        { trackingNumber: v.tracking.trim(), courierCode: v.courier },
        "Resi balik tersimpan.",
      ),
    });
  };

  // ----------------------- seller: confirm return
  const canConfirmReturn = isSeller && ret?.status === "shipped_back";
  const confirmReturn = () => {
    dialog.open({
      title: "Konfirmasi retur diterima?",
      description: "Refund akan otomatis diproses ke buyer.",
      confirmLabel: "Ya, konfirmasi",
      onConfirm: () => callDialog(
        `/orders/${encodeURIComponent(order.humanId)}/return-confirm`, undefined,
        "Retur selesai, refund diproses.",
      ),
    });
  };

  // ----------------------- buyer: open dispute (manual escalation)
  const canOpenDispute =
    isBuyer && !order.dispute && ["paid", "shipped", "delivered", "returning"].includes(order.status);
  const openDispute = () => {
    dialog.open({
      title: "Buka dispute admin",
      description: "Kasus akan di-review tim Hoobiq dalam 24 jam. Sertakan bukti supaya keputusan cepat.",
      fields: [
        { key: "reason",      label: "Ringkasan masalah", placeholder: "1 kalimat", minLength: 5 },
        { key: "description", label: "Deskripsi detail", type: "textarea", minLength: 10 },
        { key: "evidence",    label: "URL bukti (opsional, pisah koma)" },
      ],
      tone: "danger",
      confirmLabel: "Buka dispute",
      onConfirm: (v) => {
        const evidenceList = v.evidence.split(",").map((s) => s.trim()).filter(Boolean);
        return callDialog(`/orders/${encodeURIComponent(order.humanId)}/dispute`, {
          kind: "other", reason: v.reason.trim(), description: v.description.trim(), evidence: evidenceList,
        }, "Dispute dibuka. Admin akan mereview.");
      },
    });
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
