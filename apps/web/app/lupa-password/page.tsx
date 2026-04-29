import Link from "next/link";
import { Button, Input, Label } from "@hoobiq/ui";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Lupa password · Hoobiq" };

export default function LupaPasswordPage() {
  return (
    <AuthShell
      sideTitle="Tenang, akun kamu tetap aman."
      sideBullets={[
        "Kami kirim tautan reset ke email kamu.",
        "Tautan berlaku 30 menit.",
        "Kalau tidak menerima email, cek folder spam atau kontak bantuan@hoobiq.id.",
      ]}
    >
      <h1 className="text-3xl font-bold text-fg md:text-4xl">Reset password.</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Masukkan email yang kamu daftarkan — kami kirim tautan reset dalam 1–2 menit.
      </p>

      <form className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label>Email</Label>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="nama@hoobiq.id"
            required
          />
        </div>

        <Button variant="primary" size="lg" className="mt-2 w-full">
          Kirim tautan reset
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
