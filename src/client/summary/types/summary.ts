import type { z } from "zod";
import type { summaryResponseSchema } from "../schemas/summary";

export type SummaryResponse = z.output<typeof summaryResponseSchema>;
export type CompanySummary = SummaryResponse["results"][number];
