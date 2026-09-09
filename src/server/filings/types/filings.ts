import type { z } from "zod";
import type { Company } from "../../sec/types/company";
import type { Filing } from "../../sec/types/filing";
import type { filingsQuerySchema } from "../schemas/query";

export type FilingsQuery = z.output<typeof filingsQuerySchema>;

export interface FilingsPage {
  readonly filings: readonly Filing[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface CompanyFilingsResponse extends FilingsPage {
  readonly company: Company;
}
