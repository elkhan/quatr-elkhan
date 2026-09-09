import { z } from "zod";
import { SecError } from "../errors/sec";

export const tickerSchema = z.string().trim().min(1).toUpperCase();

export const cikSchema = z
  .union([z.number(), z.string().regex(/^\d{1,10}$/)])
  .transform(Number)
  .pipe(z.number().int().positive().max(9_999_999_999))
  .transform((cik) => String(cik).padStart(10, "0"));

export const directorySchema = z.record(
  z.string(),
  z.object({
    cik_str: cikSchema,
    ticker: tickerSchema,
    title: z.string().trim().min(1),
  }),
);

export function parseTicker(input: string): string {
  const result = tickerSchema.safeParse(input);
  if (!result.success) throw new SecError("INVALID_TICKER", "Enter a non-empty ticker.");
  return result.data;
}

export function parseDirectory(payload: unknown) {
  const result = directorySchema.safeParse(payload);
  if (!result.success) throw new SecError("INVALID_SEC_DATA", "Invalid SEC ticker directory.");
  return result.data;
}
