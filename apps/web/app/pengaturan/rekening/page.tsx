import Link from "next/link";
import { redirect } from "next/navigation";
import { BankManager } from "@/components/bank-manager";
import { getSessionUser } from "@/lib/server/session";
import { serverApi } from "@/lib/server/api";
import type { BankAccount } from "@/lib/api/banks";

export const metadata = { title: "Rekening · Pengaturan · Hoobiq" };
export const dynamic = "force-dynamic";

type KtpStatus = "none" | "pending" | "verified" | "rejected";

export default async function RekeningPage() {
  const me = await getSessionUser();
  if (!me) redirect("/masuk");

  // KTP gate per spec: payout rekening can only be added after the
  // user finishes KTP verification (or has been grandfathered with the
  // legacy boolean flag). The shape of /auth/me already includes role +
  // basic info; we fetch the verification status separately to keep
  // SessionUser stable.
  const ktp = await serverApi<{ status: KtpStatus; verified: boolean; rejectNote: string | null }>("/users/me/ktp");
  const verified = !!ktp?.verified;

  const data = await serverApi<{ items: BankAccount[] }>("/bank-accounts");

  if (!verified) {
    return (
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-fg">Rekening payout</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Hasil penjualan dicairkan ke rekening yang kamu daftarkan di sini.
          </p>
        </div>

        <div className="rounded-md border border-amber-400/40 bg-amber-400/10 p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-fg">Verifikasi KTP dulu</h3>
              {ktp?.status === "pending" ? (
                <p className="mt-1 text-sm text-fg-muted">
                  KTP kamu sedang direview tim Hoobiq. Biasanya selesai dalam 1×24 jam. Setelah disetujui, kamu bisa langsung tambah rekening payout.
                </p>
              ) : ktp?.status === "rejected" ? (
                <>
                  <p className="mt-1 text-sm text-fg-muted">
                    Verifikasi sebelumnya ditolak. Catatan tim:{" "}
                    <span className="font-semibold text-fg">{ktp.rejectNote ?? "—"}</span>.
                    Submit ulang dengan foto yang lebih jelas.
                  </p>
                  <Link
                    href="/pengaturan/verifikasi-ktp"
                    className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    Submit ulang KTP
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-fg-muted">
                    Untuk mencairkan dana, kami wajib verifikasi identitas — sesuai
                    aturan PSP &amp; perlindungan kolektor. Upload foto KTP &amp;
                    selfie 2 menit, review oleh tim 1×24 jam.
                  </p>
                  <Link
                    href="/pengaturan/verifikasi-ktp"
                    className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    Mulai verifikasi KTP
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return <BankManager initial={data?.items ?? []} />;
}
