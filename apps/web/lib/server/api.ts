import { cookies } from "next/headers";
import "server-only";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "hbq_session";

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

/**
 * Server-side fetch wrapper. Forwards the session cookie automatically.
 * Returns null on any error so RSC pages can render an empty state instead
 * of crashing if the API is briefly unavailable.
 */
export async function serverApi<T>(path: string, init?: RequestInit & { revalidate?: number }): Promise<T | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  const headers = new Headers(init?.headers);
  if (token) headers.set("Cookie", `${COOKIE_NAME}=${token}`);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      next: init?.revalidate !== undefined ? { revalidate: init.revalidate } : { revalidate: 0 },
    });
    if (!res.ok) return null;
    const env = (await res.json()) as Envelope<T>;
    return env.ok ? env.data : null;
  } catch {
    return null;
  }
}
