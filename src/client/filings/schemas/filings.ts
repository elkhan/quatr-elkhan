import { z } from "zod";
import { companySchema, tickerSchema } from "../../api/schemas/company";

function isSecDocumentUrl(value: string): boolean {
  const url = new URL(value);
  return (
    url.origin === "https://www.sec.gov" &&
    url.username === "" &&
    url.password === "" &&
    url.pathname.startsWith("/Archives/edgar/data/")
  );
}

const documentUrlSchema = z
  .url()
  .pipe(z.string().refine(isSecDocumentUrl, "Expected an original SEC document URL"));
const filingSchema = z.object({
  accessionNumber: z.string().min(1),
  form: z.string().min(1),
  filingDate: z.iso.date(),
  documentUrl: documentUrlSchema,
});

export const filingsResponseSchema = z.object({
  company: companySchema,
  filings: z.array(filingSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(),
});

export const filingsSearchSchema = z.object({
  ticker: tickerSchema,
  form: z.string().trim(),
  sort: z.enum(["asc", "desc"]),
  page: z.number().int().positive(),
});
