import { once } from "node:events";
import { request as requestHttp, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";
import { createSecClient } from "../../sec/client";
import { archive, directory, main, oldestArchive } from "../../sec/tests/fixtures";
import type { SecFetch } from "../../sec/types/http";

const directoryUrl = "https://www.sec.gov/files/company_tickers.json";
const mainUrl = "https://data.sec.gov/submissions/CIK0000320193.json";
const archiveUrl = "https://data.sec.gov/submissions/CIK0000320193-submissions-001.json";
const oldestUrl = "https://data.sec.gov/submissions/CIK0000320193-submissions-002.json";

describe("GET /companies/:ticker/filings", () => {
  let server: Server;
  let baseUrl: string;
  let responses: Map<string, unknown>;
  const transport = vi.fn<SecFetch>();

  beforeEach(async () => {
    responses = new Map<string, unknown>([
      [directoryUrl, directory],
      [mainUrl, main],
      [archiveUrl, archive],
      [oldestUrl, oldestArchive],
    ]);
    transport.mockReset();
    transport.mockImplementation(async (url) => {
      const payload = responses.get(url);
      if (payload instanceof Response) return payload.clone();
      if (payload === undefined) throw new Error(`Unexpected SEC request: ${url}`);
      return Response.json(payload);
    });
    const secClient = createSecClient({
      userAgent: "Route Tests tests@example.com",
      fetch: transport,
    });
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
    vi.useRealTimers();
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
    }
  });

  it("returns the default page from complete history and preserves ticker normalization", async () => {
    const response = await fetch(`${baseUrl}/companies/%20aapl%20/filings`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toContain("script-src 'self'");
    expect(response.headers.get("content-security-policy")).not.toContain("'unsafe-inline'");
    expect(response.headers.get("content-security-policy")).not.toContain(
      "upgrade-insecure-requests",
    );
    expect(response.headers.get("strict-transport-security")).toBeNull();
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("x-powered-by")).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("vary")).toContain("Origin");
    expect(await response.json()).toMatchObject({
      company: { ticker: "AAPL", cik: "0000320193", name: "Apple Inc." },
      page: 1,
      pageSize: 25,
      total: 4,
      filings: [
        { accessionNumber: "0000320193-26-000001" },
        { accessionNumber: "0000320193-25-000002" },
        {
          accessionNumber: "0001193125-24-000003",
          documentUrl: "https://www.sec.gov/Archives/edgar/data/320193/0001193125-24-000003.txt",
        },
        { accessionNumber: "0000320193-00-000004" },
      ],
    });
  });

  it("applies query controls to archive records and reuses the shared client across requests", async () => {
    const ascending = await fetch(`${baseUrl}/companies/AAPL/filings?sort=asc&pageSize=1&page=2`);
    expect(ascending.status).toBe(200);
    expect(await ascending.json()).toMatchObject({
      page: 2,
      pageSize: 1,
      total: 4,
      filings: [{ accessionNumber: "0001193125-24-000003" }],
    });
    const filtered = await fetch(`${baseUrl}/companies/AAPL/filings?form=10-K&pageSize=100`);
    expect(filtered.status).toBe(200);
    expect(await filtered.json()).toMatchObject({
      page: 1,
      pageSize: 100,
      total: 1,
      filings: [{ form: "10-K" }],
    });
    const beyond = await fetch(
      `${baseUrl}/companies/AAPL/filings?page=9007199254740991&pageSize=100`,
    );
    expect(beyond.status).toBe(200);
    expect(await beyond.json()).toMatchObject({ total: 4, filings: [] });
    expect(transport).toHaveBeenCalledTimes(4);
  });

  it("allows the configured UI origin on success and error responses without credentials", async () => {
    const headers = { Origin: "http://127.0.0.1:5173" };
    const response = await fetch(`${baseUrl}/companies/AAPL/filings`, { headers });
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(headers.Origin);
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("vary")).toContain("Origin");

    const invalid = await fetch(`${baseUrl}/companies/AAPL/filings?page=0`, { headers });
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get("access-control-allow-origin")).toBe(headers.Origin);
    const oversized = await fetch(`${baseUrl}/companies/AAPL/filings?${"x".repeat(4096)}`, {
      headers,
    });
    expect(oversized.status).toBe(414);
    expect(oversized.headers.get("access-control-allow-origin")).toBe(headers.Origin);
  });

  it.each([
    "https://untrusted.example",
    "null",
    "http://127.0.0.1:5173.evil.example",
    "http://127.0.0.1:5174",
  ])("rejects unapproved Origin %s before SEC work", async (origin) => {
    const response = await fetch(`${baseUrl}/companies/AAPL/filings`, {
      headers: { Origin: origin },
    });
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("vary")).toContain("Origin");
    expect(await response.json()).toEqual({
      error: { code: "ORIGIN_NOT_ALLOWED", message: "Request origin is not allowed." },
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it("answers preflight with only read methods and approved headers, without SEC work", async () => {
    const response = await fetch(`${baseUrl}/companies/AAPL/filings`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "accept",
      },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5173");
    expect(response.headers.get("access-control-allow-methods")).toBe("GET,HEAD");
    expect(response.headers.get("access-control-allow-headers")).toBe("Accept");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(await response.text()).toBe("");
    expect(transport).not.toHaveBeenCalled();
  });

  it("rejects an unapproved preflight origin and preserves request limits on approved preflights", async () => {
    const headers = { Origin: "https://untrusted.example", "Access-Control-Request-Method": "GET" };
    const denied = await fetch(`${baseUrl}/companies/AAPL/filings`, { method: "OPTIONS", headers });
    expect(denied.status).toBe(403);
    const oversized = await fetch(`${baseUrl}/companies/AAPL/filings?${"x".repeat(4096)}`, {
      method: "OPTIONS",
      headers: { ...headers, Origin: "http://127.0.0.1:5173" },
    });
    expect(oversized.status).toBe(414);
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([
    "page=0",
    "page=-1",
    "page=1.5",
    "page=abc",
    "page=9007199254740992",
    "page=1e2",
    "pageSize=0",
    "pageSize=101",
    "pageSize=2.5",
    "page=1&page=2",
    "pageSize=1&pageSize=2",
    "sort=newest",
    "sort=asc&sort=desc",
    "form=%20",
    "form=10-K&form=8-K",
    "page=",
    "pagesize=5",
    "page[value]=1",
    "__proto__[page]=2",
    "constructor[prototype][page]=2",
    "page=1&%70age=2",
  ])("rejects invalid query %s before fetching SEC data", async (query) => {
    const response = await fetch(`${baseUrl}/companies/AAPL/filings?${query}`);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "INVALID_QUERY" } });
    expect(transport).not.toHaveBeenCalled();
  });

  it("bounds URL bytes before parsing or fetching, including the exact boundary", async () => {
    const prefix = "/companies/AAPL/filings?form=";
    const allowedPath = prefix + "X".repeat(4096 - prefix.length);
    const rejected = await fetch(`${baseUrl}${allowedPath}X`);
    expect(rejected.status).toBe(414);
    expect(rejected.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await rejected.json()).toEqual({
      error: { code: "URI_TOO_LONG", message: "Request URL must not exceed 4096 bytes." },
    });
    expect(transport).not.toHaveBeenCalled();

    const allowed = await fetch(`${baseUrl}${allowedPath}`);
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toMatchObject({ total: 0, filings: [] });
  });

  it.each([{ "Content-Length": "1" }, { "Transfer-Encoding": "chunked" }])(
    "rejects framed GET bodies before SEC work: %o",
    async (headers) => {
      // Fetch forbids GET bodies; use the HTTP transport to exercise actual framing.
      const response = await new Promise<Response>((resolve, reject) => {
        const request = requestHttp(
          `${baseUrl}/companies/AAPL/filings`,
          { headers },
          (incoming) => {
            incoming.setEncoding("utf8");
            let body = "";
            incoming.on("data", (chunk: string) => {
              body += chunk;
            });
            incoming.on("error", reject);
            incoming.on("end", () =>
              resolve(new Response(body, { status: incoming.statusCode ?? 500 })),
            );
          },
        );
        request.on("error", reject);
        request.end("x");
      });
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({
        error: { code: "REQUEST_BODY_NOT_ALLOWED", message: "Request bodies are not supported." },
      });
      expect(transport).not.toHaveBeenCalled();
    },
  );

  it.each(["%20", "%E0%A4%A"])(
    "rejects invalid ticker/path %s before fetching SEC data",
    async (ticker) => {
      const response = await fetch(`${baseUrl}/companies/${ticker}/filings`);
      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(transport).not.toHaveBeenCalled();
    },
  );

  it("returns a clear directory-limitation 404 for an unmapped ticker", async () => {
    const response = await fetch(`${baseUrl}/companies/UNKNOWN/filings`);
    expect(response.status).toBe(404);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.json()).toEqual({
      error: { code: "TICKER_NOT_FOUND", message: expect.stringContaining("directory") },
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it.each([
    [403, "SEC_FORBIDDEN"],
    [429, "SEC_RATE_LIMITED"],
    [503, "SEC_UNAVAILABLE"],
  ])(
    "returns 502 for upstream HTTP %s without exposing a partial history",
    async (status, code) => {
      responses.set(oldestUrl, new Response("SEC unavailable", { status }));
      const response = await fetch(`${baseUrl}/companies/AAPL/filings`);
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: { code, message: expect.any(String) } });
    },
  );

  it.each([
    ["ragged filing columns", { ...archive, filingDate: [] }],
    [
      "invalid Unicode in a document filename",
      { ...archive, primaryDocument: ["amendment.htm", "\ud800.htm"] },
    ],
  ])("returns 502 for malformed SEC data: %s", async (_label, payload) => {
    responses.set(archiveUrl, payload);
    const response = await fetch(`${baseUrl}/companies/AAPL/filings`);
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: { code: "INVALID_SEC_DATA" } });
  });

  it("returns 504 when the SEC request times out", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const started = new Promise<void>((resolve) => {
      transport.mockImplementationOnce((_url, init) => {
        resolve();
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
        });
      });
    });
    const pending = fetch(`${baseUrl}/companies/AAPL/filings`);
    await started;
    await vi.advanceTimersByTimeAsync(10_000);
    const response = await pending;
    expect(response.status).toBe(504);
    expect(await response.json()).toMatchObject({ error: { code: "SEC_TIMEOUT" } });
  });

  it("keeps unknown API routes as JSON 404 responses", async () => {
    const response = await fetch(`${baseUrl}/companies/AAPL/unknown`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "NOT_FOUND", message: "Not found" } });
    expect(transport).not.toHaveBeenCalled();
  });
});
