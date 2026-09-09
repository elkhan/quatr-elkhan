import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("Express HTTP application", () => {
  let server: Server;
  let baseUrl: string;
  let clientDirectory: string;

  beforeAll(async () => {
    clientDirectory = await mkdtemp(join(tmpdir(), "quatr-client-"));
    await mkdir(join(clientDirectory, "assets"));
    await writeFile(join(clientDirectory, "index.html"), "<main>Test client</main>");
    await writeFile(join(clientDirectory, "assets", "app.js"), "console.log('fixture');");
    server = createApp({ clientDirectory }).listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
    }
    if (clientDirectory) await rm(clientDirectory, { recursive: true, force: true });
  });

  it("returns an HTTP health response", async () => {
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("rejects a missing client build before opening a port", () => {
    expect(() => createApp({ clientDirectory: join(clientDirectory, "missing") })).toThrow(
      "Client build is missing",
    );
  });

  it("serves the configured client and its assets", async () => {
    const page = await fetch(baseUrl);
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toContain("text/html");
    expect(await page.text()).toContain("Test client");

    const asset = await fetch(`${baseUrl}/assets/app.js`);
    expect(asset.status).toBe(200);
    expect(await asset.text()).toContain("fixture");
  });

  it.each(["/companies/AAPL/unknown", "/filings/unknown", "/missing", "/assets/missing.js"])(
    "returns a JSON 404 for %s instead of client HTML",
    async (path) => {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(await response.json()).toEqual({ error: { message: "Not found" } });
    },
  );
});
