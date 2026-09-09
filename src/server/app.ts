import { existsSync } from "node:fs";
import { join } from "node:path";
import express from "express";
import { errorHandler } from "./errors/handler";
import { createFilingsRouter } from "./filings/routes";
import { createCorsPolicy } from "./security/cors";
import { securityHeaders } from "./security/headers";
import { requestLimits } from "./security/request-limits";
import type { AppOptions } from "./types/app";

export function createApp({ clientDirectory, secClient, allowedOrigins }: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  app.set("query parser", "simple");
  app.use(securityHeaders);
  app.use(createCorsPolicy(allowedOrigins));
  app.use(requestLimits);

  app.options("/{*path}", (_request, response) => {
    response.sendStatus(204);
  });

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.use("/companies", createFilingsRouter(secClient));

  if (clientDirectory) {
    if (!existsSync(join(clientDirectory, "index.html"))) {
      throw new Error("Client build is missing. Run bun run build before bun run start.");
    }
    app.use(express.static(clientDirectory));
  }

  app.use((_request, response) => {
    response.status(404).json({ error: { code: "NOT_FOUND", message: "Not found" } });
  });

  app.use(errorHandler);

  return app;
}
