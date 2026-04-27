"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input, Label } from "@hoobiq/ui";
import { AuthShell } from "@/components/auth-shell";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    start(async () => {
      try {
        await authApi.login({
          identifier: String(fd.get("identifier") ?? "").trim(),
          password: String(fd.get("password") ?? ""),
          remember: fd.get("remember") === "on",
        });
        router.push("/marketplace");
        router.refresh();
      } catch (e) {
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
        <Link href="/daftar" className="font-medium text-brand-400 hover:underline">Daftar gratis</Link>
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
          <Input type="password" name="password" autoComplete="current-password" placeholder="••••••••" required />
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

        <Button type="submit" variant="primary" size="lg" className="mt-2 w-full" disabled={pending}>
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
