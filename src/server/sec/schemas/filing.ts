import { z } from "zod";
import { SecError } from "../errors/sec";
import { cikSchema } from "./company";

function isRelativeDocumentPath(value: string): boolean {
  if (value === "") return true;
  if (value.includes("\\")) return false;
  return value.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

const documentSchema = z
  .string()
  .trim()
  .refine(isRelativeDocumentPath, "Expected a relative document path without traversal");

export const filingRowSchema = z.object({
  accessionNumber: z.string().regex(/^\d{10}-\d{2}-\d{6}$/),
  form: z.string().trim().min(1),
  filingDate: z.iso.date(),
  primaryDocument: documentSchema,
});

// Validate column alignment, then validate the assembled rows exactly once.
// The output contains typed rows, so normalization needs no indexed-value casts.
export const filingColumnsSchema = z
  .object({
    accessionNumber: z.array(z.unknown()),
    form: z.array(z.unknown()),
    filingDate: z.array(z.unknown()),
    primaryDocument: z.array(z.unknown()).optional(),
  })
  .refine((columns) => {
    const count = columns.accessionNumber.length;
    const requiredColumnsAlign =
      columns.form.length === count && columns.filingDate.length === count;
    const documentColumnAligns =
      columns.primaryDocument === undefined || columns.primaryDocument.length === count;
    return requiredColumnsAlign && documentColumnAligns;
  }, "SEC filing columns must have equal lengths")
  .transform((columns) =>
    columns.accessionNumber.map((accessionNumber, index) => {
      const primaryDocument =
        columns.primaryDocument === undefined ? "" : columns.primaryDocument[index];
      return {
        accessionNumber,
        form: columns.form[index],
        filingDate: columns.filingDate[index],
        primaryDocument,
      };
    }),
  )
  .pipe(z.array(filingRowSchema));

export const submissionsSchema = z.object({
  cik: cikSchema,
  name: z.string().trim().min(1),
  filings: z.object({
    recent: filingColumnsSchema,
    files: z.array(z.object({ name: z.string().regex(/^CIK\d{10}-submissions-\d+\.json$/) })),
  }),
});

export function parseSubmissions(payload: unknown, cik: string) {
  const result = submissionsSchema.safeParse(payload);
  if (!result.success)
    throw new SecError("INVALID_SEC_DATA", `Invalid SEC submissions for CIK ${cik}.`);
  const data = result.data;
  const matchingCompany = data.cik === cik;
  const matchingArchives = data.filings.files.every((file) => file.name.startsWith(`CIK${cik}-`));
  if (!matchingCompany || !matchingArchives) {
    throw new SecError("INVALID_SEC_DATA", `SEC history does not match CIK ${cik}.`);
  }
  return data;
}

export function parseArchive(payload: unknown, filename: string) {
  const result = filingColumnsSchema.safeParse(payload);
  if (!result.success) throw new SecError("INVALID_SEC_DATA", `Invalid SEC archive: ${filename}`);
  return result.data;
}
