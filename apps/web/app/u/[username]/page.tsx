import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PassportHero, type Passport, type PassportUser } from "@/components/passport-hero";
import { PassportTabs } from "@/components/passport-tabs";
import { serverApi } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

type CollectionItem = {
  id: string;
  slug: string;
  title: string;
  priceIdr: number;
  cover: string | null;
  condition: string;
  category: { slug: string; name: string } | null;
};

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const [profile, collection, me] = await Promise.all([
    serverApi<{ user: PassportUser; passport: Passport; follow?: { followers: number; following: number; isFollowing: boolean } }>(`/users/${encodeURIComponent(username)}`),
    serverApi<{ items: CollectionItem[] }>(`/users/${encodeURIComponent(username)}/collection`),
    getSessionUser(),
  ]);

  if (!profile?.user) notFound();

  const isOwn = me?.username === profile.user.username;

  return (
    <AppShell active="Feeds">
      <div className="mx-auto max-w-[1100px] px-4 pb-12 md:px-6 lg:px-10">
        <PassportHero user={profile.user} passport={profile.passport} isOwn={isOwn} follow={profile.follow} />
        <PassportTabs username={username} initialCollection={collection?.items ?? []} isOwn={isOwn} />
      </div>
    </AppShell>
  );
}
