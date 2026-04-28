"use client";
import * as React from "react";
import { Button } from "@hoobiq/ui";
import { api } from "@/lib/api/client";
import { Spinner } from "./spinner";

type ChargeResult = {
  method: "va" | "ewallet" | "qris";
  redirectUrl: string | null;
  qrString: string | null;
  qrImageUrl: string | null;
  expiresAt: string;
};

/**
 * Two-button launcher for Komerce-hosted payment.
 *
 *   [ Bayar via Payment Page ]   → opens Komerce hosted page (VA, ewallet,
 *                                   bank transfer — Komerce handles the
 *                                   method selection on their side).
 *   [ Bayar via QRIS         ]   → calls QRISLY, displays the returned QR
 *                                   inline. Buyer scans with any QRIS app.
 *
 * Both flows trigger /payments/komerce/charge. The wait page polls order
 * status separately (existing behavior); when the webhook flips status
 * to "paid", the SSR redirect to /pesanan/[humanId] kicks in on next nav.
 */
export function KomercePayLauncher({ humanId }: { humanId: string }) {
  const [busy, setBusy] = React.useState<"page" | "qris" | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [qris, setQris] = React.useState<{ image: string | null; raw: string | null; expiresAt: string } | null>(null);

  async function pay(kind: "page" | "qris") {
    setBusy(kind); setErr(null);
    try {
      const res = await api<ChargeResult>("/payments/komerce/charge", {
        method: "POST",
        body:
          kind === "page"
            ? { orderHumanId: humanId, method: "va", channel: "page" }
            : { orderHumanId: humanId, method: "qris" },
      });
      if (kind === "page") {
        if (!res.redirectUrl) {
          setErr("Komerce tidak mengembalikan link pembayaran. Coba lagi atau pakai QRIS.");
        } else {
          // Replace, not push — back button shouldn't return to this page
          // since the order is now linked to a Komerce charge.
          window.location.href = res.redirectUrl;
        }
      } else {
        if (!res.qrImageUrl && !res.qrString) {
          setErr("QR tidak diterima dari Komerce. Coba Payment Page atau ulangi.");
        } else {
          setQris({ image: res.qrImageUrl, raw: res.qrString, expiresAt: res.expiresAt });
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memulai pembayaran.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {qris ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-rule bg-panel-2/40 p-6 text-center">
          <p className="text-sm font-semibold text-fg">Scan QRIS untuk bayar</p>
          {qris.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qris.image} alt="QRIS" className="h-64 w-64 rounded-xl border border-rule bg-white p-3 object-contain" />
          ) : qris.raw ? (
            <pre className="max-w-full overflow-x-auto rounded-lg bg-canvas px-3 py-2 text-[10px] font-mono">{qris.raw}</pre>
          ) : null}
          <p className="text-xs text-fg-muted">
            Expired: {new Date(qris.expiresAt).toLocaleString("id-ID")}
          </p>
          <button
            type="button"
            onClick={() => setQris(null)}
            className="text-xs text-fg-muted hover:text-fg"
          >
            ← Pilih metode lain
          </button>
        </div>
      ) : (
        <>
          <Button
            variant="primary"
            size="lg"
            onClick={() => pay("page")}
            disabled={busy !== null}
            className="inline-flex items-center justify-center gap-2"
          >
            {busy === "page" && <Spinner size={16} />}
            {busy === "page" ? "Membuka Payment Page…" : "Bayar via Payment Page"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => pay("qris")}
            disabled={busy !== null}
            className="inline-flex items-center justify-center gap-2"
          >
            {busy === "qris" && <Spinner size={16} />}
            {busy === "qris" ? "Generate QRIS…" : "Bayar via QRIS"}
          </Button>
          <p className="text-center text-xs text-fg-subtle">
            Payment Page: VA, e-wallet, transfer bank — semua metode di-handle Komerce.<br />
            QRIS: scan dari aplikasi mobile banking / e-wallet apa saja.
          </p>
        </>
      )}

      {err && (
        <div role="alert" className="rounded-lg border border-flame-400/40 bg-flame-400/10 px-3 py-2 text-sm text-flame-600">
          {err}
        </div>
      )}
    </div>
  );
}
