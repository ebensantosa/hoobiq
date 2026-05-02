"use client";
import * as React from "react";
import Link from "next/link";
import { Avatar } from "@hoobiq/ui";
import { CardArt, pickArt } from "./card-art";
import { TierBadge, tierForLevel } from "./tier-badge";
import { CommentThread } from "./comment-thread";
import { PullRateWidget } from "./pull-rate-widget";
import { TrustBadges, deriveTrustBadges } from "./trust-badges";
import { useActionDialog } from "./action-dialog";
import type { FeedPost } from "@/app/feeds/page";
import { api } from "@/lib/api/client";

/**
 * Engagement-focused feed card. Like is optimistic; comments lazy-load on
 * expand; views fire once when the card is 50% on-screen.
 */
export function FeedCard({ post, meUsername }: { post: FeedPost; meUsername?: string | null }) {
  const dialog = useActionDialog();
  const isOwn = !!meUsername && meUsername === post.author.username;
  const [liked, setLiked]       = React.useState(post.liked);
  const [likes, setLikes]       = React.useState(post.likes);
  const [comments, setComments] = React.useState(post.comments);
  const [showComments, setShowComments] = React.useState(false);
  const [menuOpen, setMenuOpen]         = React.useState(false);
  const [shareOpen, setShareOpen]       = React.useState(false);
  const [shareDir, setShareDir]         = React.useState<"up" | "down">("up");
  const [toast, setToast]               = React.useState<string | null>(null);
  const [body, setBody]                 = React.useState(post.body);
  const [editing, setEditing]           = React.useState(false);
  const [editDraft, setEditDraft]       = React.useState(post.body);
  const [editPending, setEditPending]   = React.useState(false);
  const [removed, setRemoved]           = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);
  const seenRef = React.useRef(false);
  const cardRef = React.useRef<HTMLElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const shareRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false);
    }
    if (shareOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [shareOpen]);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  function postUrl(): string {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/feeds#post-${post.id}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(postUrl());
      setToast("Tautan disalin");
    } catch {
      setToast("Gagal menyalin");
    }
  }

  function shareText(): string {
    return post.body ? post.body.slice(0, 120) : `Postingan @${post.author.username}`;
  }

  function shareToDM() {
    dialog.open({
      title: "Kirim post ke DM",
      description: "Ketik username Hoobiq tujuan (tanpa @). Link akan dikirim ke chat.",
      fields: [{ key: "u", label: "Username", placeholder: "kolektor_keren" }],
      confirmLabel: "Kirim",
      onConfirm: async (v) => {
        const username = String(v.u ?? "").trim().replace(/^@/, "");
        if (username.length < 3) return "Username minimal 3 karakter.";
        try {
          const conv = await api<{ id: string }>("/dm", { method: "POST", body: { withUsername: username } });
          await api(`/dm/${encodeURIComponent(conv.id)}/messages`, { method: "POST", body: { body: `${shareText()}\n${postUrl()}` } });
          setToast(`Terkirim ke @${username}`);
        } catch (e) {
          return e instanceof Error ? e.message : "Gagal kirim.";
        }
      },
    });
  }

  function shareTo(target: "wa" | "x" | "fb" | "tg" | "ig" | "discord") {
    const url = postUrl();
    const text = shareText();
    const enc = encodeURIComponent;
    let href: string | null = null;
    switch (target) {
      case "wa":      href = `https://wa.me/?text=${enc(`${text} ${url}`)}`; break;
      case "x":       href = `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`; break;
      case "fb":      href = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`; break;
      case "tg":      href = `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`; break;
      case "ig":
      case "discord":
        // No public web-share intent — copy and prompt the user to paste.
        copyLink();
        setToast(target === "ig" ? "Tautan disalin — tempel di Instagram" : "Tautan disalin — tempel di Discord");
        setShareOpen(false);
        return;
    }
    if (href) window.open(href, "_blank", "noopener,noreferrer");
    setShareOpen(false);
  }

  function report() {
    setMenuOpen(false);
    dialog.open({
      title: "Laporkan postingan",
      description: "Tim moderasi akan review dalam 24 jam. Berikan konteks supaya keputusan cepat.",
      fields: [
        { key: "reason", label: "Alasan", type: "textarea", placeholder: "spam, penipuan, konten tidak pantas, dll.", minLength: 3 },
      ],
      tone: "danger",
      confirmLabel: "Kirim laporan",
      onConfirm: async (v) => {
        try {
          await api(`/posts/${post.id}/report`, { method: "POST", body: { reason: v.reason.trim() } });
          setToast("Laporan terkirim. Terima kasih.");
        } catch (e) {
          return e instanceof Error ? e.message : "Gagal mengirim laporan.";
        }
      },
    });
  }

  async function saveEdit() {
    const next = editDraft.trim();
    if (next.length < 2 || next === body) { setEditing(false); return; }
    setEditPending(true);
    try {
      await api(`/posts/${post.id}`, { method: "PATCH", body: { body: next } });
      setBody(next);
      setEditing(false);
      setToast("Postingan diperbarui");
    } catch {
      setToast("Gagal menyimpan");
    } finally {
      setEditPending(false);
    }
  }

  function deletePost() {
    if (deletePending) return;
    setMenuOpen(false);
    dialog.open({
      title: "Hapus postingan?",
      description: "Postingan akan hilang dari feed dan tidak bisa dipulihkan.",
      tone: "danger",
      confirmLabel: "Hapus",
      onConfirm: async () => {
        setDeletePending(true);
        try {
          await api(`/posts/${post.id}`, { method: "DELETE" });
          setRemoved(true);
        } catch (e) {
          setDeletePending(false);
          return e instanceof Error ? e.message : "Gagal menghapus.";
        }
      },
    });
  }

  React.useEffect(() => {
    if (seenRef.current || !cardRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !seenRef.current) {
          seenRef.current = true;
          api(`/posts/${post.id}/view`, { method: "POST" }).catch(() => undefined);
          obs.disconnect();
        }
      }
    }, { threshold: 0.5 });
    obs.observe(cardRef.current);
    return () => obs.disconnect();
  }, [post.id]);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    try {
      await api<{ liked: boolean }>(`/posts/${post.id}/like`, { method: "POST" });
    } catch {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
    }
  }

  if (removed) return null;

  return (
    <article
      ref={cardRef}
      className="overflow-hidden rounded-2xl border border-rule bg-panel transition-shadow hover:shadow-md"
    >
      <header className="flex items-center gap-3 px-5 py-4">
        <Link href={`/u/${post.author.username}`} className="relative shrink-0">
          <Avatar letter={post.author.username[0] ?? "U"} size="md" src={post.author.avatarUrl} alt={`Avatar @${post.author.username}`} />
          {(() => {
            const a = post.author as typeof post.author & {
              kycVerified?: boolean; trustScore?: number; tradesCompleted?: number;
            };
            const badges = deriveTrustBadges({
              kycVerified: a.kycVerified,
              trustScore: a.trustScore,
              tradesCompleted: a.tradesCompleted,
            });
            if (badges.length === 0) return null;
            return (
              <span className="absolute -bottom-0.5 -right-0.5 ring-2 ring-panel rounded-full">
                <TrustBadges badges={badges} size="xs" max={1} />
              </span>
            );
          })()}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/u/${post.author.username}`}
            className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg hover:text-brand-500"
          >
            {post.author.name ?? `@${post.author.username}`}
            <TierBadge tier={tierForLevel(post.author.level)} level={post.author.level} size="sm" />
          </Link>
          <p className="text-xs text-fg-subtle">
            {post.author.city ?? "Lokasi belum diisi"} · {timeAgo(post.createdAt)}
          </p>
        </div>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="Lainnya"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full p-1.5 text-fg-subtle transition-colors hover:bg-panel-2 hover:text-fg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-rule bg-panel shadow-xl ring-1 ring-black/5 z-50 origin-top-right animate-menu-pop"
            >
              <button
                role="menuitem"
                type="button"
                onClick={() => { setMenuOpen(false); copyLink(); }}
                className="block w-full px-4 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-panel-2 hover:text-fg"
              >
                Salin tautan
              </button>
              <button
                role="menuitem"
                type="button"
                onClick={() => { setMenuOpen(false); setShareOpen(true); }}
                className="block w-full px-4 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-panel-2 hover:text-fg"
              >
                Bagikan…
              </button>
              {isOwn ? (
                <>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => { setMenuOpen(false); setEditDraft(body); setEditing(true); }}
                    className="block w-full px-4 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-panel-2 hover:text-fg"
                  >
                    Edit
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => { setMenuOpen(false); deletePost(); }}
                    className="block w-full px-4 py-2 text-left text-sm text-flame-400 transition-colors hover:bg-panel-2"
                  >
                    Hapus
                  </button>
                </>
              ) : (
                <button
                  role="menuitem"
                  type="button"
                  onClick={report}
                  className="block w-full px-4 py-2 text-left text-sm text-flame-400 transition-colors hover:bg-panel-2"
                >
                  Laporkan
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {editing ? (
        <div className="px-5 pb-3">
          <textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            rows={Math.max(3, Math.min(10, editDraft.split("\n").length + 1))}
            className="w-full resize-none rounded-xl border border-rule bg-panel-2 px-3 py-2 text-[15px] leading-relaxed text-fg focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            disabled={editPending}
            autoFocus
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setEditing(false); setEditDraft(body); }}
              disabled={editPending}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-panel-2 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={editPending || editDraft.trim().length < 2}
              className="rounded-lg bg-brand-400 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {editPending ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </div>
      ) : (
        body && body.trim() && (
          <p className="px-5 pb-3 text-[15px] leading-relaxed text-fg whitespace-pre-line">{body}</p>
        )
      )}

      {post.pullRate && <PullRateWidget {...post.pullRate} />}

      {post.images.length > 0 ? (
        <PostImageGrid images={post.images} />
      ) : !body || !body.trim() ? (
        <div className="relative aspect-[16/10] overflow-hidden bg-panel-2">
          <CardArt variant={pickArt(post.id)} />
        </div>
      ) : null}

      <div className="flex items-center gap-1 border-t border-rule px-3 py-2 text-sm">
        <ActionButton
          onClick={toggleLike}
          active={liked}
          activeColor="text-brand-500"
          icon={
            liked ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            )
          }
          label={likes > 0 ? `${fmt(likes)} ${likes === 1 ? "Like" : "Likes"}` : "Like"}
        />
        <ActionButton
          onClick={() => setShowComments((v) => !v)}
          active={showComments}
          activeColor="text-ultra-500"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
          label={`${fmt(comments)} ${comments === 1 ? "Comment" : "Comments"}`}
        />
        {/* Trade button — direct path to DM the author with a preset
            opener so the buyer can negotiate price/swap without first
            digging up the seller's profile. Only shows when the post is
            from someone other than the viewer. */}
        {meUsername && meUsername !== post.author.username && (
          <Link
            href={`/dm?to=${encodeURIComponent(post.author.username)}&intent=trade&post=${encodeURIComponent(post.id)}`}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-fg-muted transition-colors hover:bg-panel-2 hover:text-emerald-500"
            aria-label="Ajukan trade ke author"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 3 13l4-4" />
              <path d="M3 13h18" />
              <path d="m17 7 4 4-4 4" />
              <path d="M21 11H3" />
            </svg>
            <span className="hidden sm:inline">Ajukan trade</span>
            <span className="sm:hidden">Trade</span>
          </Link>
        )}
        <span className="ml-auto hidden items-center gap-1.5 px-2 text-xs text-fg-subtle sm:inline-flex" title={`${post.views} views`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          {fmt(post.views)}
        </span>
        <div ref={shareRef} className="relative sm:ml-1">
          <ActionButton
            onClick={() => {
              setShareOpen((v) => {
                if (!v && shareRef.current) {
                  const r = shareRef.current.getBoundingClientRect();
                  // Header ~80px; popover ~240px. Flip down if not enough room above.
                  setShareDir(r.top - 80 < 240 ? "down" : "up");
                }
                return !v;
              });
            }}
            active={shareOpen}
            activeColor="text-brand-500"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>}
            label="Bagikan"
          />
          {shareOpen && (
            <div
              role="menu"
              className={
                "absolute right-0 w-56 overflow-hidden rounded-2xl border border-rule bg-panel p-2 shadow-xl ring-1 ring-black/5 z-50 animate-menu-pop " +
                (shareDir === "up"
                  ? "bottom-full mb-2 origin-bottom-right"
                  : "top-full mt-2 origin-top-right")
              }
            >
              <div className="grid grid-cols-3 gap-1">
                <ShareTarget label="WhatsApp"  color="text-[#25D366]" onClick={() => shareTo("wa")}      icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>} />
                <ShareTarget label="X"         color="text-fg"        onClick={() => shareTo("x")}       icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>} />
                <ShareTarget label="Facebook" color="text-[#1877F2]" onClick={() => shareTo("fb")}      icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>} />
                <ShareTarget label="Telegram" color="text-[#26A5E4]" onClick={() => shareTo("tg")}      icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>} />
                <ShareTarget label="Instagram" color="text-[#E4405F]" onClick={() => shareTo("ig")}      icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>} />
                <ShareTarget label="Discord"  color="text-[#5865F2]" onClick={() => shareTo("discord")} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>} />
              </div>
              <button
                type="button"
                onClick={() => { setShareOpen(false); shareToDM(); }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Kirim ke DM Hoobiq
              </button>
              <button
                type="button"
                onClick={() => { copyLink(); setShareOpen(false); }}
                className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg border border-rule px-3 py-2 text-xs font-medium text-fg-muted transition-colors hover:bg-panel-2 hover:text-fg"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Salin tautan
              </button>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-fg px-4 py-2 text-xs font-medium text-panel shadow-lg">
          {toast}
        </div>
      )}

      {showComments && (
        <CommentThread
          postId={post.id}
          meUsername={meUsername ?? null}
          onCountChange={(d) => setComments((n) => Math.max(0, n + d))}
        />
      )}
    </article>
  );
}

