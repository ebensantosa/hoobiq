import { z } from "zod";

export const ConditionSchema = z.enum(["MINT", "NEAR_MINT", "EXCELLENT", "GOOD", "FAIR"]);
export type Condition = z.infer<typeof ConditionSchema>;

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

export const ListingSearchInput = z.object({
  q: z.string().max(80).optional(),
  categorySlug: z.string().max(64).optional(),
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
  images: z
    .array(
      z.string().refine(
        (s) => /^https?:\/\//i.test(s) || /^data:image\//i.test(s),
        { message: "Harus berupa URL http(s) atau data:image URI" }
      )
    )
    .min(1)
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
