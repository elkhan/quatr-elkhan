import type { z } from "zod";
import type { directorySchema } from "../schemas/company";
import type { Filing } from "./filing";

export type CompanyDirectory = z.output<typeof directorySchema>;

export interface Company {
  readonly ticker: string;
  readonly cik: string;
  readonly name: string;
}

export interface CompanyHistory {
  readonly company: Company;
  readonly filings: readonly Filing[];
}

// Cached by CIK, so share-class aliases retain their own requested ticker.
export interface CachedCompanyHistory {
  readonly name: string;
  readonly filings: readonly Filing[];
}

export interface SecClient {
  getCompanyHistory(ticker: string): Promise<CompanyHistory>;
}
