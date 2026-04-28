"use client";
import * as React from "react";
import { Button } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { Spinner } from "./spinner";

type ChargeResult = {
  method: "va" | "ewallet" | "qris";
  redirectUrl: string | null;
  qrString: string | null;
  qrImageUrl: string | null;
  expiresAt: string;
};

/**
 * Auto-fires the Komerce charge based on the buyer's pre-selection from the
 * checkout page (?m=page or ?m=qris). No method picker here — that lives
 * on the checkout page now.
 *
 * Page method   → window.location.href to Komerce hosted Payment Page.
 * QRIS method   → render the returned qr_image_url (or qr_string fallback)
 *                 inline. Buyer scans, Komerce posts a webhook, wait
 *                 page's SSR refresh redirects to /pesanan/[humanId].
 *
 * The user can hit "Coba lagi" if Komerce returns an error, or jump back
 * to the checkout page to switch method.
 */
export function KomercePayLauncher({
  humanId,
  method,
  channel,
}: {
  humanId: string;
  method: "va" | "ewallet" | "qris";
  /** Bank/wallet code from the checkout pick (e.g. "BCA", "OVO"). Empty for QRIS. */
  channel?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [qris, setQris] = React.useState<{ image: string | null; raw: string | null; expiresAt: string } | null>(null);
  // Avoid double-firing in React 18 dev StrictMode (effects run twice).
  const firedRef = React.useRef(false);

  const fire = React.useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const body =
        method === "qris"
          ? { orderHumanId: humanId, method: "qris" as const }
          : { orderHumanId: humanId, method, channel };
      const res = await api<ChargeResult>("/payments/komerce/charge", { method: "POST", body });

      if (method !== "qris") {
        if (!res.redirectUrl) {
          setErr("Komerce tidak mengembalikan link pembayaran.");
          return;
        }
        window.location.href = res.redirectUrl;
        return;
      }
      // QRIS
      if (!res.qrImageUrl && !res.qrString) {
        setErr("QR tidak diterima dari Komerce.");
        return;
      }
      setQris({ image: res.qrImageUrl, raw: res.qrString, expiresAt: res.expiresAt });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal memulai pembayaran.");
    } finally {
      setBusy(false);
    }
  }, [humanId, method]);

  React.useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    fire();
  }, [fire]);

  if (qris) {
    return (
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
        <p className="text-[11px] text-fg-subtle">
          Halaman ini akan otomatis lanjut ke pesanan setelah pembayaran terdeteksi.
        </p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="flex flex-col gap-3">
        <div role="alert" className="rounded-lg border border-flame-400/40 bg-flame-400/10 px-3 py-3 text-sm text-flame-600">
          {err}
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="md" onClick={fire} disabled={busy}>
            {busy && <Spinner size={14} />}
            <span className={busy ? "ml-2" : ""}>Coba lagi</span>
          </Button>
          <a href="javascript:history.back()" className="rounded-lg border border-rule px-4 py-2 text-sm text-fg-muted hover:text-fg">
            Ganti metode
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 py-6 text-sm text-fg-muted">
      <Spinner size={16} />
      {method === "qris" ? "Generate QRIS…" : `Mengarahkan ke pembayaran${channel ? ` ${channel}` : ""}…`}
    </div>
  );
}
