import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";

export const dynamic = "force-dynamic";

type FollowUser = { username: string; name: string | null; avatarUrl: string | null; level: number };

export default async function FollowersPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const sp = await searchParams;
  const tab = sp.tab === "following" ? "following" : "followers";

  const [profile, list] = await Promise.all([
    serverApi<{ user: { username: string; name: string | null } }>(`/users/${encodeURIComponent(username)}`),
    serverApi<{ items: FollowUser[] }>(`/users/${encodeURIComponent(username)}/${tab}`),
  ]);

  if (!profile?.user) notFound();
  const items = list?.items ?? [];

  return (
    <AppShell active="Feeds">
      <div className="mx-auto max-w-[720px] px-4 pb-12 md:px-6 lg:px-10">
        <Link href={`/u/${username}`} className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
          ← {profile.user.name ?? `@${profile.user.username}`}
        </Link>

        <div className="mt-4 flex gap-1 border-b border-rule">
          <Tab href={`/u/${username}/followers`} active={tab === "followers"}>Pengikut</Tab>
          <Tab href={`/u/${username}/following?tab=following`} active={tab === "following"}>Diikuti</Tab>
        </div>

        {items.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-rule bg-panel/40 p-8 text-center text-sm text-fg-muted">
            {tab === "followers" ? "Belum ada yang mengikuti." : "Belum mengikuti siapa pun."}
          </p>
        ) : (
          <ul className="mt-6 grid gap-2">
            {items.map((u) => (
              <li key={u.username}>
                <Link
                  href={`/u/${u.username}`}
                  className="flex items-center gap-3 rounded-xl border border-rule bg-panel p-3 transition-colors hover:border-brand-400/50"
                >
                  <Avatar letter={(u.name ?? u.username)[0]?.toUpperCase() ?? "U"} size="md" src={u.avatarUrl} alt={`@${u.username}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{u.name ?? `@${u.username}`}</p>
                    <p className="truncate text-xs text-fg-muted">@{u.username} · LV {u.level}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "border-b-2 px-3 py-2 text-sm font-semibold transition-colors " +
        (active ? "border-brand-500 text-brand-500" : "border-transparent text-fg-muted hover:text-fg")
      }
    >
      {children}
    </Link>
  );
}
