"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

type Tab = "koleksi" | "aktivitas" | "trades";

type CollectionItem = {
  id: string;
  slug: string;
  title: string;
  priceIdr: number;
  cover: string | null;
  condition: string;
  category: { slug: string; name: string } | null;
};

type ActivityItem = {
  id: string;
  body: string;
  cover: string | null;
  likes: number;
  comments: number;
  views: number;
  createdAt: string;
};

type TradeItem = {
  id: string;
  gave: string;
  got: string;
  counterparty: string;
  completedAt: string;
};

const fmtIdr = (n: number): string => {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}jt`;
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
};

export function PassportTabs({
  username,
  initialCollection,
  isOwn = false,
}: {
  username: string;
  initialCollection: CollectionItem[];
  isOwn?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("koleksi");

  return (
    <div className="mt-8">
      <div className="flex gap-1 border-b border-rule">
        <TabBtn active={tab === "koleksi"}   onClick={() => setTab("koleksi")}  >Koleksi</TabBtn>
        <TabBtn active={tab === "aktivitas"} onClick={() => setTab("aktivitas")}>Aktivitas</TabBtn>
        <TabBtn active={tab === "trades"}    onClick={() => setTab("trades")}   >Trade history</TabBtn>
      </div>

      <div className="mt-6">
        {tab === "koleksi"   && <CollectionTab username={username} initial={initialCollection} isOwn={isOwn} />}
        {tab === "aktivitas" && <ActivityTab   username={username} isOwn={isOwn} />}
        {tab === "trades"    && <TradeHistoryTab username={username} />}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "relative px-4 py-2.5 text-sm font-semibold transition-colors " +
        (active ? "text-fg" : "text-fg-muted hover:text-fg")
      }
    >
      {children}
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-brand-500 via-flame-500 to-brand-500"
        />
      )}
    </button>
  );
}

/* ============================================================ KOLEKSI */

function CollectionTab({ username, initial, isOwn }: { username: string; initial: CollectionItem[]; isOwn: boolean }) {
  const [items, setItems] = useState(initial);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Build filter pills from the initial set — no extra fetch needed
  const cats = uniqueCats(initial);

  async function selectCat(slug: string | null) {
    if (slug === activeCat) return;
    setActiveCat(slug);
    setLoading(true);
    try {
      const data = await api<{ items: CollectionItem[] }>(
        `/users/${encodeURIComponent(username)}/collection${slug ? `?category=${encodeURIComponent(slug)}` : ""}`
      );
      setItems(data.items);
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {cats.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <FilterPill active={activeCat === null} onClick={() => selectCat(null)}>Semua</FilterPill>
          {cats.map((c) => (
            <FilterPill key={c.slug} active={activeCat === c.slug} onClick={() => selectCat(c.slug)}>
              {c.name}
            </FilterPill>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <CollectionEmpty isOwn={isOwn} username={username} hasFilter={activeCat !== null} />
      ) : (
        <DisplayCase items={items} dim={loading} />
      )}
    </div>
  );
}

/**
 * Display-case grid — items sit in cells with a soft inner shadow and a
 * top "shelf" highlight so the row reads like glass shelves in a curio
 * cabinet. Items lift on hover with a subtle tilt.
 */
function DisplayCase({ items, dim }: { items: CollectionItem[]; dim: boolean }) {
  return (
    <div
      className={
        "rounded-2xl border border-rule p-3 transition-opacity " +
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.6),rgba(0,0,0,0.02))] " +
        "dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.25))] " +
        (dim ? "opacity-50 " : "")
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((it) => (
          <CaseCell key={it.id} item={it} />
        ))}
      </div>
    </div>
  );
}

function CaseCell({ item }: { item: CollectionItem }) {
  return (
    <Link
      href={`/listing/${item.slug}`}
      className=" group relative flex flex-col overflow-hidden rounded-xl border border-rule bg-canvas
        shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_2px_6px_-2px_rgba(0,0,0,0.08)]
        transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_12px_24px_-10px_rgba(231,85,159,0.4)]"
    >
      {/* Shelf highlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:via-white/40"
      />

      <div className="relative aspect-square overflow-hidden bg-panel-2">
        {item.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-50 to-flame-50 font-mono text-xs text-fg-subtle dark:from-brand-500/10 dark:to-flame-500/10">
            No img
          </div>
        )}
        {/* Glass reflection */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.18) 0%, transparent 35%, transparent 100%)",
          }}
        />
        <span className="absolute right-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-white backdrop-blur">
          {item.condition}
        </span>
      </div>

      <div className="flex flex-col gap-0.5 px-2.5 py-2">
        <p className="line-clamp-2 text-xs font-semibold text-fg">{item.title}</p>
        <p className="font-mono text-[11px] font-bold tabular-nums text-brand-500">
          {fmtIdr(item.priceIdr)}
        </p>
      </div>
    </Link>
  );
}

function FilterPill({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
        (active
          ? "border-brand-500 bg-brand-500 text-white"
          : "border-rule text-fg-muted hover:border-brand-300 hover:text-brand-500")
      }
    >
      {children}
    </button>
  );
}

function uniqueCats(items: CollectionItem[]): { slug: string; name: string }[] {
  const map = new Map<string, string>();
  for (const it of items) if (it.category) map.set(it.category.slug, it.category.name);
  return [...map.entries()].map(([slug, name]) => ({ slug, name }));
}

/* ============================================================ AKTIVITAS */

function CollectionEmpty({
  isOwn, username, hasFilter,
}: { isOwn: boolean; username: string; hasFilter: boolean }) {
  if (hasFilter) {
    return (
      <div className="rounded-2xl border border-dashed border-rule bg-panel/40 p-10 text-center">
        <p className="text-sm font-medium text-fg">Tidak ada item di kategori ini.</p>
        <p className="mt-1 text-xs text-fg-subtle">Coba pilih kategori lain.</p>
      </div>
    );
  }
  return (
    <div
      className=" relative overflow-hidden rounded-3xl border border-rule
        bg-[radial-gradient(120%_90%_at_0%_0%,rgba(231,85,159,0.08),transparent_50%),radial-gradient(120%_90%_at_100%_100%,rgba(250,167,74,0.08),transparent_50%)]
        bg-panel/30
        px-6 py-12 text-center"
    >
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-flame-500/15 ring-1 ring-rule">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/>
        </svg>
      </div>
      <h3 className="mt-5 text-lg font-bold tracking-tight text-fg">
        {isOwn ? "Rak koleksimu masih kosong" : `@${username} belum punya koleksi publik`}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">
        {isOwn
          ? "Mulai pasang listing kamu — figure, trading card, blind box, atau merch — biar kolektor lain bisa lihat dan trade."
          : "Belum ada listing yang dipublikasi. Coba ikuti dulu, nanti kalau ada upload baru kamu bakal kebagian."}
      </p>
      {isOwn && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/upload"
            className=" inline-flex items-center gap-2 rounded-xl
              bg-gradient-to-r from-brand-500 to-flame-500 px-5 py-2.5
              text-sm font-bold text-white
              shadow-[0_10px_24px_-8px_rgba(231,85,159,0.6)]
              transition-transform hover:-translate-y-0.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Pasang listing pertama
          </Link>
          <Link
            href="/jual"
            className="text-xs font-medium text-fg-muted underline-offset-4 hover:text-fg"
          >
            Atau buka dashboard jual
          </Link>
        </div>
      )}
    </div>
  );
}

function ActivityTab({ username, isOwn }: { username: string; isOwn: boolean }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  useEffect(() => {
    api<{ items: ActivityItem[] }>(`/users/${encodeURIComponent(username)}/activity`)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, [username]);

  if (items === null) return <Skeleton rows={3} />;
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-rule bg-panel/40 px-6 py-12 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-flame-500/15 ring-1 ring-rule">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.5"/></svg>
        </div>
        <p className="mt-4 text-sm font-medium text-fg">
          {isOwn ? "Belum ada postingan." : `@${username} belum posting apa-apa.`}
        </p>
        {isOwn && (
          <Link href="/feeds" className="mt-3 inline-block text-xs font-semibold text-brand-500">
            Buat postingan pertama
          </Link>
        )}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((p) => (
        <li key={p.id} className="flex gap-3 rounded-2xl border border-rule bg-panel p-4">
          {p.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.cover} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-3 text-sm leading-relaxed text-fg">{p.body}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[11px] text-fg-subtle">
              <span>{relTime(p.createdAt)}</span>
              <span>♥ {p.likes}</span>
              <span>💬 {p.comments}</span>
              <span>👁 {p.views}</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================ TRADE HISTORY */

function TradeHistoryTab({ username }: { username: string }) {
  const [items, setItems] = useState<TradeItem[] | null>(null);
  useEffect(() => {
    api<{ items: TradeItem[] }>(`/users/${encodeURIComponent(username)}/trades`)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, [username]);

  if (items === null) return <Skeleton rows={3} />;
  if (items.length === 0) return <EmptyState text="Belum ada trade selesai." />;

  return (
    <ul className="flex flex-col gap-3">
      {items.map((t) => (
        <li
          key={t.id}
          className="grid items-center gap-3 rounded-2xl border border-rule bg-panel p-4 sm:grid-cols-[1fr_auto_1fr_auto]"
        >
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-fg-subtle">Kasih</p>
            <p className="line-clamp-2 text-sm font-semibold text-fg">{t.gave}</p>
          </div>
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-[#7F77DD]/15 text-[#7F77DD] sm:mx-auto">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 10l5-5 5 5M7 14l5 5 5-5" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-fg-subtle">Dapet</p>
            <p className="line-clamp-2 text-sm font-semibold text-fg">{t.got}</p>
          </div>
          <div className="text-right text-xs text-fg-muted">
            <Link href={`/u/${t.counterparty}`} className="font-medium text-brand-500">
              @{t.counterparty}
            </Link>
            <p className="font-mono text-[10px] text-fg-subtle">{relTime(t.completedAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================ shared */

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-rule p-10 text-center text-sm text-fg-muted">
      {text}
    </div>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-panel" />
      ))}
    </div>
  );
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1)  return "baru saja";
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}h lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
