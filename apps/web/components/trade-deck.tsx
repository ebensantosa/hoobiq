"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";

const ACCENT = "#7F77DD"; // Trade Match purple — distinct from marketplace pink

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

export type TradeMatch = {
  matchKey: string;
  give: ListingMini;
  get: ListingMini;
  counterparty: CounterpartyMini;
  score: number;
};

const fmtIdr = (n: number) =>
  n >= 1_000_000 ? `Rp ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}jt`
    : n >= 1_000 ? `Rp ${(n / 1_000).toFixed(0)}rb`
    : `Rp ${n.toLocaleString("id-ID")}`;

/**
 * Tinder-style trade match deck. Top card is draggable; release past a
 * threshold commits left/right. Buttons mirror the gesture for keyboard /
 * non-touch users.
 */
export function TradeDeck({ initial, targetUsername = null }: { initial: TradeMatch[]; targetUsername?: string | null }) {
  const [deck, setDeck] = useState(initial);
  const [exiting, setExiting] = useState<{ key: string; dir: "left" | "right" } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const top = deck[0];
  const next = deck[1];
  const after = deck[2];

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  }

  async function commit(dir: "left" | "right") {
    if (!top || exiting) return;
    setExiting({ key: top.matchKey, dir });
    // Animate out, then drop the card and fire the API call
    setTimeout(async () => {
      const consumed = top;
      setDeck((d) => d.slice(1));
      setExiting(null);

      try {
        if (dir === "left") {
          await api("/trades/pass", {
            method: "POST",
            body: { fromListingId: consumed.give.id, toListingId: consumed.get.id },
          });
        } else {
          await api("/trades", {
            method: "POST",
            body: { fromListingId: consumed.give.id, toListingId: consumed.get.id },
          });
          showToast(`Proposal terkirim ke @${consumed.counterparty.username}`);
        }
      } catch (err) {
        // Soft fail — UI already advanced. Surface as a toast.
        showToast(dir === "right" ? "Gagal kirim proposal — coba lagi nanti." : "");
      }
    }, 280);
  }

  if (deck.length === 0 && !exiting) {
    return <EmptyDeck targetUsername={targetUsername} />;
  }

  return (
    <div className="relative">
      <div className="relative mx-auto h-[560px] w-full max-w-[420px] select-none">
        {after  && <CardShell key={after.matchKey}  match={after}  depth={2} />}
        {next   && <CardShell key={next.matchKey}   match={next}   depth={1} />}
        {top    && (
          <SwipeableCard
            key={top.matchKey}
            match={top}
            forceExit={exiting?.key === top.matchKey ? exiting.dir : null}
            onCommit={commit}
          />
        )}
      </div>

      {/* Action bar */}
      <div className="mt-6 flex items-center justify-center gap-5">
        <ActionButton
          aria-label="Lewati"
          onClick={() => commit("left")}
          variant="pass"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          }
        />
        <Link
          href={top ? `/u/${top.counterparty.username}` : "#"}
          className="grid h-12 w-12 place-items-center rounded-full border border-rule bg-panel text-fg-muted transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          style={{ ["--accent" as string]: ACCENT }}
          aria-label="Lihat profil"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        </Link>
        <ActionButton
          aria-label="Propose trade"
          onClick={() => commit("right")}
          variant="propose"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 10l5-5 5 5M7 14l5 5 5-5" />
            </svg>
          }
        />
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-fg px-4 py-2.5 text-sm font-semibold text-canvas shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- swipeable card */

function SwipeableCard({
  match,
  forceExit,
  onCommit,
}: {
  match: TradeMatch;
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
    if (drag.x >  threshold) onCommit("right");
    else if (drag.x < -threshold) onCommit("left");
    else setDrag({ x: 0, y: 0 });
    startRef.current = null;
    setDragging(false);
  }

  // Translate + rotate based on drag, or full exit when committing
  const rotate = drag.x * 0.06;
  const isExit = !!forceExit;
  const exitX = forceExit === "right" ? 600 : forceExit === "left" ? -600 : 0;
  const transform = isExit
    ? `translate(${exitX}px, 40px) rotate(${forceExit === "right" ? 18 : -18}deg)`
    : `translate(${drag.x}px, ${drag.y * 0.4}px) rotate(${rotate}deg)`;

  // Stamp opacity follows drag intensity
  const proposeOpacity = Math.max(0, Math.min(1, drag.x / 110));
  const passOpacity    = Math.max(0, Math.min(1, -drag.x / 110));

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
      <CardBody match={match} stampPropose={proposeOpacity} stampPass={passOpacity} />
    </div>
  );
}

function CardShell({ match, depth }: { match: TradeMatch; depth: 1 | 2 }) {
  // Stacked cards behind the top one — small offset + slight scale, no interaction
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
      <CardBody match={match} stampPropose={0} stampPass={0} muted />
    </div>
  );
}

