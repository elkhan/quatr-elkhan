import { once } from "node:events";
import type { Server } from "node:http";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createApp } from "../../app";
import type { SecClient } from "../../sec/types/company";

let server: Server;
let baseUrl: string;

beforeEach(async () => {
  // Inject a defect at the client boundary, outside expected SEC error translation.
  const secClient: SecClient = {
    getCompanyHistory: async () => {
      throw new Error("Internal diagnostic: private-contact@example.com /private/config.env");
    },
  };
  server = createApp({ secClient, allowedOrigins: ["http://127.0.0.1:5173"] }).listen(
    0,
    "127.0.0.1",
  );
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
  }
});

it.each(["/companies/AAPL/filings", "/filings/summary?tickers=AAPL"])(
  "returns a generic JSON 500 for an unexpected async defect on %s",
  async (path) => {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { Origin: "http://127.0.0.1:5173" },
    });
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5173");
    expect(await response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Internal server error." },
    });
  },
);
