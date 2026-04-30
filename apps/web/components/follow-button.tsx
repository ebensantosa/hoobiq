"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";

/**
 * Inline follow / unfollow toggle. Optimistic UI — flips immediately,
 * rolls back on API error. router.refresh() at the end so SSR-rendered
 * counts elsewhere (followers count, feeds following filter) update.
 */
export function FollowButton({
  username,
  initialFollowing,
  onChange,
}: {
  username: string;
  initialFollowing: boolean;
  onChange?: (next: boolean) => void;
}) {
  const router = useRouter();
  const [following, setFollowing] = React.useState(initialFollowing);
  const [pending, setPending] = React.useState(false);

  async function toggle() {
    if (pending) return;
    const next = !following;
    setFollowing(next);
    setPending(true);
    onChange?.(next);
    try {
      await api(`/users/${encodeURIComponent(username)}/follow`, { method: next ? "POST" : "DELETE" });
      router.refresh();
    } catch (e) {
      // Roll back on failure.
      setFollowing(!next);
      onChange?.(!next);
      const msg = e instanceof ApiError ? e.message : "Gagal. Coba lagi.";
      console.error("[follow]", msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={
        "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-60 " +
        (following
          ? "border border-rule bg-canvas text-fg hover:border-flame-400/60 hover:text-flame-500"
          : "bg-gradient-to-r from-brand-500 to-flame-500 text-white shadow-[0_8px_20px_-8px_rgba(236,72,153,0.55)] hover:-translate-y-0.5")
      }
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {following ? (
          <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="m17 11 2 2 4-4"/>
          </>
        ) : (
          <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/>
            <line x1="22" y1="11" x2="16" y2="11"/>
          </>
        )}
      </svg>
      {following ? "Mengikuti" : "Follow"}
    </button>
  );
}