function ActionButton({
  icon, label, onClick, active, activeColor = "text-brand-500", subtle,
}: {
  icon: React.ReactNode; label: string; onClick?: () => void;
  active?: boolean; activeColor?: string; subtle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-panel-2 " +
        (active ? `${activeColor} font-semibold` : subtle ? "text-fg-subtle" : "text-fg-muted")
      }
    >
      <span className={active ? "scale-110 transition-transform" : ""}>{icon}</span>
      <span className="text-xs">{label}</span>
    </button>
  );
}

function PostImageGrid({ images }: { images: string[] }) {
  const n = images.length;
  // Smart layout matches the composer preview so what you compose === what you see.
  if (n === 1) {
    return (
      <div className="px-3 pb-3">
        <Tile src={images[0]!} className="aspect-[16/10]" />
      </div>
    );
  }
  if (n === 2) {
    return (
      <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
        <Tile src={images[0]!} className="aspect-square" />
        <Tile src={images[1]!} className="aspect-square" />
      </div>
    );
  }
  if (n === 3) {
    return (
      <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
        <Tile src={images[0]!} className="row-span-2 aspect-[3/4]" />
        <Tile src={images[1]!} className="aspect-[4/3]" />
        <Tile src={images[2]!} className="aspect-[4/3]" />
      </div>
    );
  }
  // 4+ images: show 4, overlay "+N more" on the last tile if needed.
  return (
    <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
      <Tile src={images[0]!} className="aspect-square" />
      <Tile src={images[1]!} className="aspect-square" />
      <Tile src={images[2]!} className="aspect-square" />
      <Tile
        src={images[3]!}
        className="aspect-square"
        overlay={n > 4 ? `+${n - 4}` : null}
      />
    </div>
  );
}

function Tile({
  src, className, overlay,
}: { src: string; className?: string; overlay?: string | null }) {
  return (
    <div className={"relative overflow-hidden rounded-xl bg-panel-2 " + (className ?? "")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      {overlay && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-2xl font-bold text-white backdrop-blur-[1px]">
          {overlay}
        </span>
      )}
    </div>
  );
}

function ShareTarget({
  icon, label, color, onClick,
}: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-fg-muted transition-colors hover:bg-panel-2"
    >
      <span className={color}>{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + "k";
  return String(n);
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j`;
  const d = Math.floor(h / 24);
  return d <= 6 ? `${d}h` : new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
