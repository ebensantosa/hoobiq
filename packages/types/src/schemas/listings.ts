import { z } from "zod";

// Canonical condition labels (per product spec). Old values
// (MINT/NEAR_MINT) map onto BRAND_NEW_SEALED/LIKE_NEW via the migration
// script in scripts/migrate-conditions.ts, which is run once on prod
// during the rollout. The API accepts only these new values going
// forward — the marketplace filter and upload form mirror this exact
// list, so a typo here propagates everywhere immediately.
export const ConditionSchema = z.enum([
  "BRAND_NEW_SEALED",
  "LIKE_NEW",
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "POOR",
]);
export type Condition = z.infer<typeof ConditionSchema>;

/** Display labels in Bahasa for UI surfaces — keep in sync with the enum. */
export const CONDITION_LABELS: Record<Condition, string> = {
  BRAND_NEW_SEALED: "Brand New (Sealed)",
  LIKE_NEW: "Like New",
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

export const ListingSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  priceIdr: z.number(),     // IDR rupiah (not cents) for client convenience
  condition: ConditionSchema,
  images: z.array(z.string()),
  cover: z.string().nullable(),
  boosted: z.boolean(),
  seller: z.object({
    username: z.string(),
    city: z.string().nullable(),
    trustScore: z.number(),
  }),
  createdAt: z.string(),
});
export type ListingSummary = z.infer<typeof ListingSummarySchema>;

export const ListingDetailSchema = ListingSummarySchema.extend({
  description: z.string(),
  stock: z.number(),
  weightGrams: z.number(),
  couriers: z.array(z.string()).default([]),
  originSubdistrictId: z.number().int().nullable().optional(),
  tradeable: z.boolean().default(false).optional(),
  category: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
  }),
  views: z.number().int().optional(),
  rating: z
    .object({
      avg: z.number().nullable(),
      count: z.number().int(),
    })
    .optional(),
  // Detail endpoint hydrates richer seller info than the summary list.
  seller: z.object({
    username: z.string(),
    name: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    city: z.string().nullable(),
    trustScore: z.number(),
  }),
});
export type ListingDetail = z.infer<typeof ListingDetailSchema>;

/**
 * Accepts either ?categorySlug=xxx (single, legacy) or ?cats=xxx,yyy
 * (comma-separated, multi-select). Both resolve to the union of each
 * slug's descendant category ids on the server, so checking
 * "toys" + "action-figure" + "naruto" returns listings tagged with
 * any of the three or any descendant under them.
 */
export const ListingSearchInput = z.object({
  q: z.string().max(80).optional(),
  categorySlug: z.string().max(64).optional(),
  cats: z
    .union([z.string(), z.array(z.string())])
    .transform((v) =>
      Array.isArray(v)
        ? v
        : v.split(",").map((s) => s.trim()).filter(Boolean),
    )
    .pipe(z.array(z.string().max(64)).max(20))
    .optional(),
  condition: ConditionSchema.optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "trending"]).default("newest"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});
export type ListingSearchInput = z.infer<typeof ListingSearchInput>;

export const CreateListingInput = z.object({
  title: z.string().min(8).max(160),
  description: z.string().min(20).max(4000),
  priceIdr: z.number().int().min(1000).max(1_000_000_000),
  stock: z.number().int().min(1).max(999).default(1),
  condition: ConditionSchema,
  categoryId: z.string().cuid(),
  // Accept http(s) URLs (production R2) AND data:image URIs (dev — image
  // preview is encoded into the JSON body until R2 signed-uploads land).
  // Zod's `.url()` rejects `data:` schemes by design, so we refine manually.
  // Minimum 3 photos per spec — single-photo listings looked broken on
  // the detail page (cover is large, gallery thumbnails empty), and
  // buyers consistently asked for more angles before paying. Cap stays
  // at 8 to keep the upload payload bounded.
  images: z
    .array(
      z.string().refine(
        (s) => /^https?:\/\//i.test(s) || /^data:image\//i.test(s),
        { message: "Harus berupa URL http(s) atau data:image URI" }
      )
    )
    .min(3, "Minimal 3 foto.")
    .max(8),
  weightGrams: z.number().int().min(10).max(50_000).default(500),
  // Shipping (RajaOngkir/Komerce). couriers is the set the seller will accept;
  // originSubdistrictId is the Komerce id of the seller's pickup point. Both
  // optional on create — listing falls back to "hubungi seller" until set.
  couriers: z.array(z.enum(["jne", "pos", "tiki", "sicepat", "jnt", "anteraja", "ninja", "wahana", "ide"])).max(9).default([]),
  originSubdistrictId: z.number().int().positive().nullable().optional(),
  // Owner flags this listing as available for trade. When true the listing
  // appears in /trades deck for everyone — buyers can still purchase normally.
  tradeable: z.boolean().default(false),
});
export type CreateListingInput = z.infer<typeof CreateListingInput>;

export const UpdateListingInput = CreateListingInput.partial();
export type UpdateListingInput = z.infer<typeof UpdateListingInput>;
