import { ApiError } from "../api/errors/api";
import { requestJson } from "../api/request";
import { summaryInputSchema, summaryResponseSchema } from "./schemas/summary";

export function loadSummary(input: string, signal: AbortSignal) {
  const result = summaryInputSchema.safeParse(input);
  if (!result.success)
    throw new ApiError("Enter 1–10 tickers, separated by commas, with no empty entries.");
  const query = new URLSearchParams({ tickers: result.data.join(",") });
  return requestJson(`/filings/summary?${query}`, summaryResponseSchema, signal);
}
