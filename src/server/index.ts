import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { parseConfig } from "./config";
import { createSecClient } from "./sec/client";

try {
  const config = parseConfig(process.env);
  const secClient = createSecClient({ userAgent: config.SEC_USER_AGENT });
  const clientDirectory = fileURLToPath(new URL("../client/", import.meta.url));
  const clientOptions = config.NODE_ENV === "production" ? { clientDirectory } : {};
  const allowedOrigins = [`http://127.0.0.1:${config.PORT}`];
  if (config.NODE_ENV === "development") {
    allowedOrigins.push(`http://127.0.0.1:${config.CLIENT_PORT}`);
  }
  const app = createApp({ secClient, allowedOrigins, ...clientOptions });
  const server = app.listen(config.PORT, "127.0.0.1");
  server.once("listening", () => {
    console.info(`Listening on http://127.0.0.1:${config.PORT}`);
  });
  server.on("error", (error) => {
    console.error(`Could not start server on port ${config.PORT}: ${error.message}`);
    process.exit(1);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not start server");
  process.exit(1);
}
