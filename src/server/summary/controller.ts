import type { RequestHandler } from "express";
import type { SecClient } from "../sec/types/company";
import { createDateWindow } from "./aggregate";
import { parseSummaryQuery } from "./schemas/query";
import { summarizeCompanies } from "./service";
import type { SummaryResponse } from "./types/summary";

export function createSummaryController(
  secClient: SecClient,
): RequestHandler<unknown, SummaryResponse> {
  return async (request, response) => {
    const { tickers } = parseSummaryQuery(request.query);
    const window = createDateWindow(new Date());
    const results = await summarizeCompanies(tickers, window, secClient);
    response.json({ window, results });
  };
}
