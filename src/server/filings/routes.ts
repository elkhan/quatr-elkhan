import { type RequestHandler, Router } from "express";
import type { SecClient } from "../sec/types/company";
import { parseFilingsQuery } from "./schemas/query";
import { paginateFilings } from "./service";
import type { CompanyFilingsResponse } from "./types/filings";

export function createFilingsRouter(secClient: SecClient): Router {
  const router = Router();

  const getFilings: RequestHandler<{ ticker: string }, CompanyFilingsResponse> = async (
    request,
    response,
  ) => {
    const query = parseFilingsQuery(request.query);
    const history = await secClient.getCompanyHistory(request.params.ticker);
    const page = paginateFilings(history.filings, query);
    response.json({ company: history.company, ...page });
  };

  router.get("/:ticker/filings", getFilings);
  return router;
}
