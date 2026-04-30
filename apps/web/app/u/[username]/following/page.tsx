import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FollowingRedirect({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  redirect(`/u/${encodeURIComponent(username)}/followers?tab=following`);
}
