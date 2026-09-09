import { z } from "zod";
import { InvalidQueryError } from "../../errors/query";

const positiveIntegerSchema = z
  .string()
  .regex(/^\d+$/, "Must contain decimal digits only")
  .transform(Number)
  .pipe(z.number().int().min(1).max(Number.MAX_SAFE_INTEGER));

export const filingsQuerySchema = z.strictObject({
  page: positiveIntegerSchema.default(1),
  pageSize: positiveIntegerSchema.pipe(z.number().max(100)).default(25),
  form: z.string().trim().min(1).optional(),
  sort: z.enum(["asc", "desc"]).default("desc"),
});

export function parseFilingsQuery(input: unknown) {
  const result = filingsQuerySchema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues.map((issue) => {
      const field = issue.path.join(".") || "query";
      return `${field}: ${issue.message}`;
    });
    throw new InvalidQueryError(details.join("; "));
  }
  return result.data;
}
