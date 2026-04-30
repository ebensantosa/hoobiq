"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { api } from "@/lib/api/client";

const ACCENT = "#EC4899"; // Meet Match pink — wishlist-aligned, was Trade purple

export type ListingMini = {
  id: string;
  slug: string;
  title: string;
  priceIdr: number;
  cover: string | null;
  condition: string;
};

export type CounterpartyMini = {
  username: string;
  name: string | null;
  avatarUrl: string | null;
  city: string | null;
  trustScore: number;
  level: number;
  trades: { completed: number; rating: number | null };
};

/** One card in the Meet Match swipe deck — any active marketplace listing
 *  owned by someone other than the viewer. */
export type TradeCard = {
  matchKey: string;
  listing: ListingMini;
  owner: CounterpartyMini;
};

type SwipeResponse = {
  added: boolean;
  remaining: number;
  cap: number;
};

const fmtIdr = (n: number) =>
  n >= 1_000_000 ? `Rp ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}jt`
    : n >= 1_000 ? `Rp ${(n / 1_000).toFixed(0)}rb`
    : `Rp ${n.toLocaleString("id-ID")}`;

/**
 * Meet Match deck — Tinder-style discovery surface for marketplace listings.
 * Swipe right adds the listing to the wishlist (idempotent server-side);
 * swipe left dismisses. Both sides count against a 25/day cap that the
 * server enforces; we mirror that meter in the UI so the user can pace.
 */
