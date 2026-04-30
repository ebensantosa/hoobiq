"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Label } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { Spinner } from "@/components/spinner";
import { ResendEmailButton } from "@/components/resend-email-button";

/**
 * 6-digit OTP code input rendered on /verifikasi-email after register.
 * Six tied <input maxLength=1> cells that auto-advance + accept paste
 * of the full code in one shot. Submit hits POST /auth/verify-email
 * which marks emailVerified=now() server-side.
 */
export function OtpForm({ email }: { email: string }) {
  const router = useRouter();
  const [digits, setDigits] = React.useState<string[]>(Array(6).fill(""));
  const [pending, setPending] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");
  const ready = code.length === 6 && /^\d{6}$/.test(code);

  function setAt(i: number, v: string) {
    setDigits((d) => {
      const next = [...d];
      next[i] = v;
      return next;
    });
  }

  function onChange(i: number, raw: string) {
    setErr(null);
    // Pasted full 6-digit code? Distribute across cells.
    if (raw.length > 1) {
      const cleaned = raw.replace(/\D/g, "").slice(0, 6).split("");
      const next = Array(6).fill("");
      cleaned.forEach((c, idx) => { next[idx] = c; });
      setDigits(next);
      const lastFilled = Math.min(cleaned.length, 5);
      refs.current[lastFilled]?.focus();
      return;
    }
    const c = raw.replace(/\D/g, "");
    setAt(i, c);
    if (c && i < 5) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "Enter" && ready) {
      e.preventDefault();
      void submit();
    }
  }

  async function submit() {
    if (!ready || pending) return;
    setPending(true); setErr(null);
    try {
      await api("/auth/verify-email", { method: "POST", body: { token: code } });
      router.push("/verifikasi-email?status=success");
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "expired_token") {
          setErr("Kode sudah kadaluarsa. Klik 'Kirim ulang' untuk dapat kode baru.");
        } else if (e.code === "invalid_token") {
          setErr("Kode salah. Cek email lagi atau kirim ulang.");
        } else {
          setErr(e.message);
        }
      } else {
        setErr("Tidak bisa terhubung ke server.");
      }
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void submit(); }}
      className="mt-8 flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <Label>Kode 6-digit dari email</Label>
        <div className="flex justify-between gap-2 sm:gap-3">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}  // allow paste; onChange clamps to one char
              value={d}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className="h-14 w-12 rounded-xl border border-rule bg-panel text-center font-mono text-2xl font-bold text-fg focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-400/20 sm:w-14"
              autoFocus={i === 0}
              autoComplete={i === 0 ? "one-time-code" : "off"}
            />
          ))}
        </div>
        <p className="text-[11px] text-fg-subtle">
          Kode dikirim ke <b className="text-fg">{email}</b>. Berlaku 24 jam.
        </p>
      </div>

      {err && (
        <div role="alert" className="rounded-lg border border-flame-400/30 bg-flame-400/10 px-3 py-2 text-sm text-flame-600">
          {err}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-2 w-full inline-flex items-center justify-center gap-2"
        disabled={!ready || pending}
      >
        {pending && <Spinner size={16} />}
        {pending ? "Memverifikasi…" : "Verifikasi"}
      </Button>

      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-fg-subtle">Belum terima email?</span>
        <ResendEmailButton email={email} />
      </div>
    </form>
  );
}
