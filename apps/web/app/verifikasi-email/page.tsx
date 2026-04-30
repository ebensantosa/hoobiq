import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { ResendEmailButton } from "@/components/resend-email-button";

export const metadata = { title: "Verifikasi email · Hoobiq" };
export const dynamic = "force-dynamic";

export default async function VerifikasiEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; email?: string; token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token?.trim();

  // If the user landed here from the email link (?token=…), validate
  // server-side and bounce to ?status=success/expired/invalid so the
  // existing branches below render the right state. Raw fetch (instead
  // of serverApi) so we can read the API's `error.code` and pick the
  // matching status — serverApi swallows non-2xx into null.
  if (token && !sp.status) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
    let next = "?status=error";
    try {
      const res = await fetch(`${apiBase}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });
      if (res.ok) {
        next = "?status=success";
      } else {
        const j = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
        const code = j?.error?.code ?? "";
        next =
          code === "expired_token" ? "?status=expired" :
          code === "invalid_token" ? "?status=invalid" :
          "?status=error";
      }
    } catch {
      next = "?status=error";
    }
    redirect(`/verifikasi-email${next}`);
  }

  const status = sp.status ?? "sent";
  const email = sp.email ?? "nama@hoobiq.id";

  if (status === "expired" || status === "invalid" || status === "error") {
    const reason =
      status === "expired" ? "Link verifikasi sudah kadaluarsa." :
      status === "invalid" ? "Link verifikasi tidak valid." :
      "Verifikasi gagal. Coba lagi atau minta link baru.";
    return (
      <AuthShell
        sideTitle="Tenang, kita kirim ulang aja."
        sideBullets={[
          "Link berlaku 24 jam sejak email diterima.",
          "Klik tombol Kirim ulang di bawah untuk dapet link baru.",
          "Pastikan kamu klik dari device yang sama dengan email kamu.",
        ]}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-flame-400/15 text-flame-500">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <h1 className="mt-6 text-3xl font-bold text-fg md:text-4xl">{reason}</h1>
        <p className="mt-3 text-sm text-fg-muted">
          Tidak masalah — minta link baru dengan tombol di bawah, lalu klik dari email terbaru.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <ResendEmailButton email={email} />
          <Link href="/masuk" className="text-center text-sm text-fg-muted hover:text-fg">
            Kembali ke masuk
          </Link>
        </div>
      </AuthShell>
    );
  }

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
        <a href="mailto:bantuan@hoobiq.id" className="text-brand-400">
          bantuan@hoobiq.id
        </a>{" "}
        kalau kesulitan.
      </p>
    </AuthShell>
  );
}
