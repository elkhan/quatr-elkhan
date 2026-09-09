import { SecError } from "../sec/errors/sec";
import type { SecClient } from "../sec/types/company";
import { summarizeFilings } from "./aggregate";
import type { CompanySummary, DateWindow } from "./types/summary";

async function summarizeCompany(
  ticker: string,
  window: DateWindow,
  secClient: SecClient,
): Promise<CompanySummary> {
  try {
    const history = await secClient.getCompanyHistory(ticker);
    return {
      ticker,
      status: "success",
      company: history.company,
      ...summarizeFilings(history.filings, window),
    };
  } catch (error) {
    if (!(error instanceof SecError)) throw error;
    return { ticker, status: "error", error: { code: error.code, message: error.message } };
  }
}

export function summarizeCompanies(
  tickers: readonly string[],
  window: DateWindow,
  secClient: SecClient,
): Promise<CompanySummary[]> {
  return Promise.all(tickers.map((ticker) => summarizeCompany(ticker, window, secClient)));
}
