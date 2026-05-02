import { z } from "zod";

export const UsernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_]+$/, "Hanya huruf/angka/underscore");

export const PasswordSchema = z
  .string()
  .min(8, "Minimal 8 karakter")
  .max(128)
  .regex(/[A-Z]/, "Harus ada huruf besar")
  .regex(/[a-z]/, "Harus ada huruf kecil")
  .regex(/[0-9]/, "Harus ada angka");

export const RegisterInput = z.object({
  username: UsernameSchema,
  email: z.string().email().max(160).toLowerCase().trim(),
  // Required at signup — Komerce Payment + receipts both need a real
  // phone, and asking once at signup is less friction than blocking
  // mid-checkout. Loose pattern: any 8–32 digits/+/spaces accepted.
  phone: z.string().trim().min(8, "Minimal 8 digit").max(32).regex(/^[+\d\s-]+$/, "Hanya angka, spasi, +, atau -"),
  password: PasswordSchema,
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Harus setuju ketentuan" }) }),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.object({
  identifier: z.string().min(3).max(160).trim(),
  password: z.string().min(1).max(128),
  remember: z.boolean().optional().default(true),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const ForgotPasswordInput = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export const ResetPasswordInput = z.object({
  token: z.string().min(32).max(160),
  password: PasswordSchema,
});

export const SessionUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(["user", "verified", "ops", "admin", "superadmin"]),
  level: z.number(),
  exp: z.number(),
  trustScore: z.number(),
  // Premium membership flag — resolved on session attach so UI can
  // render the badge without an extra fetch on every page.
  isPremium: z.boolean().default(false),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;