export function TradeDeck({
  initial,
  used: initialUsed,
  cap,
  targetUsername = null,
}: {
  initial: TradeCard[];
  used: number;
  cap: number;
  targetUsername?: string | null;
}) {
  const [deck, setDeck]     = useState(initial);
  const [exiting, setExit]  = useState<{ key: string; dir: "left" | "right" } | null>(null);
  const [toast, setToast]   = useState<string | null>(null);
  const [used, setUsed]     = useState(initialUsed);
  const [capped, setCapped] = useState(initialUsed >= cap);

  const top   = deck[0];
  const next  = deck[1];
  const after = deck[2];

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  }

  async function commit(dir: "left" | "right") {
    if (!top || exiting || capped) return;
    setExit({ key: top.matchKey, dir });
    const consumed = top;

    setTimeout(async () => {
      setDeck((d) => d.slice(1));
      setExit(null);
      try {
        const res = await api<SwipeResponse>("/trades/swipe", {
          method: "POST",
          body: { listingId: consumed.listing.id, direction: dir },
        });
        setUsed(res.cap - res.remaining);
        if (res.remaining === 0) setCapped(true);
        if (dir === "right" && res.added) {
          showToast("Disimpan ke wishlist.");
        }
      } catch (e) {
        if (e instanceof Error && /daily_cap|sudah swipe/i.test(e.message)) {
          setCapped(true);
          setUsed(cap);
          showToast(`Batas ${cap}/hari tercapai. Lanjut besok ya.`);
        } else if (dir === "right") {
          showToast("Gagal menyimpan — coba lagi.");
        }
      }
    }, 280);
  }

  if (capped && deck.length === 0 && !exiting) {
    return <CappedDeck cap={cap} />;
  }
  if (deck.length === 0 && !exiting) {
    return <EmptyDeck targetUsername={targetUsername} />;
  }

  return (
    <div className="relative">
      <DailyMeter used={used} cap={cap} />

      <div className="relative mx-auto h-[560px] w-full max-w-[420px] select-none">
        {after && <CardShell key={after.matchKey} card={after} depth={2} />}
        {next  && <CardShell key={next.matchKey}  card={next}  depth={1} />}
        {top   && (
          <SwipeableCard
            key={top.matchKey}
            card={top}
            forceExit={exiting?.key === top.matchKey ? exiting.dir : null}
            onCommit={commit}
          />
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-5">
        <ActionButton
          aria-label="Lewati"
          onClick={() => commit("left")}
          variant="pass"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>}
        />
        <Link
          href={top ? `/u/${top.owner.username}` : "#"}
          className="grid h-12 w-12 place-items-center rounded-full border border-rule bg-panel text-fg-muted transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          style={{ ["--accent" as string]: ACCENT }}
          aria-label="Lihat profil"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>
          </svg>
        </Link>
        <ActionButton
          aria-label="Simpan ke wishlist"
          onClick={() => commit("right")}
          variant="propose"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
        />
      </div>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-fg px-4 py-2.5 text-sm font-semibold text-canvas shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function DailyMeter({ used, cap }: { used: number; cap: number }) {
  const pct = Math.min(100, (used / cap) * 100);
  return (
    <div className="mx-auto mb-4 flex max-w-[420px] items-center gap-3">
      <div className="flex-1">
        <div className="flex items-baseline justify-between text-[11px] text-fg-muted">
          <span className="font-mono uppercase tracking-[0.18em]">Hari ini</span>
          <span className="font-mono tabular-nums">
            <span className="font-bold text-fg">{used}</span> / {cap}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel-2">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${pct}%`, background: ACCENT }}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- swipeable card */

function SwipeableCard({
  card,
  forceExit,
  onCommit,
}: {
  card: TradeCard;
  forceExit: "left" | "right" | null;
  onCommit: (dir: "left" | "right") => void;
}) {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (forceExit) return;
    startRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    setDragging(true);
    cardRef.current?.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!startRef.current) return;
    setDrag({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
  }
  function onPointerUp() {
    if (!startRef.current) return;
    const threshold = 110;
    if      (drag.x >  threshold) onCommit("right");
    else if (drag.x < -threshold) onCommit("left");
    else setDrag({ x: 0, y: 0 });
    startRef.current = null;
    setDragging(false);
  }

  const rotate = drag.x * 0.06;
  const isExit = !!forceExit;
  const exitX = forceExit === "right" ? 600 : forceExit === "left" ? -600 : 0;
  const transform = isExit
    ? `translate(${exitX}px, 40px) rotate(${forceExit === "right" ? 18 : -18}deg)`
    : `translate(${drag.x}px, ${drag.y * 0.4}px) rotate(${rotate}deg)`;

  const likeOpacity = Math.max(0, Math.min(1, drag.x / 110));
  const passOpacity = Math.max(0, Math.min(1, -drag.x / 110));

  return (
    <div
      ref={cardRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      style={{
        transform,
        transition: dragging ? "none" : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        zIndex: 3,
      }}
    >
      <CardBody card={card} stampLike={likeOpacity} stampPass={passOpacity} />
    </div>
  );
}

function CardShell({ card, depth }: { card: TradeCard; depth: 1 | 2 }) {
  const scale = depth === 1 ? 0.96 : 0.92;
  const top   = depth === 1 ? 12   : 24;
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        transform: `translateY(${top}px) scale(${scale})`,
        zIndex:    3 - depth,
        opacity:   depth === 1 ? 0.85 : 0.6,
      }}
    >
      <CardBody card={card} stampLike={0} stampPass={0} muted />
    </div>
  );
}

function CardBody({
  card,
  stampLike,
  stampPass,
  muted,
}: {
  card: TradeCard;
  stampLike: number;
  stampPass: number;
  muted?: boolean;
}) {
  const o = card.owner;
  const l = card.listing;
  return (
    <div
      className={
        "relative h-full overflow-hidden rounded-3xl border bg-panel " +
        "shadow-[0_24px_60px_-20px_rgba(127,119,221,0.45)] " +
        (muted ? "border-rule" : "border-[color:var(--accent)]/30")
      }
      style={{ ["--accent" as string]: ACCENT }}
    >
      <Stamp text="WISHLIST" tone="accent" opacity={stampLike} side="left" />
      <Stamp text="LEWAT"    tone="muted"  opacity={stampPass} side="right" />

      {/* Owner header */}
      <div
        className="flex items-center gap-3 border-b px-5 py-4"
        style={{
          borderColor: "rgb(127 119 221 / 0.18)",
          background: "linear-gradient(180deg, rgba(127,119,221,0.08), transparent)",
        }}
      >
        <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-panel-2 font-bold text-fg-muted">
          {o.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (o.name ?? o.username)[0]?.toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-fg">{o.name ?? `@${o.username}`}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-fg-muted">
            <span>@{o.username}</span>
            {o.city && <span>· {o.city}</span>}
            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: ACCENT }}>
              LV {o.level}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-rule border-b border-rule bg-canvas/40 text-center">
        <Stat value={o.trustScore.toFixed(1)} label="Trust" />
        <Stat value={o.trades.completed.toLocaleString("id-ID")} label="Trade" />
        <Stat value={o.trades.rating != null ? `${o.trades.rating.toFixed(1)}★` : "—"} label="Rating" />
      </div>

      {/* Big listing image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-panel-2">
        {l.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.cover} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-fg-subtle">
            <span className="font-mono text-xs">No image</span>
          </div>
        )}
        <span
          className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fg"
        >
          {l.condition.replace("_", " ")}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: ACCENT }}>
          Meet Match
        </p>
        <p className="line-clamp-2 text-base font-bold text-fg">{l.title}</p>
        <p className="font-mono text-sm font-semibold text-fg">{fmtIdr(l.priceIdr)}</p>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-2 py-3">
      <p className="font-mono text-base font-extrabold tabular-nums text-fg">{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">{label}</p>
    </div>
  );
}

function Stamp({
  text, tone, opacity, side,
}: {
  text: string; tone: "accent" | "muted"; opacity: number; side: "left" | "right";
}) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-6 z-10 select-none rounded-lg border-[3px] px-3 py-1 font-mono text-xl font-extrabold uppercase tracking-widest"
      style={{
        opacity,
        [side]: 24,
        color:       tone === "accent" ? ACCENT : "rgb(120 120 130)",
        borderColor: tone === "accent" ? ACCENT : "rgb(120 120 130)",
        transform:   side === "left" ? "rotate(-12deg)" : "rotate(12deg)",
      }}
    >
      {text}
    </span>
  );
}

function ActionButton({
  icon, onClick, variant, ...rest
}: {
  icon: React.ReactNode;
  onClick: () => void;
  variant: "pass" | "propose";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "grid h-14 w-14 place-items-center rounded-full transition-all hover:scale-110 active:scale-95 shadow-md";
  const variantClass =
    variant === "propose"
      ? "text-white"
      : "border border-rule bg-panel text-fg-muted hover:bg-panel-2";
  return (
    <button
      {...rest}
      onClick={onClick}
      className={`${base} ${variantClass}`}
      style={variant === "propose" ? { background: `linear-gradient(135deg, ${ACCENT}, #5C57AB)` } : undefined}
    >
      {icon}
    </button>
  );
}

/* ---------------------------------------------------------------- empty + match */

function EmptyDeck({ targetUsername = null }: { targetUsername?: string | null }) {
  return (
    <div
      className="mx-auto flex max-w-[420px] flex-col items-center rounded-3xl border border-dashed p-10 text-center"
      style={{ borderColor: `${ACCENT}55` }}
    >
      <span
        className="grid h-14 w-14 place-items-center rounded-full text-white"
        style={{ background: `linear-gradient(135deg, ${ACCENT}, #C13F84)` }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </span>
      <h3 className="mt-4 text-lg font-bold text-fg">
        {targetUsername ? `Belum ada listing dari @${targetUsername}` : "Sudah lihat semua hari ini"}
      </h3>
      <p className="mt-2 max-w-xs text-sm text-fg-muted">
        {targetUsername
          ? "User ini belum punya listing aktif. Coba kategori lain atau marketplace umum."
          : "Kamu sudah swipe semua kartu yang tersedia. Datang lagi besok untuk listing baru."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          href="/marketplace"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: ACCENT }}
        >
          Lihat marketplace
        </Link>
        {targetUsername && (
          <Link
            href={`/u/${encodeURIComponent(targetUsername)}`}
            className="rounded-lg border border-rule px-4 py-2 text-sm font-semibold text-fg-muted hover:bg-panel-2"
          >
            Lihat profil
          </Link>
        )}
      </div>
    </div>
  );
}

function CappedDeck({ cap }: { cap: number }) {
  return (
    <div
      className="mx-auto flex max-w-[420px] flex-col items-center rounded-3xl border border-dashed p-10 text-center"
      style={{ borderColor: `${ACCENT}55` }}
    >
      <span
        className="grid h-14 w-14 place-items-center rounded-full text-white"
        style={{ background: `linear-gradient(135deg, ${ACCENT}, #C13F84)` }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
        </svg>
      </span>
      <h3 className="mt-4 text-lg font-bold text-fg">Batas {cap}/hari tercapai</h3>
      <p className="mt-2 max-w-xs text-sm text-fg-muted">
        Datang lagi besok untuk swipe {cap} kartu lagi. Sementara itu, lihat wishlist kamu atau jelajah marketplace.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          href="/wishlist"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: ACCENT }}
        >
          Buka wishlist
        </Link>
        <Link
          href="/marketplace"
          className="rounded-lg border border-rule px-4 py-2 text-sm font-semibold text-fg-muted hover:bg-panel-2"
        >
          Marketplace
        </Link>
      </div>
    </div>
  );
}
