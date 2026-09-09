import { existsSync } from "node:fs";
import { join } from "node:path";
import express from "express";

export function createApp({ clientDirectory }: { clientDirectory?: string } = {}) {
  const app = express();
  app.disable("x-powered-by");

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  if (clientDirectory) {
    if (!existsSync(join(clientDirectory, "index.html"))) {
      throw new Error("Client build is missing. Run bun run build before bun run start.");
    }
    app.use(express.static(clientDirectory));
  }

  app.use((_request, response) => {
    response.status(404).json({ error: { message: "Not found" } });
  });

  return app;
}
