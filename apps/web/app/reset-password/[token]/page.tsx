import Link from "next/link";
import { Button, Input, Label } from "@hoobiq/ui";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Buat password baru · Hoobiq" };

export default function ResetPasswordConfirmPage() {
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

      <form className="mt-8 flex flex-col gap-5">
        <Field label="Password baru">
          <Input type="password" name="password" autoComplete="new-password" placeholder="••••••••" minLength={8} required />
        </Field>
        <Field label="Ulangi password baru">
          <Input type="password" name="confirm" autoComplete="new-password" placeholder="••••••••" minLength={8} required />
        </Field>

        <Button variant="primary" size="lg" className="mt-2 w-full">
          Simpan password baru
        </Button>
      </form>

      <p className="mt-8 text-xs text-fg-subtle">
        Tautan reset kadaluarsa?{" "}
        <Link href="/lupa-password" className="text-brand-400 hover:underline">
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
