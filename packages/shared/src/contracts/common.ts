import { z } from "zod";

export const dateSchema = z.iso.date();
export const dateTimeSchema = z.iso.datetime();

export const MAX_SEARCH_LENGTH = 200;

export const optionalSearchSchema = z
  .string()
  .trim()
  .max(MAX_SEARCH_LENGTH)
  .transform((value) => (value === "" ? undefined : value))
  .optional();

export const paginatedListMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});