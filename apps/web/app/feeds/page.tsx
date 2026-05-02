import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FeedCard } from "@/components/feed-card";
import { FeedComposer } from "@/components/feed-composer";
import { FollowButton } from "@/components/follow-button";
import { Avatar } from "@hoobiq/ui";
import { getSessionUser } from "@/lib/server/session";
import { serverApi } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export type FeedPost = {
  id: string;
  body: string;
  images: string[];
  cover: string | null;
  likes: number;
  comments: number;
  views: number;
  liked: boolean;
  createdAt: string;
  author: {
    username: string;
    name: string | null;
    level: number;
    city: string | null;
    avatarUrl: string | null;
  };
  pullRate?: {
    hits: number;
    pulls: number;
    communityAvg: number;
    seriesName: string;
    communityN?: number;
  } | null;
};

type CollectorMini = { username: string; name: string | null; avatarUrl: string | null; level: number };

/**
 * Single-column feed page. Old layout had multiple competing surfaces
 * (Tabs + HaulReel + SearchBar + filter chips + composer + posts +
 * Trending hashtags) which was visually noisy. New layout is just:
 *
 *   ┌── composer ─────────────────────────┐  ┌─ Top minggu ini ─┐
 *   │ Semua / Yang diikuti chip toggle    │  │                  │
 *   │ posts ↓                              │  │ Saran ikuti      │
 *   └─────────────────────────────────────┘  └──────────────────┘
 *
 * Following filter is a chip (not a separate tab page) so the user
 * never lands on a "wrong" view. Top kolektor + suggested-to-follow
 * fill the right rail.
 */
export default async function FeedsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const followingOnly = sp.tab === "following";
  const me = await getSessionUser();

  const postsQuery = followingOnly ? "/posts?limit=60&scope=following" : "/posts?limit=60";
  const [data, suggestionsRes] = await Promise.all([
    serverApi<{ items: FeedPost[] }>(postsQuery),
    me
      ? serverApi<{ items: CollectorMini[] }>("/posts/suggested-collectors").catch(() => null)
      : Promise.resolve(null),
  ]);
  const items = (data?.items ?? []).slice(0, 30);

  // Top kolektor minggu ini — sum likes+comments per author over 7 days.
  const SEVEN_DAYS = 7 * 24 * 3600 * 1000;
  const cutoff = Date.now() - SEVEN_DAYS;
  const collectorMap = new Map<string, { username: string; name: string | null; avatarUrl: string | null; score: number; posts: number }>();
  for (const p of items) {
    if (new Date(p.createdAt).getTime() < cutoff) continue;
    const cur = collectorMap.get(p.author.username) ?? {
      username: p.author.username, name: p.author.name, avatarUrl: p.author.avatarUrl,
      score: 0, posts: 0,
    };
    cur.score += p.likes + p.comments;
    cur.posts += 1;
    collectorMap.set(p.author.username, cur);
  }
  const topCollectors = Array.from(collectorMap.values())
    .sort((a, b) => b.score - a.score || b.posts - a.posts)
    .slice(0, 5);

  return (
    <AppShell active="Feeds">
      <div className="mx-auto grid max-w-[1100px] gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-10">
        <section className="flex flex-col gap-5">
          <div>
            <h1 className="text-2xl font-bold text-fg sm:text-3xl">Feeds</h1>
            <p className="mt-1 text-sm text-fg-muted">
              Pamer pull rate, koleksi baru, atau cerita kolektor — dari komunitas Hoobiq.
            </p>
          </div>

          {/* Filter chip — Semua vs Yang diikuti. Just two states; no
              "Hot/New/Following/For-You" tab maze. */}
          <div className="flex items-center gap-2">
            <Chip href="/feeds" active={!followingOnly}>Semua post</Chip>
            <Chip href="/feeds?tab=following" active={followingOnly}>Yang diikuti</Chip>
          </div>

          {me && (
            <div className="relative">
              <FeedComposer me={{ username: me.username, name: me.name, avatarUrl: me.avatarUrl }} />
            </div>
          )}

          {items.length === 0 ? (
            <div className="rounded-2xl border border-rule bg-panel/40 p-10 text-center">
              <p className="text-base font-semibold text-fg">
                {followingOnly ? "Belum ada post dari yang kamu ikuti" : "Feed masih sepi"}
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                {followingOnly
                  ? "Buka profil kolektor di marketplace, tekan Follow biar post mereka muncul di sini."
                  : "Jadi yang pertama nge-post — pamerin koleksimu di kotak di atas."}
              </p>
              {followingOnly && (
                <Link href="/feeds" className="mt-4 inline-block text-sm font-semibold text-brand-500 hover:text-brand-600">
                  Lihat semua post →
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {items.map((p) => (
                <FeedCard key={p.id} post={p} meUsername={me?.username} meAvatarUrl={me?.avatarUrl} />
              ))}
            </div>
          )}
        </section>

        <aside className="hidden flex-col gap-5 lg:flex">
          <TopCollectors items={topCollectors} />
          {me && suggestionsRes?.items && suggestionsRes.items.length > 0 && (
            <SuggestedToFollow items={suggestionsRes.items} />
          )}
        </aside>
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------- */

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors " +
        (active
          ? "border-brand-500 bg-brand-500 text-white shadow-sm"
          : "border-rule bg-panel text-fg-muted hover:border-brand-400/60 hover:text-fg")
      }
    >
      {children}
    </Link>
  );
}

function TopCollectors({
  items,
}: {
  items: { username: string; name: string | null; avatarUrl: string | null; score: number; posts: number }[];
}) {
  return (
    <div className="rounded-2xl border border-rule bg-gradient-to-br from-brand-500/10 to-ultra-500/10 p-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">Top minggu ini</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-fg-muted">
          Belum ada engagement minggu ini. Posting + like buat naik leaderboard.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {items.map((c, i) => (
            <li key={c.username}>
              <Link
                href={`/u/${encodeURIComponent(c.username)}`}
                className="flex items-center gap-3 rounded-lg p-1 transition-colors hover:bg-canvas/40"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500 font-mono text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <Avatar
                  letter={(c.name ?? c.username)[0]?.toUpperCase() ?? "U"}
                  size="sm"
                  src={c.avatarUrl}
                  alt={`@${c.username}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{c.name ?? `@${c.username}`}</p>
                  <p className="truncate text-[11px] text-fg-muted">{c.posts} post · {c.score} eng</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SuggestedToFollow({ items }: { items: CollectorMini[] }) {
  return (
    <div className="rounded-2xl border border-rule bg-panel p-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-fg-subtle">Saran ikuti</h3>
      <p className="mt-1 text-[11px] text-fg-subtle">Kolektor aktif yang belum kamu follow.</p>
      <ul className="mt-3 flex flex-col gap-3">
        {items.slice(0, 5).map((u) => (
          <li key={u.username} className="flex items-center gap-3">
            <Link href={`/u/${encodeURIComponent(u.username)}`} className="flex min-w-0 flex-1 items-center gap-2.5">
              <Avatar
                letter={(u.name ?? u.username)[0]?.toUpperCase() ?? "U"}
                size="sm"
                src={u.avatarUrl}
                alt={`@${u.username}`}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{u.name ?? `@${u.username}`}</p>
                <p className="truncate text-[11px] text-fg-muted">@{u.username} · LV {u.level}</p>
              </div>
            </Link>
            <FollowButton username={u.username} initialFollowing={false} />
          </li>
        ))}
      </ul>
    </div>
  );
}
