import { z } from "zod";

export const IdSchema = z.string().cuid();

export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const PageResultSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};
