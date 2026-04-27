"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge, Button, Input, Label } from "@hoobiq/ui";
import { AuthShell } from "@/components/auth-shell";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export default function RegisterPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    setFieldErrors({});
    start(async () => {
      try {
        await authApi.register({
          username: String(fd.get("username") ?? "").trim(),
          email: String(fd.get("email") ?? "").trim(),
          password: String(fd.get("password") ?? ""),
          acceptTerms: true,
        });
        // API returns 201 without a session — we log in immediately after
        await authApi.login({
          identifier: String(fd.get("email") ?? "").trim(),
          password: String(fd.get("password") ?? ""),
          remember: true,
        });
        router.push("/onboarding");
        router.refresh();
      } catch (e) {
        if (e instanceof ApiError && Array.isArray(e.details)) {
          const map: Record<string, string> = {};
          for (const d of e.details as Array<{ path: string; message: string }>) map[d.path] = d.message;
          setFieldErrors(map);
        }
        setErr(e instanceof ApiError ? e.message : "Tidak bisa terhubung ke server.");
      }
    });
  }

  return (
    <AuthShell
      sideTitle="Gabung 1.420+ kolektor aktif."
      sideBullets={[
        "Listing, Pesan, post komunitas — gratis selamanya.",
        "Transaksi di atas Rp 100rb wajib via Hoobiq Pay. Dana aman sampai barang diterima.",
        "1.000 member pertama dapat Early Member badge + 100 EXP.",
      ]}
    >
      <div className="mb-6 flex items-center gap-2">
        <Badge tone="solid" size="sm">Early Member</Badge>
        <span className="text-xs text-fg-muted">742 / 1000 sudah diklaim</span>
      </div>

      <h1 className="text-3xl font-bold text-fg md:text-4xl">Daftar gratis.</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-medium text-brand-400 hover:underline">Masuk</Link>
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <Field label="Username" error={fieldErrors.username}>
          <Input type="text" name="username" autoComplete="username" placeholder="@kamu_keren" required />
          <p className="text-[11px] text-fg-subtle">3–20 karakter, huruf/angka/underscore.</p>
        </Field>

        <Field label="Email" error={fieldErrors.email}>
          <Input type="email" name="email" autoComplete="email" placeholder="nama@hoobiq.id" required />
        </Field>

        <Field label="Password" error={fieldErrors.password}>
          <Input type="password" name="password" autoComplete="new-password" placeholder="Min 8 karakter" minLength={8} required />
          <p className="text-[11px] text-fg-subtle">Min 8 karakter, campur huruf besar-kecil + angka.</p>
        </Field>

        <label className="flex items-start gap-2 text-sm text-fg-muted">
          <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 rounded border-rule accent-brand-400" />
          <span>
            Saya setuju dengan{" "}
            <Link href="/ketentuan" className="text-brand-400 hover:underline">Ketentuan Layanan</Link> dan{" "}
            <Link href="/privasi" className="text-brand-400 hover:underline">Kebijakan Privasi</Link>.
          </span>
        </label>

        {err && (
          <div role="alert" className="rounded-lg border border-flame-400/30 bg-flame-400/10 px-3 py-2 text-sm text-flame-400">
            {err}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="mt-2 w-full" disabled={pending}>
          {pending ? "Membuat akun…" : "Buat akun"}
        </Button>
      </form>
    </AuthShell>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-flame-400">{error}</p>}
    </div>
  );
}
