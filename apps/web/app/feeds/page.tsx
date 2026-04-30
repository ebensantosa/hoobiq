import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FeedCard } from "@/components/feed-card";
import { FeedComposer } from "@/components/feed-composer";
import { FeedSearchBar } from "@/components/feed-search-bar";
import { FeedTabs } from "@/components/feed-tabs";
import { HaulReel, type HaulItem } from "@/components/haul-reel";
import { ListingFeedCard } from "@/components/listing-feed-card";
import { getSessionUser } from "@/lib/server/session";
import { serverApi } from "@/lib/server/api";
import type { ListingSummary } from "@hoobiq/types";

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
  /** Present only on blind-box pull posts; surfaces the inline Pull Rate widget. */
  pullRate?: {
    hits: number;
    pulls: number;
    communityAvg: number;
    seriesName: string;
    communityN?: number;
  } | null;
};

export default async function FeedsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; include?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  // The `tab` param is read by the FeedTabs visual switch; on the server
  // we just use it as a signal for the "Following" hint banner. Real
  // filtering kicks in when the follow graph lands.
  const followingTab = sp.tab === "following";
  const rawQ = (sp.q ?? "").trim().toLowerCase();
  // Multi-select filter via `?include=posts,listings,following`. Empty =
  // default (everything). The "following" key is parsed but treated as a
  // pass-through until the follow graph lands.
  const includeRaw = (sp.include ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const include = new Set(includeRaw);
  const noFilter = include.size === 0;
  const wantsPosts    = noFilter || include.has("posts") || include.has("following");
  const wantsListings = noFilter || include.has("listings");
  const followingOnly = include.has("following") || followingTab;
  const listingQuery = sp.q ? `/listings?q=${encodeURIComponent(sp.q)}&limit=12` : "/listings?sort=newest&limit=12";

  const postsQuery = followingOnly ? "/posts?limit=60&scope=following" : "/posts?limit=60";
  const [data, listingsRes, me] = await Promise.all([
    serverApi<{ items: FeedPost[] }>(postsQuery),
    wantsListings ? serverApi<{ items: ListingSummary[] }>(listingQuery) : Promise.resolve(null),
    getSessionUser(),
  ]);
  const allPosts = data?.items ?? [];
  const filteredPosts = rawQ
    ? allPosts.filter((p) =>
        p.body?.toLowerCase().includes(rawQ) ||
        p.author.username.toLowerCase().includes(rawQ) ||
        (p.author.name ?? "").toLowerCase().includes(rawQ),
      )
    : allPosts;
  const items = wantsPosts ? filteredPosts.slice(0, 24) : [];
  const listingItems = wantsListings ? (listingsRes?.items ?? []) : [];

  // Trending hashtags — extract #foo / #bar from post bodies, count, top 5.
  // Falls back to empty (rendered as "no data") if no posts contain tags.
  const tagCounts = new Map<string, number>();
  for (const p of allPosts) {
    const matches = (p.body ?? "").match(/#[\p{L}\p{N}_]+/gu) ?? [];
    for (const raw of matches) {
      const tag = raw.toLowerCase();
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const trending = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  // Top kolektor minggu ini — group posts in the last 7 days by author,
  // score = sum(likes) + sum(comments). Real engagement signal, no fake numbers.
  const SEVEN_DAYS = 7 * 24 * 3600 * 1000;
  const cutoff = Date.now() - SEVEN_DAYS;
  type CollectorAgg = { username: string; name: string | null; avatarUrl: string | null; score: number; posts: number };
  const collectorMap = new Map<string, CollectorAgg>();
  for (const p of allPosts) {
    if (new Date(p.createdAt).getTime() < cutoff) continue;
    const cur = collectorMap.get(p.author.username) ?? {
      username: p.author.username,
      name: p.author.name,
      avatarUrl: p.author.avatarUrl,
      score: 0, posts: 0,
    };
    cur.score += p.likes + p.comments;
    cur.posts += 1;
    collectorMap.set(p.author.username, cur);
  }
  const topCollectors = Array.from(collectorMap.values())
    .sort((a, b) => b.score - a.score || b.posts - a.posts)
    .slice(0, 5);

  // Surface posts with imagery as Haul Reel entries. When a real /hauls
  // endpoint exists with video uploads, swap the source — the component
  // already supports `videoUrl` and `live`.
  const hauls: HaulItem[] = items
    .filter((p) => (p.cover ?? p.images[0]) != null)
    .slice(0, 12)
    .map((p) => ({
      id: p.id,
      videoUrl: null,
      posterUrl: (p.cover ?? p.images[0])!,
      caption: p.body?.slice(0, 140) ?? null,
      live: false,
      seller: {
        username: p.author.username,
        name: p.author.name,
        avatarUrl: p.author.avatarUrl,
      },
      listing: null,
    }));

  return (
    <AppShell active="Feeds">
      <div className="mx-auto grid max-w-[1100px] gap-6 px-4 pb-8 sm:px-6 sm:gap-8 lg:grid-cols-[1fr_280px] lg:px-10">
        <section className="flex flex-col gap-5">
          <FeedTabs />

          <HaulReel items={hauls} />

          <FeedSearchBar />

          {me && wantsPosts && (
            <FeedComposer me={{ username: me.username, name: me.name, avatarUrl: me.avatarUrl }} />
          )}

          {followingOnly && items.length === 0 && (
            <div className="rounded-2xl border border-rule bg-panel/40 p-4 text-sm text-fg-muted">
              Belum ada post dari kolektor yang kamu follow. Cek profil kolektor di Marketplace dan tekan Follow.
            </div>
          )}

          {/* Unified feed — posts and listings interleaved by createdAt
              into a single stream. The eye reads it as one timeline of
              "what's happening on Hoobiq right now" instead of two
              stacked sections. */}
          {(() => {
            type Entry =
              | { kind: "post"; at: number; post: typeof items[number] }
              | { kind: "listing"; at: number; listing: typeof listingItems[number] };
            const entries: Entry[] = [
              ...items.map((p) => ({ kind: "post" as const, at: new Date(p.createdAt).getTime(), post: p })),
              ...listingItems.map((l) => ({ kind: "listing" as const, at: new Date(l.createdAt).getTime(), listing: l })),
            ].sort((a, b) => b.at - a.at);

            if (entries.length === 0) {
              return (
                <div className="rounded-2xl border border-rule bg-panel/40 p-10 text-center text-fg-muted">
                  <p className="text-base font-medium text-fg">
                    {rawQ ? `Tidak ada hasil untuk “${sp.q}”` : "Feed masih sepi"}
                  </p>
                  <p className="mt-1 text-sm">
                    {rawQ
                      ? "Coba kata kunci lain, atau ganti filter."
                      : <>Jadi yang pertama nge-post! Atau lihat{" "}
                          <Link href="/marketplace" className="text-brand-500">marketplace</Link> dulu.</>}
                  </p>
                </div>
              );
            }
            return (
              <div className="flex flex-col gap-6">
                {entries.map((e) =>
                  e.kind === "post" ? (
                    <FeedCard key={`p:${e.post.id}`} post={e.post} meUsername={me?.username} />
                  ) : (
                    <ListingFeedCard
                      key={`l:${e.listing.id}`}
                      listing={e.listing}
                      meUsername={me?.username ?? null}
                    />
                  ),
                )}
              </div>
            );
          })()}
        </section>

        {/* Right rail — real trending hashtags + top collectors of the week */}
        <aside className="hidden flex-col gap-6 lg:flex">
          <SidePanel title="Topik Trending" items={trending} />
          <SpotlightCollectors items={topCollectors} />
        </aside>
      </div>
    </AppShell>
  );
}

function SidePanel({ title, items }: { title: string; items: { tag: string; count: number }[] }) {
  return (
    <div className="rounded-2xl border border-rule bg-panel">
      <h3 className="border-b border-rule px-5 py-3 text-xs font-bold uppercase tracking-widest text-fg-subtle">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="px-5 py-4 text-xs text-fg-subtle">
          Belum ada hashtag dipakai. Tambah #tag di post kamu — lima paling sering muncul di sini.
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map((it) => (
            <li key={it.tag}>
              <Link
                href={`/marketplace?q=${encodeURIComponent(it.tag.replace("#", ""))}`}
                className="flex items-center justify-between px-5 py-2.5 text-sm transition-colors hover:bg-panel-2"
              >
                <span className="font-medium text-fg">{it.tag}</span>
                <span className="font-mono text-xs text-fg-subtle">{it.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SpotlightCollectors({
  items,
}: {
  items: { username: string; name: string | null; avatarUrl: string | null; score: number; posts: number }[];
}) {
  return (
    <div className="rounded-2xl border border-rule bg-gradient-to-br from-brand-50 to-ultra-50 p-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-brand-500">Top minggu ini</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-fg-muted">
          Belum ada post minggu ini. Jadi yang pertama nge-post — kolektor dengan engagement tertinggi muncul di sini.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {items.map((c, i) => (
            <li key={c.username}>
              <Link
                href={`/u/${encodeURIComponent(c.username)}`}
                className="flex items-center gap-3 rounded-lg px-1 py-1 text-sm transition-colors hover:bg-white/40"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500 font-mono text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-panel font-bold text-fg-muted">
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (c.name ?? c.username)[0]?.toUpperCase()
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-fg">{c.name ?? `@${c.username}`}</p>
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
