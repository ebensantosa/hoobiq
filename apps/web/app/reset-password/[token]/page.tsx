"use client";
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, Label } from "@hoobiq/ui";
import { AuthShell } from "@/components/auth-shell";
import { PasswordField } from "@/components/password-field";
import { Spinner } from "@/components/spinner";
import { api, ApiError } from "@/lib/api/client";

/**
 * Reset password confirm — buyer arrives via the email link
 * `/reset-password/<token>`. We POST `{ token, password }` to the API
 * which validates the hashed token, sets the new password, and revokes
 * every active session for that user. Server returns invalid_token /
 * expired_token codes which we surface inline.
 */
export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const params = useParams();
  const token = String(params?.token ?? "");

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [pending, start] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr("Password minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setErr("Password dan konfirmasi tidak sama.");
      return;
    }
    start(async () => {
      try {
        await api("/auth/reset-password", { method: "POST", body: { token, password } });
        setDone(true);
        // Auto-bounce to login after a beat so the user lands somewhere
        // useful instead of a confirmation dead end.
        setTimeout(() => router.push("/masuk"), 2000);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Tidak bisa terhubung ke server.");
      }
    });
  }

  if (done) {
    return (
      <AuthShell
        sideTitle="Password berhasil diganti."
        sideBullets={[
          "Semua sesi di perangkat lain sudah di-logout.",
          "Login lagi pakai password baru kamu.",
        ]}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-500">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h1 className="mt-6 text-3xl font-bold text-fg md:text-4xl">Password baru tersimpan.</h1>
        <p className="mt-3 text-sm text-fg-muted">Mengarahkan ke halaman masuk…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      sideTitle="Satu langkah lagi."
      sideBullets={[
        "Password baru berlaku langsung setelah disimpan.",
        "Semua sesi login di perangkat lain otomatis di-logout.",
        "Kami sarankan gunakan password manager.",
      ]}
    >
      <h1 className="text-3xl font-bold text-fg md:text-4xl">Buat password baru.</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Minimal 8 karakter, campur huruf besar-kecil + angka.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <Field label="Password baru">
          <PasswordField
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={8}
            required
          />
        </Field>
        <Field label="Ulangi password baru">
          <PasswordField
            name="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={8}
            required
          />
        </Field>

        {err && (
          <div role="alert" className="rounded-lg border border-flame-400/30 bg-flame-400/10 px-3 py-2 text-sm text-flame-400">
            {err}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="mt-2 w-full inline-flex items-center justify-center gap-2" disabled={pending}>
          {pending && <Spinner size={16} />}
          {pending ? "Menyimpan…" : "Simpan password baru"}
        </Button>
      </form>

      <p className="mt-8 text-xs text-fg-subtle">
        Tautan reset kadaluarsa?{" "}
        <Link href="/lupa-password" className="text-brand-400">
          Minta tautan baru
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
