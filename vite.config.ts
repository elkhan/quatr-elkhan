import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { portSchema } from "./src/server/schemas/config.ts";

const projectDirectory = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectDirectory, "");
  const target = `http://127.0.0.1:${portSchema.parse(env.PORT)}`;

  return {
    root: fileURLToPath(new URL("./src/client", import.meta.url)),
    envDir: projectDirectory,
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: portSchema.parse(env.CLIENT_PORT ?? "5173"),
      strictPort: true,
      proxy: { "/health": target, "/companies": target, "/filings": target },
    },
    build: { outDir: "../../dist/client", emptyOutDir: true },
  };
});
