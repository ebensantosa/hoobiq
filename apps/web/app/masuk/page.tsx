"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { Button, Input, Label } from "@hoobiq/ui";
import { AuthShell } from "@/components/auth-shell";
import { PasswordField } from "@/components/password-field";
import { Spinner } from "@/components/spinner";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

// useSearchParams forces dynamic rendering. Next 15 requires it to live
// inside a Suspense boundary or the static prerender of /masuk fails the
// production build with "missing-suspense-with-csr-bailout".
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    const identifier = String(fd.get("identifier") ?? "").trim();
    start(async () => {
      try {
        await authApi.login({
          identifier,
          password: String(fd.get("password") ?? ""),
          remember: fd.get("remember") === "on",
        });
        // Honor ?next= but only if it's a same-origin path — never echo a
        // user-controlled absolute URL (open-redirect vector).
        const raw = sp.get("next");
        const dest = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/marketplace";
        router.push(dest);
        router.refresh();
      } catch (e) {
        // Email-not-verified bounce — server gates login until OTP
        // confirmation. Take them straight to /verifikasi-email so
        // they don't sit on /masuk wondering what to do next.
        if (e instanceof ApiError && e.code === "email_not_verified") {
          const isEmail = identifier.includes("@");
          const url = "/verifikasi-email" + (isEmail ? `?email=${encodeURIComponent(identifier)}` : "");
          router.push(url);
          return;
        }
        setErr(e instanceof ApiError ? e.message : "Tidak bisa terhubung ke server.");
      }
    });
  }

  return (
    <AuthShell
      sideTitle="Rak koleksi kamu menunggu."
      sideBullets={[
        "Lanjutkan transaksi yang tertunda di Hoobiq Pay.",
        "Cek Pesan dari seller & tawar balik penawaran yang masuk.",
        "Dapat notifikasi listing baru di kategori kamu.",
      ]}
    >
      <h1 className="text-3xl font-bold text-fg md:text-4xl">Masuk.</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-medium text-brand-400">Daftar gratis</Link>
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <Field label="Email atau username">
          <Input type="text" name="identifier" autoComplete="username" placeholder="nama@hoobiq.id" required />
        </Field>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Password</Label>
            <Link href="/lupa-password" className="text-xs text-fg-muted hover:text-brand-400">
              Lupa password?
            </Link>
          </div>
          <PasswordField name="password" autoComplete="current-password" placeholder="••••••••" required />
        </div>

        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <input type="checkbox" name="remember" defaultChecked className="h-4 w-4 rounded border-rule accent-brand-400" />
          Ingat saya di perangkat ini
        </label>

        {err && (
          <div role="alert" className="rounded-lg border border-flame-400/30 bg-flame-400/10 px-3 py-2 text-sm text-flame-400">
            {err}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="mt-2 w-full inline-flex items-center justify-center gap-2" disabled={pending}>
          {pending && <Spinner size={16} />}
          {pending ? "Memproses…" : "Masuk"}
        </Button>
      </form>

      <p className="mt-8 text-xs leading-relaxed text-fg-subtle">
        Dengan masuk, kamu setuju dengan{" "}
        <Link href="/ketentuan" className="text-fg-muted hover:text-brand-400">Ketentuan Layanan</Link> dan{" "}
        <Link href="/privasi" className="text-fg-muted hover:text-brand-400">Kebijakan Privasi</Link>.
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
