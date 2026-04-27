import { cookies } from "next/headers";
import "server-only";
import type { SessionUser } from "@hoobiq/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "hbq_session";

/**
 * Resolve the current user on the server. Returns null if no session.
 *
 * We forward the incoming session cookie to the API and rely on the same
 * cache key Next provides per-request, so calling this multiple times in one
 * render is essentially free.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Cookie: `${COOKIE_NAME}=${token}` },
      // Per-request: never cache an authentication check
      cache: "no-store",
    });
    if (!res.ok) return null;
    const env = (await res.json()) as { ok: true; data: { user: SessionUser } } | { ok: false };
    return env.ok ? env.data.user : null;
  } catch {
    return null;
  }
}