function CardBody({
  match,
  stampPropose,
  stampPass,
  muted,
}: {
  match: TradeMatch;
  stampPropose: number;
  stampPass: number;
  muted?: boolean;
}) {
  const cp = match.counterparty;
  return (
    <div
      className={
        "relative h-full overflow-hidden rounded-3xl border bg-panel " +
        "shadow-[0_24px_60px_-20px_rgba(127,119,221,0.45)] " +
        (muted ? "border-rule" : "border-[color:var(--accent)]/30")
      }
      style={{ ["--accent" as string]: ACCENT }}
    >
      {/* Stamps */}
      <Stamp text="PROPOSE" tone="accent" opacity={stampPropose} side="left" />
      <Stamp text="PASS"    tone="muted"  opacity={stampPass}    side="right" />

      {/* Counterparty header */}
      <div
        className="flex items-center gap-3 border-b px-5 py-4"
        style={{
          borderColor: "rgb(127 119 221 / 0.18)",
          background: "linear-gradient(180deg, rgba(127,119,221,0.08), transparent)",
        }}
      >
        <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-panel-2 font-bold text-fg-muted">
          {cp.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cp.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (cp.name ?? cp.username)[0]?.toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-fg">{cp.name ?? `@${cp.username}`}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-fg-muted">
            <span>@{cp.username}</span>
            {cp.city && <span>· {cp.city}</span>}
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
              style={{ background: ACCENT }}
            >
              LV {cp.level}
            </span>
          </p>
        </div>
      </div>

      {/* Reputation strip */}
      <div className="grid grid-cols-3 divide-x divide-rule border-b border-rule bg-canvas/40 text-center">
        <Stat value={cp.trustScore.toFixed(1)} label="Trust" />
        <Stat value={cp.trades.completed.toLocaleString("id-ID")} label="Trade" />
        <Stat value={cp.trades.rating != null ? `${cp.trades.rating.toFixed(1)}★` : "—"} label="Rating" />
      </div>

      {/* Trade body */}
      <div className="flex flex-col gap-3 p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: ACCENT }}>
          Match · fit {Math.round(match.score * 100)}%
        </p>

        <ItemRow label="Kamu kasih" listing={match.give} tone="give" />

        <div className="flex items-center gap-3 px-1">
          <span className="h-px flex-1 bg-rule" />
          <span
            className="grid h-9 w-9 place-items-center rounded-full text-white"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, #5C57AB)` }}
            aria-hidden
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 10l5-5 5 5M7 14l5 5 5-5" />
            </svg>
          </span>
          <span className="h-px flex-1 bg-rule" />
        </div>

        <ItemRow label="Kamu dapet" listing={match.get} tone="get" />
      </div>
    </div>
  );
}

function ItemRow({ label, listing, tone }: { label: string; listing: ListingMini; tone: "give" | "get" }) {
  return (
    <div
      className="flex gap-3 rounded-2xl border p-3"
      style={{
        borderColor: tone === "get" ? `${ACCENT}55` : "rgb(0 0 0 / 0.08)",
        background:  tone === "get" ? `${ACCENT}0F` : "transparent",
      }}
    >
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-panel-2">
        {listing.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.cover} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span className="font-mono text-xs text-fg-subtle">No img</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-fg-subtle">
          {label}
        </p>
        <p className="line-clamp-2 text-sm font-bold text-fg">{listing.title}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-fg-muted">
          <span className="font-mono font-semibold text-fg">{fmtIdr(listing.priceIdr)}</span>
          <span className="rounded-md bg-fg/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest">
            {listing.condition}
          </span>
        </p>
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
  const styles = variant === "propose"
    ? { background: `linear-gradient(135deg, ${ACCENT}, #5C57AB)`, color: "#fff", boxShadow: "0 12px 28px -8px rgba(127, 119, 221, 0.65)" }
    : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "grid h-14 w-14 place-items-center rounded-full transition-transform hover:scale-105 active:scale-95 " +
        (variant === "propose"
          ? ""
          : "border border-rule bg-panel text-fg-muted hover:text-fg")
      }
      style={styles}
      {...rest}
    >
      {icon}
    </button>
  );
}

function EmptyDeck({ targetUsername = null }: { targetUsername?: string | null }) {
  return (
    <div
      className="mx-auto flex max-w-[420px] flex-col items-center rounded-3xl border border-dashed p-10 text-center"
      style={{ borderColor: `${ACCENT}55` }}
    >
      <span
        className="grid h-14 w-14 place-items-center rounded-full text-white"
        style={{ background: `linear-gradient(135deg, ${ACCENT}, #5C57AB)` }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 10l5-5 5 5M7 14l5 5 5-5" />
        </svg>
      </span>
      <h3 className="mt-4 text-lg font-bold text-fg">
        {targetUsername ? `Belum ada match dengan @${targetUsername}` : "Deck habis untuk sekarang"}
      </h3>
      <p className="mt-2 max-w-xs text-sm text-fg-muted">
        {targetUsername
          ? "Wishlist & koleksi kalian belum cocok dua arah. Coba kirim pesan dulu, atau tambahin item ke wishlist kamu."
          : "Tambahin item ke wishlist atau publish lebih banyak listing — match dihitung dari kecocokan dua arah."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {targetUsername ? (
          <>
            <Link
              href={`/dm?to=${encodeURIComponent(targetUsername)}`}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: ACCENT }}
            >
              Kirim pesan
            </Link>
            <Link
              href={`/u/${encodeURIComponent(targetUsername)}`}
              className="rounded-lg border border-rule px-4 py-2 text-sm font-semibold text-fg-muted hover:bg-panel-2"
            >
              Lihat profil
            </Link>
            <Link
              href="/wishlist"
              className="rounded-lg border border-rule px-4 py-2 text-sm font-semibold text-fg-muted hover:bg-panel-2"
            >
              Wishlist
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/wishlist"
              className="rounded-lg border border-rule px-4 py-2 text-sm font-semibold text-fg-muted hover:bg-panel-2"
            >
              Wishlist
            </Link>
            <Link
              href="/jual"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: ACCENT }}
            >
              Tambah listing
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
