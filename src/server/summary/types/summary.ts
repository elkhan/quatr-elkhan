import type { Company } from "../../sec/types/company";
import type { SecErrorCode } from "../../sec/types/error";

export interface DateWindow {
  readonly from: string;
  readonly to: string;
}

export interface FilingSummary {
  readonly countsByForm: Readonly<Record<string, number>>;
  readonly latest10KDate: string | null;
}

interface SummarySuccess extends FilingSummary {
  readonly ticker: string;
  readonly status: "success";
  readonly company: Company;
}

interface SummaryFailure {
  readonly ticker: string;
  readonly status: "error";
  readonly error: { readonly code: SecErrorCode; readonly message: string };
}

export type CompanySummary = SummarySuccess | SummaryFailure;

export interface SummaryResponse {
  readonly window: DateWindow;
  readonly results: readonly CompanySummary[];
}
