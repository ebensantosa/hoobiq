import { redirect } from "next/navigation";
import { KtpForm } from "./ktp-form";
import { getSessionUser } from "@/lib/server/session";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Verifikasi KTP · Pengaturan · Hoobiq" };
export const dynamic = "force-dynamic";

type Status = {
  status: "none" | "pending" | "verified" | "rejected";
  verified: boolean;
  rejectNote: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
};

export default async function VerifikasiKtpPage() {
  const me = await getSessionUser();
  if (!me) redirect("/masuk?next=/pengaturan/verifikasi-ktp");

  const status = await serverApi<Status>("/users/me/ktp");

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-fg">Verifikasi KTP</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Wajib untuk seller yang ingin menarik dana ke rekening bank. Foto
          dipakai sekali untuk verifikasi identitas, gak ditampilkan di profil
          publik.
        </p>
      </div>

      <KtpForm initialStatus={status ?? { status: "none", verified: false, rejectNote: null, submittedAt: null, verifiedAt: null }} />

      <ul className="space-y-2 text-xs text-fg-muted">
        <li>· KTP harus utuh & terbaca jelas (NIK, nama, foto).</li>
        <li>· Selfie sambil pegang KTP yang sama, wajah & teks terlihat.</li>
        <li>· Foto akan dihapus dari sistem 90 hari setelah verifikasi.</li>
        <li>· Data tidak dijual atau dipakai di luar verifikasi Hoobiq.</li>
      </ul>
    </section>
  );
}
