import { AdminShell } from "@/components/admin-shell";
import { KycModerator } from "./moderator";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Verifikasi KTP · Admin · Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type KycItem = {
  id: string;
  username: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  city: string | null;
  status: "pending" | "verified" | "rejected";
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectNote: string | null;
  frontUrl: string | null;
  selfieUrl: string | null;
};

export default async function AdminKycPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status === "verified" || sp.status === "rejected" ? sp.status : "pending";
  const data = await serverApi<{ items: KycItem[] }>(`/users/kyc?status=${status}`);
  const items = data?.items ?? [];

  return (
    <AdminShell active="KYC">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Verifikasi KTP</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Approve atau reject submission KTP user. Yang lolos verifikasi
            bisa langsung tambah rekening payout di /pengaturan/rekening.
            Yang ditolak harus submit ulang dengan foto baru.
          </p>
        </div>
        <KycModerator initial={items} status={status} />
      </div>
    </AdminShell>
  );
}
