/**
 * Typed fetch wrapper around the Hoobiq API.
 *
 * Design choices:
 *  - Always `credentials: "include"` — session is in an httpOnly cookie
 *    set by the API. No tokens in JS, no localStorage tokens.
 *  - CSRF token is fetched lazily from GET /csrf on first mutation and cached
 *    in-memory (also mirrored as the hbq_csrf cookie, but we send the header
 *    to satisfy double-submit).
 *  - Uniform response shape: `{ ok: true, data }` | `{ ok: false, error }`.
 *    Throws a typed `ApiError` on failure so callers can rely on try/catch.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; details?: unknown } };

// CSRF placeholder — server-side CSRF middleware is temporarily off; see
// apps/api/src/common/csrf/csrf.module.ts. Session cookie is SameSite=Lax
// + strict CORS, which covers the main threat surface for now.
export function clearCsrfCache() { /* no-op */ }

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export async function api<T>(path: string, opts: {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
} = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const url = new URL(`${API_BASE}${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(url.toString(), {
    method,
    headers,
    credentials: "include",
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: opts.signal,
  });

  // 204 No Content — empty body is valid; treat as undefined.
  if (res.status === 204) {
    if (res.ok) return undefined as unknown as T;
    throw new ApiError("bad_response", "Respon server tidak valid.", res.status);
  }

  let envelope: Envelope<T>;
  try {
    envelope = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError("bad_response", "Respon server tidak valid.", res.status);
  }

  if (!envelope.ok) {
    throw new ApiError(envelope.error.code, envelope.error.message, res.status, envelope.error.details);
  }
  return envelope.data;
}
