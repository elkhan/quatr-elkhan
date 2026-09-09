import { Router } from "express";
import type { SecClient } from "../sec/types/company";
import { createFilingsController } from "./controller";

export function createFilingsRouter(secClient: SecClient): Router {
  const router = Router();

  router.get("/:ticker/filings", createFilingsController(secClient));
  return router;
}
