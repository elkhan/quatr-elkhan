import type { z } from "zod";
import type { filingsResponseSchema, filingsSearchSchema } from "../schemas/filings";

export type FilingsResponse = z.output<typeof filingsResponseSchema>;
export type FilingsSearch = z.output<typeof filingsSearchSchema>;
