import { z } from "zod";

export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function pageParams({ page, limit }: Pagination) {
  return { skip: (page - 1) * limit, take: limit };
}
