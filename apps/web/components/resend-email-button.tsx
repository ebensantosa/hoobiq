"use client";
import * as React from "react";
import { Button } from "@hoobiq/ui";
import { api } from "@/lib/api/client";

const COOLDOWN_SEC = 30;

/**
 * Verifikasi-email page resend trigger. Throttled client-side with a 30s
 * countdown matching the API's per-IP throttle so the button reflects
 * actual server behavior.
 */
export function ResendEmailButton({ email }: { email: string }) {
  const [pending, start] = React.useTransition();
  const [cooldown, setCooldown] = React.useState(0);
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  function handle() {
    if (cooldown > 0 || pending) return;
    setCooldown(COOLDOWN_SEC);
    start(async () => {
      try {
        await api("/auth/resend-email", { method: "POST", body: { email } });
        setToast("Email verifikasi dikirim ulang.");
      } catch (e) {
        setCooldown(0);
        setToast(e instanceof Error ? e.message : "Gagal mengirim ulang.");
      }
    });
  }

  const disabled = pending || cooldown > 0;
  const label = pending
    ? "Mengirim…"
    : cooldown > 0
    ? `Kirim ulang (${cooldown} dtk)`
    : "Kirim ulang email";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={disabled}
        onClick={handle}
      >
        {label}
      </Button>
      {toast && (
        <p
          role="status"
          className="mt-2 text-center text-xs text-fg-muted"
          aria-live="polite"
        >
          {toast}
        </p>
      )}
    </>
  );
}
