import { z } from "zod";
import { InvalidQueryError } from "../../errors/query";
import { tickerSchema } from "../../sec/schemas/company";

const tickersSchema = z
  .string()
  .transform((value) => value.split(","))
  .pipe(z.array(tickerSchema))
  .transform((tickers) => [...new Set(tickers)])
  .pipe(z.array(z.string()).min(1).max(10, "Request at most 10 unique tickers"));

const summaryQuerySchema = z.strictObject({ tickers: tickersSchema });

export function parseSummaryQuery(input: unknown) {
  const result = summaryQuerySchema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues.map((issue) => {
      const field = issue.path.join(".") || "query";
      return `${field}: ${issue.message}`;
    });
    throw new InvalidQueryError(details.join("; "));
  }
  return result.data;
}
