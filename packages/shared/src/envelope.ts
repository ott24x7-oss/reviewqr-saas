import { z } from "zod";

export const errorCodes = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION",
  "RATE_LIMIT",
  "PLAN_LIMIT",
  "PLAN_REQUIRED",
  "CONFLICT",
  "INTERNAL"
] as const;

export type ApiErrorCode = (typeof errorCodes)[number];

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(errorCodes),
    message: z.string()
  })
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

export function dataSchema<T extends z.ZodTypeAny>(inner: T) {
  return z.object({ data: inner });
}

export function listSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable()
  });
}
