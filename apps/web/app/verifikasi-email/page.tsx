import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ResendEmailButton } from "@/components/resend-email-button";

export const metadata = { title: "Verifikasi email · Hoobiq" };

export default function VerifikasiEmailPage({
  searchParams,
}: {
  searchParams: { status?: string; email?: string };
}) {
  const status = searchParams.status ?? "sent";
  const email = searchParams.email ?? "nama@hoobiq.id";

  if (status === "success") {
    return (
      <AuthShell
        sideTitle="Akun kamu sekarang aktif."
        sideBullets={[
          "Pasang listing pertama kamu.",
          "Klaim Early Member badge + 100 EXP.",
          "Ikuti kategori favorit & kirim Pesan ke seller langsung.",
        ]}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-400/15 text-brand-400">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h1 className="mt-6 text-3xl font-bold text-fg md:text-4xl">Email terverifikasi.</h1>
        <p className="mt-3 text-sm text-fg-muted">
          Akun kamu sudah aktif sepenuhnya. Yuk mulai eksplor.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/onboarding"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-400 px-6 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Lanjut ke onboarding
          </Link>
          <Link href="/marketplace" className="text-center text-sm text-fg-muted hover:text-fg">
            Atau langsung ke marketplace
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      sideTitle="Cek inbox kamu dulu."
      sideBullets={[
        "Email verifikasi kami kirim dari noreply@hoobiq.id.",
        "Tautan berlaku 24 jam.",
        "Kalau belum masuk dalam 3 menit, cek folder spam atau promosi.",
      ]}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-400/15 text-brand-400">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
      </div>
      <h1 className="mt-6 text-3xl font-bold text-fg md:text-4xl">
        Cek email kamu.
      </h1>
      <p className="mt-3 text-sm text-fg-muted">
        Kami kirim tautan verifikasi ke{" "}
        <b className="text-fg">{email}</b>. Klik tautan di email untuk mengaktifkan akun.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <ResendEmailButton email={email} />
        <Link href="/masuk" className="text-center text-sm text-fg-muted hover:text-fg">
          Kembali ke masuk
        </Link>
      </div>

      <p className="mt-10 rounded-xl border border-rule bg-panel/60 p-4 text-xs leading-relaxed text-fg-muted">
        <b className="text-fg">Salah alamat email?</b> Kamu bisa mengubah email sebelum
        verifikasi dari halaman ini. Kontak{" "}
        <a href="mailto:bantuan@hoobiq.id" className="text-brand-400 hover:underline">
          bantuan@hoobiq.id
        </a>{" "}
        kalau kesulitan.
      </p>
    </AuthShell>
  );
}
