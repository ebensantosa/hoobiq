import { z } from "zod";

export const CategoryNodeSchema: z.ZodType<{
  id: string;
  slug: string;
  name: string;
  level: number;
  listingCount?: number;
  children?: Array<z.infer<typeof CategoryNodeSchema>>;
}> = z.lazy(() =>
  z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    level: z.number(),
    listingCount: z.number().optional(),
    children: z.array(CategoryNodeSchema).optional(),
  })
);
export type CategoryNode = z.infer<typeof CategoryNodeSchema>;
