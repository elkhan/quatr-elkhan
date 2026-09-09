import { Router } from "express";
import type { SecClient } from "../sec/types/company";
import { createSummaryController } from "./controller";

export function createSummaryRouter(secClient: SecClient): Router {
  const router = Router();
  router.get("/summary", createSummaryController(secClient));
  return router;
}
