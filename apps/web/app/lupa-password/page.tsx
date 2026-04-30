"use client";
import * as React from "react";
import Link from "next/link";
import { Button, Input, Label } from "@hoobiq/ui";
import { AuthShell } from "@/components/auth-shell";
import { Spinner } from "@/components/spinner";
import { api, ApiError } from "@/lib/api/client";

/**
 * Forgot-password — buyer types their email, we kick off a reset
 * email server-side. Always renders a success state on submit so the
 * endpoint can't be used to enumerate registered emails (the API
 * silently noops for unknown / inactive accounts).
 */
export default function LupaPasswordPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      try {
        await api("/auth/forgot-password", { method: "POST", body: { email } });
        setSubmitted(true);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Tidak bisa terhubung ke server.");
      }
    });
  }

  if (submitted) {
    return (
      <AuthShell
        sideTitle="Cek inbox kamu."
        sideBullets={[
          "Email reset kami kirim dari notif@hoobiq.com.",
          "Link berlaku 30 menit.",
          "Kalau belum masuk, cek folder spam atau promosi.",
        ]}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-400/15 text-brand-400">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2"/>
            <path d="m22 7-10 5L2 7"/>
          </svg>
        </div>
        <h1 className="mt-6 text-3xl font-bold text-fg md:text-4xl">Cek email kamu.</h1>
        <p className="mt-3 text-sm text-fg-muted">
          Kalau email <b className="text-fg">{email}</b> terdaftar di Hoobiq, kami sudah kirim link reset ke sana.
          Klik link di email untuk membuat password baru.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/masuk" className="text-center text-sm text-fg-muted hover:text-fg">
            Kembali ke masuk
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      sideTitle="Tenang, akun kamu tetap aman."
      sideBullets={[
        "Kami kirim tautan reset ke email kamu.",
        "Tautan berlaku 30 menit.",
        "Kalau tidak menerima email, cek folder spam atau kontak bantuan@hoobiq.com.",
      ]}
    >
      <h1 className="text-3xl font-bold text-fg md:text-4xl">Reset password.</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Masukkan email yang kamu daftarkan — kami kirim tautan reset dalam 1–2 menit.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label>Email</Label>
          <Input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="nama@hoobiq.com"
            required
          />
        </div>

        {err && (
          <div role="alert" className="rounded-lg border border-flame-400/30 bg-flame-400/10 px-3 py-2 text-sm text-flame-400">
            {err}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="mt-2 w-full inline-flex items-center justify-center gap-2" disabled={pending}>
          {pending && <Spinner size={16} />}
          {pending ? "Mengirim…" : "Kirim tautan reset"}
        </Button>
      </form>

      <p className="mt-8 text-sm text-fg-muted">
        Ingat password lagi?{" "}
        <Link href="/masuk" className="font-medium text-brand-400">
          Kembali ke masuk
        </Link>
      </p>
    </AuthShell>
  );
}
