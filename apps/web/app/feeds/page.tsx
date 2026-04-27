import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FeedCard } from "@/components/feed-card";
import { FeedComposer } from "@/components/feed-composer";
import { HaulReel, type HaulItem } from "@/components/haul-reel";
import { DropHero, type DropSummary } from "@/components/drop-hero";
import { PageHero } from "@/components/page-hero";
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
  /** Present only on blind-box pull posts; surfaces the inline Pull Rate widget. */
  pullRate?: {
    hits: number;
    pulls: number;
    communityAvg: number;
    seriesName: string;
    communityN?: number;
  } | null;
};

export default async function FeedsPage() {
  const [data, me, drops] = await Promise.all([
    serverApi<{ items: FeedPost[] }>("/posts?limit=24"),
    getSessionUser(),
    serverApi<DropSummary[]>("/drops/upcoming"),
  ]);
  const items = data?.items ?? [];

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
      <div className="mx-auto grid max-w-[1100px] gap-8 px-6 pb-8 lg:grid-cols-[1fr_280px] lg:px-10">
        <section className="flex flex-col gap-6">
          <PageHero
            eyebrow="Feeds"
            title="Komunitas Hoobiq"
            subtitle="Pamer koleksi, share pull rate, diskusi sub-seri sama kolektor lain."
            tone="brand"
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.5"/></svg>}
          />

          <DropHero initial={drops ?? []} />

          <HaulReel items={hauls} />

          {me && <FeedComposer me={{ username: me.username, name: me.name, avatarUrl: me.avatarUrl }} />}

          {items.length === 0 ? (
            <div className="rounded-2xl border border-rule bg-panel/40 p-10 text-center text-fg-muted">
              <p className="text-base font-medium text-fg">Feed masih sepi</p>
              <p className="mt-1 text-sm">
                Jadi yang pertama nge-post! Atau lihat{" "}
                <Link href="/marketplace" className="text-brand-500 hover:underline">marketplace</Link> dulu.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {items.map((p) => <FeedCard key={p.id} post={p} meUsername={me?.username} />)}
            </div>
          )}
        </section>

        {/* Right rail — trending hashtags + spotlight collectors */}
        <aside className="hidden flex-col gap-6 lg:flex">
          <SidePanel title="Topik Trending" items={[
            { tag: "#crownzenith",     count: 24 },
            { tag: "#labubu",          count: 18 },
            { tag: "#raidenshogun",    count: 12 },
            { tag: "#chainsawman",     count:  9 },
            { tag: "#opcg",            count:  7 },
          ]} />
          <SpotlightCollectors />
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
    </div>
  );
}

function SpotlightCollectors() {
  // Public ranking — would be a real endpoint later. For now we show a teaser.
  return (
    <div className="rounded-2xl border border-rule bg-gradient-to-br from-brand-50 to-ultra-50 p-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-brand-500">Top minggu ini</h3>
      <p className="mt-2 text-sm text-fg-muted">
        Kolektor dengan post & engagement tertinggi muncul di sini setiap Senin.
      </p>
      <Link href="/marketplace" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-500 hover:underline">
        Lihat papan peringkat →
      </Link>
    </div>
  );
}
