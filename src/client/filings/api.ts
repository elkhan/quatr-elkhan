import { ApiError } from "../api/errors/api";
import { requestJson } from "../api/request";
import { filingsResponseSchema, filingsSearchSchema } from "./schemas/filings";
import type { FilingsSearch } from "./types/filings";

export function loadFilings(input: FilingsSearch, signal: AbortSignal) {
  const result = filingsSearchSchema.safeParse(input);
  if (!result.success) throw new ApiError("Enter a ticker.");
  const { ticker, form, sort, page } = result.data;
  const query = new URLSearchParams({ page: String(page), pageSize: "25", sort });
  if (form !== "") query.set("form", form);
  return requestJson(
    `/companies/${encodeURIComponent(ticker)}/filings?${query}`,
    filingsResponseSchema,
    signal,
  );
}
