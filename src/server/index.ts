import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { parseConfig } from "./config";

try {
  const config = parseConfig(process.env);
  const clientDirectory = fileURLToPath(new URL("../client/", import.meta.url));
  const app = createApp(config.NODE_ENV === "production" ? { clientDirectory } : {});
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
