import "server-only";

export type SiteSettings = {
  brandName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  footerText: string;
  copy: Record<string, string>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const FALLBACK: SiteSettings = {
  brandName: "Hoobiq",
  logoUrl: null,
  faviconUrl: null,
  primaryColor: "#FFA552",
  footerText: "© Hoobiq · Marketplace kolektor Indonesia",
  copy: {},
};

/**
 * Fetch site-wide settings. Cached for 60s by Next's data cache so a fan-out
 * of pages on the same render doesn't hit the API for each. The admin
 * editor invalidates server-side via API; clients see the new copy on the
 * next 60-second window or on hard reload — acceptable for branding.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const res = await fetch(`${API_BASE}/site-settings`, {
      next: { revalidate: 60, tags: ["site-settings"] },
    });
    if (!res.ok) return FALLBACK;
    const env = (await res.json()) as { ok: true; data: SiteSettings } | { ok: false };
    return env.ok ? env.data : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
