import Link from "next/link";
import { Button, Input, Label } from "@hoobiq/ui";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Masuk Admin · Hoobiq", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <AuthShell
      sideTitle="Panel admin Hoobiq."
      sideBullets={[
        "Akses dibatasi ke tim Trust & Safety, Ops, dan Engineering.",
        "Wajib 2FA aktif. Sesi otomatis expired setelah 4 jam tidak aktif.",
        "Semua tindakan tercatat di audit log dan tidak bisa dihapus.",
      ]}
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-400/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400">
        Restricted access
      </div>

      <h1 className="text-3xl font-bold text-fg md:text-4xl">Masuk admin.</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Hanya untuk akun dengan role <code>admin</code> atau <code>ops</code>. Bukan admin?{" "}
        <Link href="/masuk" className="text-brand-400 hover:underline">
          Masuk sebagai pengguna
        </Link>
      </p>

      <form className="mt-8 flex flex-col gap-5">
        <Field label="Email kerja">
          <Input type="email" name="email" autoComplete="email" placeholder="kamu@hoobiq.id" required />
        </Field>
        <Field label="Password">
          <Input type="password" name="password" autoComplete="current-password" placeholder="••••••••" required />
        </Field>
        <Field label="Kode 2FA">
          <Input
            type="text"
            name="totp"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="6 digit dari authenticator"
            required
          />
        </Field>

        <Button variant="primary" size="lg" className="mt-2 w-full">
          Masuk ke panel
        </Button>
      </form>

      <p className="mt-8 rounded-xl border border-rule bg-panel/60 p-4 text-xs leading-relaxed text-fg-muted">
        Akses admin diberikan atas dasar peran, bukan akun pribadi. Jangan pernah membagikan
        kredensial. Laporkan aktivitas mencurigakan ke{" "}
        <a href="mailto:security@hoobiq.id" className="text-brand-400 hover:underline">
          security@hoobiq.id
        </a>
        .
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
