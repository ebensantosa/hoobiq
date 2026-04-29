import { z } from "zod";

export const UserPublicSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  city: z.string().nullable(),
  role: z.string(),
  level: z.number(),
  trustScore: z.number(),
  createdAt: z.string(),
});
export type UserPublic = z.infer<typeof UserPublicSchema>;

export const UpdateProfileInput = z.object({
  name: z.string().min(1).max(120).nullable().optional(),
  bio: z.string().max(240).nullable().optional(),
  city: z.string().max(64).nullable().optional(),
  // Required for checkout (Komerce Payment + receipts). Mirrors RegisterInput
  // validation so signup and settings stay in sync.
  phone: z
    .string()
    .trim()
    .min(8, "Minimal 8 digit")
    .max(32)
    .regex(/^[+\d\s-]+$/, "Hanya angka, spasi, +, atau -")
    .nullable()
    .optional(),
  // Accept http(s) URLs (production R2) AND data:image URIs (dev — image
  // is encoded into the JSON body until R2 signed-uploads land). Mirrors
  // CreateListingInput.images for consistency.
  avatarUrl: z
    .string()
    .refine(
      (s) => /^https?:\/\//i.test(s) || /^data:image\//i.test(s),
      { message: "Harus berupa URL http(s) atau data:image URI" }
    )
    .nullable()
    .optional(),
  interestedCategoryIds: z.array(z.string().cuid()).max(20).optional(),
  // Onboarding interest picker — sub-category slugs (pokemon, genshin, etc).
  // Max 5 per spec. Stored as `interestedJson` on User row.
  interested: z.array(z.string().min(1).max(64)).max(5).optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>;
