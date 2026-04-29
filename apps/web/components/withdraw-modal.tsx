"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { useToast } from "./toast-provider";

type Bank = { id: string; bank: string; numberLast4: string; holderName: string; primary: boolean };

const MIN_IDR = 50_000;

/**
 * Tarik-saldo modal opened from /saldo. Picks a verified rekening,
 * lets the user enter an amount (min Rp 50.000), and POSTs to
 * /payouts. Server enforces KTP-verified + min-amount + sufficient
 * balance; we mirror the client guards purely for UX.
 */
export function WithdrawModal({
  open,
  onClose,
  availableIdr,
  ktpVerified,
}: {
  open: boolean;
  onClose: () => void;
  availableIdr: number;
  ktpVerified: boolean;
}) {
  const toast = useToast();
  const [banks, setBanks] = React.useState<Bank[]>([]);
  const [picked, setPicked] = React.useState<string | null>(null);
  const [amount, setAmount] = React.useState<string>("");
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    if (!open || !ktpVerified) return;
    api<{ items: Bank[] }>("/bank-accounts")
      .then((res) => {
        setBanks(res.items);
        const pri = res.items.find((b) => b.primary) ?? res.items[0];
        if (pri) setPicked(pri.id);
      })
      .catch(() => toast.error("Gagal memuat rekening", "Coba lagi nanti."));
  }, [open, ktpVerified, toast]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  function submit() {
    const n = Number(amount.replace(/[^\d]/g, ""));
    if (!picked) { toast.error("Pilih rekening dulu", ""); return; }
    if (!Number.isFinite(n) || n < MIN_IDR) {
      toast.error("Nominal kurang", `Minimum Rp ${MIN_IDR.toLocaleString("id-ID")}.`);
      return;
    }
    if (n > availableIdr) {
      toast.error("Saldo tidak cukup", "");
      return;
    }
    start(async () => {
      try {
        await api("/payouts", { method: "POST", body: { bankAccountId: picked, amountIdr: n } });
        toast.success("Permintaan tarik dikirim", "Admin akan proses dalam 1×24 jam hari kerja.");
        onClose();
        setTimeout(() => window.location.reload(), 800);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal";
        toast.error("Gagal kirim permintaan", msg);
      }
    });
  }

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-title"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-panel shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-rule px-5 py-4">
          <div>
            <p id="withdraw-title" className="text-base font-bold text-fg">Tarik dana</p>
            <p className="text-xs text-fg-muted">
              Saldo siap ditarik: Rp {availableIdr.toLocaleString("id-ID")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-panel-2 hover:text-fg"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {!ktpVerified ? (
          <div className="p-6 text-sm text-fg-muted">
            <p>KTP kamu belum terverifikasi. Verifikasi KTP dulu di Pengaturan untuk bisa tarik dana.</p>
          </div>
        ) : banks.length === 0 ? (
          <div className="p-6 text-sm text-fg-muted">
            <p>Belum ada rekening tersimpan. Tambahkan rekening dulu di Pengaturan, menu Rekening.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-5">
            <div>
              <label className="mb-2 block text-xs font-semibold text-fg-muted">Rekening tujuan</label>
              <div className="flex flex-col gap-2">
                {banks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setPicked(b.id)}
                    className={
                      "flex items-center justify-between rounded-xl border p-3 text-left transition-colors " +
                      (picked === b.id
                        ? "border-brand-400 bg-brand-400/10"
                        : "border-rule hover:border-brand-400/60 hover:bg-panel-2")
                    }
                  >
                    <div>
                      <p className="text-sm font-bold text-fg">{b.bank} •••• {b.numberLast4}</p>
                      <p className="text-xs text-fg-muted">{b.holderName}</p>
                    </div>
                    {b.primary && <span className="rounded-full bg-brand-400/15 px-2 py-0.5 text-[10px] font-semibold text-brand-500">Utama</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-fg-muted">Nominal (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                placeholder={`Min ${MIN_IDR.toLocaleString("id-ID")}`}
                className="w-full rounded-lg border border-rule bg-panel-2 px-4 py-3 text-base font-mono text-fg outline-none focus:border-brand-400"
              />
              <p className="mt-1 text-[11px] text-fg-subtle">
                Minimum tarik Rp {MIN_IDR.toLocaleString("id-ID")}. Dana masuk 1×24 jam hari kerja.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-rule p-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={submit}
            disabled={pending || !ktpVerified || banks.length === 0}
          >
            {pending ? "Memproses…" : "Kirim permintaan"}
          </Button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(node, document.body) : null;
}

export function WithdrawTrigger({ availableIdr, ktpVerified }: { availableIdr: number; ktpVerified: boolean }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-brand-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
      >
        Tarik dana
      </button>
      <WithdrawModal
        open={open}
        onClose={() => setOpen(false)}
        availableIdr={availableIdr}
        ktpVerified={ktpVerified}
      />
    </>
  );
}
