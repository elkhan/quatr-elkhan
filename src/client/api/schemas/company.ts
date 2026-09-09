import { z } from "zod";

export const tickerSchema = z.string().trim().min(1).toUpperCase();
export const companySchema = z.object({
  ticker: tickerSchema,
  cik: z.string().regex(/^\d{10}$/),
  name: z.string().min(1),
});
