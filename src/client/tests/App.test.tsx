import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { apple, deferredResponse, filings, filingsPage, spotify, summary } from "./fixtures";

const transport = vi.fn<typeof fetch>();

beforeEach(() => {
  transport.mockReset();
  transport.mockImplementation(async () => {
    throw new Error("Unexpected API request in test");
  });
  vi.stubGlobal("fetch", transport);
});
afterEach(() => vi.unstubAllGlobals());

function search(ticker = "AAPL") {
  fireEvent.change(screen.getByLabelText("Ticker"), { target: { value: ticker } });
  fireEvent.click(screen.getByRole("button", { name: "Search filings" }));
}

function summarize(tickers = "AAPL,SPOT,UNKNOWN") {
  fireEvent.change(screen.getByLabelText("Summary tickers"), { target: { value: tickers } });
  fireEvent.click(screen.getByRole("button", { name: "Summarize" }));
}

function expectRequest(path: string) {
  expect(transport).toHaveBeenLastCalledWith(
    path,
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
}

describe("filing browser", () => {
  it("waits for submission and explains ticker-directory coverage", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "SEC filings" })).toBeVisible();
    expect(screen.getByText(/Ticker lookup does not cover every SEC filer/)).toBeVisible();
    expect(transport).not.toHaveBeenCalled();
  });

  it("normalizes a search, renders original links and enforces pagination boundaries", async () => {
    transport
      .mockResolvedValueOnce(Response.json(filingsPage()))
      .mockResolvedValueOnce(Response.json(filingsPage(2)));
    render(<App />);
    search(" aapl ");
    expectRequest("/companies/AAPL/filings?page=1&pageSize=25&sort=desc");
    expect(await screen.findByRole("heading", { name: "Apple Inc. (AAPL)" })).toBeVisible();
    const link = screen.getByRole("link", {
      name: "Open 10-K filing 0000320193-26-000001 (opens in new tab)",
    });
    expect(link).toHaveAttribute("href", filings[0]?.documentUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expectRequest("/companies/AAPL/filings?page=2&pageSize=25&sort=desc");
    expect(await screen.findByText("Page 2 of 2")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Apple Inc. (AAPL)" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
  });

  it("resets pagination on submitted form/sort changes and preserves them when switching companies", async () => {
    transport
      .mockResolvedValueOnce(Response.json(filingsPage()))
      .mockResolvedValueOnce(Response.json(filingsPage(2)));
    render(<App />);
    search();
    fireEvent.click(await screen.findByRole("button", { name: "Next page" }));
    await screen.findByText("Page 2 of 2");
    transport.mockResolvedValueOnce(
      Response.json({ ...filingsPage(), filings: [{ ...filings[0], form: "20-F" }], total: 1 }),
    );
    fireEvent.change(screen.getByLabelText("Form filter"), { target: { value: " 20-F " } });
    fireEvent.change(screen.getByLabelText("Filing date order"), { target: { value: "asc" } });
    fireEvent.click(screen.getByRole("button", { name: "Search filings" }));
    expectRequest("/companies/AAPL/filings?page=1&pageSize=25&sort=asc&form=20-F");
    expect(await screen.findByRole("link", { name: /Open 20-F filing/ })).toBeVisible();
    transport.mockResolvedValueOnce(
      Response.json({ ...filingsPage(), company: spotify, filings: [], total: 0 }),
    );
    fireEvent.click(screen.getByRole("button", { name: "SPOT" }));
    expectRequest("/companies/SPOT/filings?page=1&pageSize=25&sort=asc&form=20-F");
    expect(
      await screen.findByRole("heading", { name: "Spotify Technology S.A. (SPOT)" }),
    ).toBeVisible();
    expect(screen.getByText("No filings match these criteria.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("recovers when refreshed history no longer has the requested page", async () => {
    transport
      .mockResolvedValueOnce(Response.json(filingsPage()))
      .mockResolvedValueOnce(Response.json({ ...filingsPage(2), filings: [], total: 1 }))
      .mockResolvedValueOnce(Response.json({ ...filingsPage(), filings: [filings[0]], total: 1 }));
    render(<App />);
    search();
    fireEvent.click(await screen.findByRole("button", { name: "Next page" }));
    expect(
      await screen.findByText(
        "This page is no longer available. The filing total may have changed.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("No filings match these criteria.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go to first page" }));
    expectRequest("/companies/AAPL/filings?page=1&pageSize=25&sort=desc");
    expect(await screen.findByText("Page 1 of 1")).toBeVisible();
  });

  it("keeps draft input separate from the active query when paging and supports arbitrary forms", async () => {
    transport
      .mockResolvedValueOnce(Response.json(filingsPage()))
      .mockResolvedValueOnce(Response.json(filingsPage(2)));
    render(<App />);
    search("BRK-B");
    await screen.findByText("Page 1 of 2");
    fireEvent.change(screen.getByLabelText("Ticker"), { target: { value: "SPOT" } });
    fireEvent.change(screen.getByLabelText("Form filter"), { target: { value: "10-K/A" } });
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expectRequest("/companies/BRK-B/filings?page=2&pageSize=25&sort=desc");
    await screen.findByText("Page 2 of 2");
    transport.mockResolvedValueOnce(Response.json({ ...filingsPage(), filings: [], total: 0 }));
    fireEvent.click(screen.getByRole("button", { name: "Search filings" }));
    expectRequest("/companies/SPOT/filings?page=1&pageSize=25&sort=desc&form=10-K%2FA");
    expect(await screen.findByText("No filings match these criteria.")).toBeVisible();
  });

  it("shows loading, reports a lookup error and retries the submitted criteria", async () => {
    const pending = deferredResponse();
    transport.mockReturnValueOnce(pending.promise);
    render(<App />);
    search("UNKNOWN");
    expect(screen.getByRole("status")).toHaveTextContent(/Loading filing history/);
    await act(async () =>
      pending.complete(
        Response.json(
          {
            error: {
              code: "TICKER_NOT_FOUND",
              message: "Ticker lookup does not cover every SEC filer.",
            },
          },
          { status: 404 },
        ),
      ),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ticker lookup does not cover every SEC filer.",
    );
    transport.mockResolvedValueOnce(Response.json({ ...filingsPage(), filings: [], total: 0 }));
    fireEvent.change(screen.getByLabelText("Ticker"), { target: { value: "SPOT" } });
    fireEvent.click(screen.getByRole("button", { name: "Retry filings" }));
    expectRequest("/companies/UNKNOWN/filings?page=1&pageSize=25&sort=desc");
    expect(await screen.findByText("No filings match these criteria.")).toBeVisible();
  });

  it("rejects blank input locally and can recover with a new search", async () => {
    render(<App />);
    search("   ");
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a ticker.");
    expect(transport).not.toHaveBeenCalled();
    transport.mockResolvedValueOnce(Response.json(filingsPage()));
    search();
    expect(await screen.findByRole("heading", { name: "Apple Inc. (AAPL)" })).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ignores an old response even when the transport ignores cancellation", async () => {
    const old = deferredResponse();
    transport
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(Response.json({ ...filingsPage(), company: spotify }));
    render(<App />);
    search();
    const oldSignal = transport.mock.calls[0]?.[1]?.signal;
    search("SPOT");
    expect(oldSignal?.aborted).toBe(true);
    expect(
      await screen.findByRole("heading", { name: "Spotify Technology S.A. (SPOT)" }),
    ).toBeVisible();
    await act(async () => old.complete(Response.json(filingsPage())));
    expect(screen.queryByRole("heading", { name: "Apple Inc. (AAPL)" })).not.toBeInTheDocument();
  });

  it.each([
    [
      "unsafe document URL",
      { ...filingsPage(), filings: [{ ...filings[0], documentUrl: "javascript:alert(1)" }] },
    ],
    ["malformed pagination", { ...filingsPage(), pageSize: 0 }],
  ])("rejects %s instead of rendering untrusted data", async (_name, payload) => {
    transport.mockResolvedValueOnce(Response.json(payload));
    render(<App />);
    search();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server returned an invalid response.",
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("company summaries", () => {
  it("normalizes and deduplicates input, shows exact counts, dates, and per-company errors", async () => {
    transport.mockResolvedValueOnce(Response.json(summary));
    render(<App />);
    summarize(" aapl ,SPOT,aapl,UNKNOWN ");
    expectRequest("/filings/summary?tickers=AAPL%2CSPOT%2CUNKNOWN");
    const results = await screen.findByRole("region", { name: "Summary results" });
    expect(results).toHaveTextContent("2025-09-09 through 2026-09-09 (inclusive, UTC)");
    expect(within(results).getByText("10-K/A")).toBeVisible();
    expect(within(results).getByRole("row", { name: "8-K 1,234" })).toBeVisible();
    expect(within(results).getByText("20-F")).toBeVisible();
    expect(within(results).getByText("None found")).toBeVisible();
    expect(within(results).getByText("2026-02-01")).toBeVisible();
    expect(within(results).getByRole("alert")).toHaveTextContent(
      "UNKNOWN is not in SEC's ticker directory.",
    );
    expect(within(results).getAllByRole("table")).toHaveLength(2);
  });

  it.each([
    "",
    "AAPL,",
    "AAPL,,SPOT",
    Array.from({ length: 11 }, (_, index) => `T${index}`).join(","),
  ])("rejects invalid batch %s without an API request", async (input) => {
    render(<App />);
    summarize(input);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Enter 1–10 tickers/);
    expect(transport).not.toHaveBeenCalled();
  });

  it("shows summary loading, a network error and recovery to an empty successful summary", async () => {
    const pending = deferredResponse();
    transport.mockReturnValueOnce(pending.promise);
    render(<App />);
    summarize("AAPL");
    expect(screen.getByRole("status")).toHaveTextContent(/Loading summaries/);
    await act(async () => pending.complete(new Response("Unavailable", { status: 503 })));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load data (HTTP 503).");
    transport.mockResolvedValueOnce(
      Response.json({
        ...summary,
        results: [
          {
            ticker: "AAPL",
            status: "success",
            company: apple,
            countsByForm: {},
            latest10KDate: null,
          },
        ],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry summary" }));
    expect(await screen.findByText("No filings in this window.")).toBeVisible();
    expect(screen.getByText("None found")).toBeVisible();
  });

  it("ignores an old summary failure and keeps the latest requested companies", async () => {
    const old = deferredResponse();
    transport
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(Response.json({ ...summary, results: [summary.results[1]] }));
    render(<App />);
    summarize("AAPL");
    const oldSignal = transport.mock.calls[0]?.[1]?.signal;
    summarize("SPOT");
    expect(oldSignal?.aborted).toBe(true);
    expect(
      await screen.findByRole("heading", { name: "Spotify Technology S.A. (SPOT)" }),
    ).toBeVisible();
    await act(async () =>
      old.complete(
        Response.json(
          { error: { code: "SEC_UNAVAILABLE", message: "Old request failed" } },
          { status: 503 },
        ),
      ),
    );
    expect(screen.getByRole("heading", { name: "Spotify Technology S.A. (SPOT)" })).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps summary and filing failures independent and cancels pending work on unmount", async () => {
    const pending = deferredResponse();
    transport
      .mockReturnValueOnce(pending.promise)
      .mockRejectedValueOnce(new TypeError("Synthetic network error"));
    const view = render(<App />);
    search();
    summarize("AAPL");
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server.");
    expect(screen.getByRole("status")).toHaveTextContent(/Loading filing history/);
    const filingSignal = transport.mock.calls[0]?.[1]?.signal;
    expect(filingSignal?.aborted).toBe(false);
    view.unmount();
    expect(filingSignal?.aborted).toBe(true);
    await act(async () => pending.complete(Response.json(filingsPage())));
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
  });
});
