import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSecClient } from "../client";
import type { SecFetch } from "../types/http";
import { archive, directory, main, oldestArchive } from "./fixtures";

const directoryUrl = "https://www.sec.gov/files/company_tickers.json";
const mainUrl = "https://data.sec.gov/submissions/CIK0000320193.json";
const archiveUrl = "https://data.sec.gov/submissions/CIK0000320193-submissions-001.json";
const oldestUrl = "https://data.sec.gov/submissions/CIK0000320193-submissions-002.json";

function setup() {
  const responses = new Map<string, unknown>([
    [directoryUrl, directory],
    [mainUrl, main],
    [archiveUrl, archive],
    [oldestUrl, oldestArchive],
    [
      "https://data.sec.gov/submissions/CIK0001067983.json",
      {
        cik: 1067983,
        name: "Berkshire Hathaway Inc.",
        filings: { recent: oldestArchive, files: [] },
      },
    ],
  ]);
  const starts: number[] = [];
  const transport = vi.fn<SecFetch>(async (url, _init) => {
    starts.push(Date.now());
    const payload = responses.get(url);
    if (payload instanceof Error) throw payload;
    if (payload instanceof Response) return payload.clone();
    if (payload === undefined) throw new Error(`Unexpected SEC URL: ${url}`);
    return Response.json(payload);
  });
  const client = createSecClient({
    userAgent: "Fixture Tests tests@example.com",
    fetch: transport,
  });
  return { client, responses, transport, starts };
}

async function complete<T>(work: Promise<T>): Promise<T> {
  // Attach rejection handling before advancing the fake request/timeout clock.
  const result = work.then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  await vi.runAllTimersAsync();
  const settled = await result;
  if ("error" in settled) throw settled.error;
  return settled.value;
}

describe("SEC history adapter with only the external transport stubbed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves input and combines every archive without duplicates using the declared identity", async () => {
    const { client, transport, starts } = setup();
    const history = await complete(client.getCompanyHistory(" aapl "));
    expect(history.company).toEqual({ ticker: "AAPL", cik: "0000320193", name: "Apple Inc." });
    expect(history.filings.map((filing) => filing.accessionNumber)).toEqual([
      "0000320193-26-000001",
      "0000320193-25-000002",
      "0001193125-24-000003",
      "0000320193-00-000004",
    ]);
    expect(transport.mock.calls.map(([url]) => url)).toEqual([
      directoryUrl,
      mainUrl,
      archiveUrl,
      oldestUrl,
    ]);
    for (const [, init] of transport.mock.calls) {
      expect(new Headers(init.headers).get("User-Agent")).toBe("Fixture Tests tests@example.com");
      expect(init.redirect).toBe("error");
    }
    expect(starts.slice(1).every((time, index) => time - (starts[index] ?? time) >= 200)).toBe(
      true,
    );
  });

  it("preserves ticker punctuation and shares history across aliases and concurrent callers", async () => {
    const { client, transport, starts } = setup();
    const histories = await complete(
      Promise.all([
        client.getCompanyHistory("brk-b"),
        client.getCompanyHistory(" BRK-A "),
        client.getCompanyHistory("brk-b"),
        client.getCompanyHistory("AAPL"),
      ]),
    );
    expect(histories.map((history) => history.company.ticker)).toEqual([
      "BRK-B",
      "BRK-A",
      "BRK-B",
      "AAPL",
    ]);
    expect(transport.mock.calls.filter(([url]) => url.includes("CIK0001067983"))).toHaveLength(1);
    expect(transport.mock.calls.filter(([url]) => url === directoryUrl)).toHaveLength(1);
    expect(starts.slice(1).every((time, index) => time - (starts[index] ?? time) >= 200)).toBe(
      true,
    );
  });

  it("distinguishes an unmapped ticker from empty history and invalid input", async () => {
    const { client, responses } = setup();
    await expect(complete(client.getCompanyHistory("UNKNOWN"))).rejects.toMatchObject({
      code: "TICKER_NOT_FOUND",
      message: expect.stringContaining("directory"),
    });
    await expect(complete(client.getCompanyHistory("  "))).rejects.toMatchObject({
      code: "INVALID_TICKER",
    });
    responses.set(mainUrl, {
      ...main,
      filings: { recent: { accessionNumber: [], form: [], filingDate: [] }, files: [] },
    });
    expect((await complete(client.getCompanyHistory("AAPL"))).filings).toEqual([]);
  });

  it("reuses successful reads for five minutes then refreshes directory and complete history", async () => {
    const { client, transport } = setup();
    await complete(client.getCompanyHistory("AAPL"));
    await complete(client.getCompanyHistory(" aapl "));
    expect(transport).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 1);
    await complete(client.getCompanyHistory("AAPL"));
    expect(transport).toHaveBeenCalledTimes(8);
  });

  it.each([
    [403, "SEC_FORBIDDEN"],
    [429, "SEC_RATE_LIMITED"],
    [503, "SEC_UNAVAILABLE"],
  ])(
    "fails the whole company on archive HTTP %s and allows a later retry",
    async (status, code) => {
      const { client, responses, transport } = setup();
      responses.set(archiveUrl, new Response("upstream failure", { status }));
      await expect(complete(client.getCompanyHistory("AAPL"))).rejects.toMatchObject({
        code,
        status,
        message: expect.stringContaining("submissions-001.json"),
      });
      responses.set(archiveUrl, archive);
      expect((await complete(client.getCompanyHistory("AAPL"))).filings).toHaveLength(4);
      expect(transport.mock.calls.filter(([url]) => url === archiveUrl)).toHaveLength(2);
    },
  );

  it.each([
    ["invalid directory", directoryUrl, { 0: { ...directory[0], cik_str: 0 } }],
    ["wrong company", mainUrl, { ...main, cik: "0000000001" }],
    [
      "unsafe archive reference",
      mainUrl,
      { ...main, filings: { ...main.filings, files: [{ name: "https://other.example/secret" }] } },
    ],
    ["malformed archive columns", archiveUrl, { ...archive, form: [] }],
    ["invalid JSON", archiveUrl, new Response("not JSON")],
  ])(
    "rejects %s as invalid SEC data and does not cache the failure",
    async (_label, url, payload) => {
      const { client, responses } = setup();
      const original = responses.get(url);
      responses.set(url, payload);
      await expect(complete(client.getCompanyHistory("AAPL"))).rejects.toMatchObject({
        code: "INVALID_SEC_DATA",
      });
      responses.set(url, original);
      expect((await complete(client.getCompanyHistory("AAPL"))).filings).toHaveLength(4);
    },
  );

  it("reports connection failure without caching it", async () => {
    const { client, responses } = setup();
    responses.set(directoryUrl, new TypeError("connection closed"));
    await expect(complete(client.getCompanyHistory("AAPL"))).rejects.toMatchObject({
      code: "SEC_UNAVAILABLE",
    });
    responses.set(directoryUrl, directory);
    expect((await complete(client.getCompanyHistory("AAPL"))).filings).toHaveLength(4);
  });

  it("aborts a stalled request after ten seconds, then permits recovery", async () => {
    const { client, transport } = setup();
    transport.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
        }),
    );
    const began = Date.now();
    await expect(complete(client.getCompanyHistory("AAPL"))).rejects.toMatchObject({
      code: "SEC_TIMEOUT",
    });
    expect(Date.now() - began).toBe(10_000);
    expect((await complete(client.getCompanyHistory("AAPL"))).filings).toHaveLength(4);
  });
});
