import { z } from "zod";
import { companySchema, tickerSchema } from "../../api/schemas/company";
import { apiErrorSchema } from "../../api/schemas/error";

export const summaryInputSchema = z
  .string()
  .transform((value) => value.split(","))
  .pipe(z.array(tickerSchema))
  .transform((tickers) => [...new Set(tickers)])
  .pipe(z.array(z.string()).min(1).max(10));

// Validate own entries without dropping a legitimate form named __proto__.
const formCountsSchema = z
  .preprocess(
    (value) => {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
      return Object.entries(value);
    },
    z.array(z.tuple([z.string(), z.number().int().nonnegative()])),
  )
  .transform((entries) => Object.fromEntries(entries));

export const summaryResponseSchema = z.object({
  window: z.object({ from: z.iso.date(), to: z.iso.date() }),
  results: z
    .array(
      z.discriminatedUnion("status", [
        z.object({
          ticker: tickerSchema,
          status: z.literal("success"),
          company: companySchema,
          countsByForm: formCountsSchema,
          latest10KDate: z.iso.date().nullable(),
        }),
        z.object({
          ticker: tickerSchema,
          status: z.literal("error"),
          error: apiErrorSchema.shape.error,
        }),
      ]),
    )
    .min(1)
    .max(10),
});
