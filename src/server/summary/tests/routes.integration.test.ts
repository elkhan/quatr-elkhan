import { once } from "node:events";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";
import { createSecClient } from "../../sec/client";
import type { SecFetch } from "../../sec/types/http";
import { summaryDirectory, summaryPayloads } from "./fixtures";

describe("GET /filings/summary", () => {
  let server: Server;
  let baseUrl: string;
  let payloads: Map<string, unknown>;
  const transport = vi.fn<SecFetch>();

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-09T12:00:00Z"));
    payloads = new Map(summaryPayloads);
    transport.mockReset();
    transport.mockImplementation(async (url) => {
      const payload = payloads.get(url);
      if (payload instanceof Response) return payload.clone();
      if (payload === undefined) throw new Error(`Unexpected fixture URL: ${url}`);
      return Response.json(payload);
    });
    const secClient = createSecClient({
      userAgent: "Summary Tests tests@example.com",
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

  it("normalizes and deduplicates tickers while preserving order and complete-history semantics", async () => {
    const response = await fetch(`${baseUrl}/filings/summary?tickers=%20spot%20,aapl,SPOT,JPM`, {
      headers: { Origin: "http://127.0.0.1:5173" },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5173");
    expect(await response.json()).toEqual({
      window: { from: "2025-09-09", to: "2026-09-09" },
      results: [
        {
          ticker: "SPOT",
          status: "success",
          company: { ticker: "SPOT", cik: "0001639920", name: "Spotify Technology S.A." },
          countsByForm: { "20-F": 1, "6-K": 1 },
          latest10KDate: null,
        },
        {
          ticker: "AAPL",
          status: "success",
          company: { ticker: "AAPL", cik: "0000320193", name: "Apple Inc." },
          countsByForm: { "10-Q": 1, "10-K/A": 1 },
          latest10KDate: "2024-10-31",
        },
        {
          ticker: "JPM",
          status: "success",
          company: { ticker: "JPM", cik: "0000019617", name: "JPMorgan Chase & Co." },
          countsByForm: {},
          latest10KDate: null,
        },
      ],
    });
    expect(transport).toHaveBeenCalledTimes(6);
  });

  it.each([
    "",
    "tickers=",
    "tickers=%20",
    "tickers=,",
    "tickers=AAPL,",
    "tickers=,AAPL",
    "tickers=AAPL,,SPOT",
    "tickers=AAPL,%20,SPOT",
    "tickers=AAPL&tickers=SPOT",
    "tickers[]=AAPL",
    "ticker=AAPL",
    "tickers=AAPL&extra=1",
    `tickers=${Array.from({ length: 11 }, (_, index) => `T${index}`).join(",")}`,
  ])("rejects invalid batch query %s before SEC traffic", async (query) => {
    const response = await fetch(`${baseUrl}/filings/summary?${query}`);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "INVALID_QUERY" } });
    expect(transport).not.toHaveBeenCalled();
  });

  it("allows ten unique tickers after deduplication and reports all failures explicitly", async () => {
    const tickers = Array.from({ length: 10 }, (_, index) => `T${index}`);
    const query = [...tickers, "t0", " T1 "].join(",");
    const response = await fetch(`${baseUrl}/filings/summary?tickers=${encodeURIComponent(query)}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      results: tickers.map((ticker) => ({
        ticker,
        status: "error",
        error: { code: "TICKER_NOT_FOUND" },
      })),
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("keeps successful companies when an unknown ticker and an archive fail, then permits recovery", async () => {
    const archiveUrl = "https://data.sec.gov/submissions/CIK0000320193-submissions-002.json";
    payloads.set(archiveUrl, new Response("Unavailable", { status: 503 }));
    const response = await fetch(`${baseUrl}/filings/summary?tickers=AAPL,UNKNOWN,SPOT`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      results: [
        { ticker: "AAPL", status: "error", error: { code: "SEC_UNAVAILABLE" } },
        { ticker: "UNKNOWN", status: "error", error: { code: "TICKER_NOT_FOUND" } },
        {
          ticker: "SPOT",
          status: "success",
          countsByForm: { "20-F": 1, "6-K": 1 },
          latest10KDate: null,
        },
      ],
    });
    payloads.set(archiveUrl, summaryPayloads.get(archiveUrl));
    const recovered = await fetch(`${baseUrl}/filings/summary?tickers=AAPL`);
    expect(await recovered.json()).toMatchObject({
      results: [
        {
          ticker: "AAPL",
          status: "success",
          countsByForm: { "10-Q": 1, "10-K/A": 1 },
          latest10KDate: "2024-10-31",
        },
      ],
    });
  });

  it("shares in-flight SEC work between concurrent summary and listing requests", async () => {
    const responses = await Promise.all([
      fetch(`${baseUrl}/filings/summary?tickers=AAPL,SPOT`),
      fetch(`${baseUrl}/filings/summary?tickers=SPOT,AAPL`),
      fetch(`${baseUrl}/companies/AAPL/filings`),
    ]);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
    expect(bodies[0]).toMatchObject({ results: [{ ticker: "AAPL" }, { ticker: "SPOT" }] });
    expect(bodies[1]).toMatchObject({ results: [{ ticker: "SPOT" }, { ticker: "AAPL" }] });
    expect(bodies[2]).toMatchObject({ total: 4 });
    expect(transport).toHaveBeenCalledTimes(5);
    expect(new Set(transport.mock.calls.map(([url]) => url)).size).toBe(5);
  });

  it("captures the date window once even if upstream loading crosses UTC midnight", async () => {
    vi.setSystemTime(new Date("2026-09-09T23:59:59Z"));
    transport.mockImplementationOnce(async () => {
      vi.setSystemTime(new Date("2026-09-10T00:00:01Z"));
      return Response.json(summaryDirectory);
    });
    const response = await fetch(`${baseUrl}/filings/summary?tickers=SPOT`);
    expect(await response.json()).toMatchObject({
      window: { from: "2025-09-09", to: "2026-09-09" },
      results: [{ ticker: "SPOT", countsByForm: { "20-F": 1, "6-K": 1 } }],
    });
  });

  it("reports a shared SEC timeout on every affected company without returning empty successes", async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date("2026-09-09T12:00:00Z"));
    const started = new Promise<void>((resolve) => {
      transport.mockImplementationOnce((_url, init) => {
        resolve();
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
        });
      });
    });
    const pending = fetch(`${baseUrl}/filings/summary?tickers=AAPL,SPOT`);
    await started;
    await vi.advanceTimersByTimeAsync(10_000);
    const response = await pending;
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      results: [
        { ticker: "AAPL", status: "error", error: { code: "SEC_TIMEOUT" } },
        { ticker: "SPOT", status: "error", error: { code: "SEC_TIMEOUT" } },
      ],
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
