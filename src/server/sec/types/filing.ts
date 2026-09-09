import type { z } from "zod";
import type { filingRowSchema, submissionsSchema } from "../schemas/filing";

export type FilingRow = z.output<typeof filingRowSchema>;
export type Submissions = z.output<typeof submissionsSchema>;
export type Filing = Readonly<
  Pick<FilingRow, "accessionNumber" | "form" | "filingDate"> & { documentUrl: string }
>;
