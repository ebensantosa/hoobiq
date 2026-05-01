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
  // Optional "before" price for the strike-through + percent-off badge.
  // Null when the seller hasn't set a discount; UI hides the strike row
  // entirely in that case so plain-priced listings stay clean.
  compareAtIdr: z.number().nullable().optional(),
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
  // Spec-block extras. All optional/nullable — only the rows with
  // actual values show up in the "Spesifikasi produk" block on the
  // detail page, so empty fields don't pollute the layout.
  brand: z.string().nullable().optional(),
  variant: z.string().nullable().optional(),
  warranty: z.string().nullable().optional(),
  couriers: z.array(z.string()).default([]),
  originSubdistrictId: z.number().int().nullable().optional(),
  tradeable: z.boolean().default(false).optional(),
  showOnFeed: z.boolean().optional(),
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
  // Optional discount + spec extras. compareAtIdr is the "before" price;
  // server validates it's > priceIdr at write time so a misconfigured
  // discount can't accidentally raise the price. brand/variant/warranty
  // are free-form strings surfaced in the detail spec block.
  compareAtIdr: z.number().int().min(1000).max(1_000_000_000).nullable().optional(),
  brand:    z.string().trim().max(80).nullable().optional(),
  variant:  z.string().trim().max(120).nullable().optional(),
  warranty: z.string().trim().max(160).nullable().optional(),
  // Shipping (RajaOngkir/Komerce). couriers is the set the seller will accept;
  // originSubdistrictId is the Komerce id of the seller's pickup point. Both
  // optional on create — listing falls back to "hubungi seller" until set.
  couriers: z.array(z.enum(["jne", "pos", "tiki", "sicepat", "jnt", "anteraja", "ninja", "wahana", "ide"])).max(9).default([]),
  originSubdistrictId: z.number().int().positive().nullable().optional(),
  // Owner flags this listing as available for trade. Defaults to true:
  // collectors expect every listing to be at least theoretically swappable,
  // and the per-item opt-out is surfaced as a checkbox in the upload form
  // for sellers who explicitly don't want trade offers on a piece.
  tradeable: z.boolean().default(true),
  // Default ON — most sellers want their listing on profile feed too.
  // Untick keeps the listing on marketplace but invisible from the
  // seller's profile feed (showcase-only).
  showOnFeed: z.boolean().default(true),
  // When the seller typed a brand-new sub-category or series in the
  // creatable picker, this carries the proposed name. The server
  // creates a CategoryRequest, links the listing to it, and parks
  // the listing at moderation="pending_category" / isPublished=false
  // until an admin approves the request. `categoryId` in that case
  // points to the PARENT (level above), so the listing has a valid
  // category ancestor while waiting.
  pendingCategory: z.object({
    name: z.string().trim().min(2).max(80),
  }).optional(),
});
export type CreateListingInput = z.infer<typeof CreateListingInput>;

export const UpdateListingInput = CreateListingInput.partial();
export type UpdateListingInput = z.infer<typeof UpdateListingInput>;
