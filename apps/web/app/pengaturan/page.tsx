import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";
import { serverApi } from "@/lib/server/api";
import { ProfileForm } from "@/components/profile-form";

export const metadata = { title: "Profil · Pengaturan · Hoobiq" };
export const dynamic = "force-dynamic";

type UserPublic = {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  role: string;
  level: number;
  trustScore: number;
  createdAt: string;
};

export default async function ProfilSettingsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/masuk");

  const data = await serverApi<{ user: UserPublic }>(`/users/${session.username}`);
  const user = data?.user;

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold text-fg">Profil publik</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Informasi yang muncul di halaman profil dan kartu seller kamu.
        </p>
      </div>
      <ProfileForm
        defaults={{
          username: session.username,
          name: user?.name ?? session.name ?? "",
          bio:  user?.bio  ?? "",
          city: user?.city ?? "",
          avatarUrl: user?.avatarUrl ?? null,
        }}
      />
    </section>
  );
}
