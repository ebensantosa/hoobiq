"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge, Button, Input, Label } from "@hoobiq/ui";
import { AuthShell } from "@/components/auth-shell";
import { PasswordField } from "@/components/password-field";
import { Spinner } from "@/components/spinner";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

/** Per-character validation for the username field as the user types.
 *  Returns a message describing what's wrong (or "" when valid).
 *  Same shape the server enforces — keeps the inline hint useful. */
function usernameHint(raw: string): { ok: boolean; msg: string } {
  if (raw.length === 0) return { ok: false, msg: "3–20 karakter, huruf/angka/underscore." };
  if (raw.startsWith("@")) return { ok: false, msg: "Username ditulis tanpa @ di depan." };
  if (raw.length < 3) return { ok: false, msg: `Kurang ${3 - raw.length} karakter lagi.` };
  if (raw.length > 20) return { ok: false, msg: "Maksimal 20 karakter." };
  if (!/^[a-zA-Z0-9_]+$/.test(raw)) return { ok: false, msg: "Hanya huruf, angka, dan underscore." };
  return { ok: true, msg: "Username terlihat oke." };
}

export default function RegisterPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [username, setUsername] = useState("");
  const usernameCheck = usernameHint(username);

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
          phone: String(fd.get("phone") ?? "").trim(),
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
        "5.000 member pertama dapat Early Member badge + 100 EXP.",
      ]}
    >
      <div className="mb-6 flex items-center gap-2">
        <Badge tone="solid" size="sm">Early Member</Badge>
        <span className="text-xs text-fg-muted">Slot terbatas — 5.000 pertama</span>
      </div>

      <h1 className="text-3xl font-bold text-fg md:text-4xl">Daftar gratis.</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-medium text-brand-400">Masuk</Link>
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <Field label="Username" error={fieldErrors.username}>
          <Input
            type="text"
            name="username"
            autoComplete="username"
            placeholder="kamu_keren"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <p
            className={
              "text-[11px] " +
              (username.length === 0
                ? "text-fg-subtle"
                : usernameCheck.ok
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-flame-600 dark:text-flame-400")
            }
          >
            {usernameCheck.msg}
          </p>
        </Field>

        <Field label="Email" error={fieldErrors.email}>
          <Input type="email" name="email" autoComplete="email" placeholder="nama@hoobiq.id" required />
        </Field>

        <Field label="Nomor HP" error={fieldErrors.phone}>
          <Input type="tel" name="phone" autoComplete="tel" placeholder="0812-xxxx-xxxx" minLength={8} maxLength={32} required />
          <p className="text-[11px] text-fg-subtle">Dipakai untuk receipt pembayaran & verifikasi keamanan.</p>
        </Field>

        <Field label="Password" error={fieldErrors.password}>
          <PasswordField name="password" autoComplete="new-password" placeholder="Min 8 karakter" minLength={8} required />
          <p className="text-[11px] text-fg-subtle">Min 8 karakter, campur huruf besar-kecil + angka.</p>
        </Field>

        <label className="flex items-start gap-2 text-sm text-fg-muted">
          <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 rounded border-rule accent-brand-400" />
          <span>
            Saya setuju dengan{" "}
            <Link href="/ketentuan" className="text-brand-400">Ketentuan Layanan</Link> dan{" "}
            <Link href="/privasi" className="text-brand-400">Kebijakan Privasi</Link>.
          </span>
        </label>

        {err && (
          <div role="alert" className="rounded-lg border border-flame-400/30 bg-flame-400/10 px-3 py-2 text-sm text-flame-400">
            {err}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="mt-2 w-full inline-flex items-center justify-center gap-2" disabled={pending}>
          {pending && <Spinner size={16} />}
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
