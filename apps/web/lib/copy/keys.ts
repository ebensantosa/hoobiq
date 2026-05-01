/**
 * Editable copy keys exposed in /admin/pengaturan.
 *
 * Keep this list short and curated — every key adds friction in the admin
 * UI. The default value is the source of truth at build time; the admin
 * can override it per-deployment via the SiteSettings.copy JSON.
 *
 * Usage in components:
 *   import { useCopy } from "@/lib/copy/use-copy";
 *   const t = useCopy();
 *   <h1>{t("home.hero.title")}</h1>
 *
 * Or for server components:
 *   import { copyFor } from "@/lib/copy/server";
 *   const t = await copyFor();
 *   <h1>{t("home.hero.title")}</h1>
 */
export const COPY_KEYS = {
  // Marketplace landing
  "marketplace.hero.title":     "Temukan Koleksi Favoritmu",
  "marketplace.hero.subtitle":  "Barang rare, kondisi terbaik, dan seller terpercaya — semua di satu tempat.",

  // Home / feeds
  "home.hero.title":            "Marketplace kolektor Indonesia",
  "home.hero.subtitle":         "Trading cards, figure, blind box. Verified sellers, escrow setiap transaksi.",
  "home.cta.primary":           "Mulai jelajah",
  "home.cta.secondary":         "Daftar gratis",

  // Auth
  "auth.login.title":           "Masuk.",
  "auth.login.subtitle":        "Belum punya akun?",
  "auth.register.title":        "Daftar.",
  "auth.register.subtitle":     "Sudah punya akun?",

  // Onboarding
  "onboarding.interests.title":     "Apa yang kamu koleksi?",
  "onboarding.interests.subtitle":  "Pilih max 5 minat. Kita pakai ini untuk atur feeds & rekomendasi listing.",

  // Header / nav
  "nav.cta.login":              "Masuk",
  "nav.cta.register":           "Daftar",
  "nav.search.placeholder":     "Cari kartu, figure, blind box…",

  // Trust badges (used in checkout, listing detail)
  "trust.escrow":               "Pembayaran aman lewat Hoobiq Pay sampai barang diterima.",
  "trust.verified":             "Verified seller — KTP & rekening dicek.",
  "trust.dispute":              "Refund dijamin kalau barang tidak sesuai deskripsi.",

  // Empty states
  "empty.marketplace":          "Belum ada listing yang cocok. Coba ubah filter.",
  "empty.wishlist":             "Wishlist masih kosong. Tambah dari halaman listing.",
  "empty.feeds":                "Feed kamu masih kosong. Pilih minat di pengaturan untuk personalisasi.",
} as const;

export type CopyKey = keyof typeof COPY_KEYS;

export const COPY_KEY_LIST: CopyKey[] = Object.keys(COPY_KEYS) as CopyKey[];

/** Resolve a key against an override map; falls back to the default. */
export function resolveCopy(overrides: Record<string, string> | undefined | null) {
  return (key: CopyKey): string => {
    const override = overrides?.[key];
    if (override && override.trim().length > 0) return override;
    return COPY_KEYS[key];
  };
}
