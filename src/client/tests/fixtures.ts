export const apple = { ticker: "AAPL", cik: "0000320193", name: "Apple Inc." };
export const spotify = { ticker: "SPOT", cik: "0001639920", name: "Spotify Technology S.A." };

export const filings = Array.from({ length: 26 }, (_, index) => {
  const sequence = String(index + 1).padStart(6, "0");
  return {
    accessionNumber: `0000320193-26-${sequence}`,
    form: "10-K",
    filingDate: "2026-02-01",
    documentUrl: `https://www.sec.gov/Archives/edgar/data/320193/000032019326${sequence}/report.htm`,
  };
});

export function filingsPage(page = 1) {
  return {
    company: apple,
    filings: filings.slice((page - 1) * 25, page * 25),
    page,
    pageSize: 25,
    total: 26,
  };
}

export const summary = {
  window: { from: "2025-09-09", to: "2026-09-09" },
  results: [
    {
      ticker: "AAPL",
      status: "success",
      company: apple,
      countsByForm: { "10-K": 2, "10-K/A": 1, "8-K": 1234 },
      latest10KDate: "2026-02-01",
    },
    {
      ticker: "SPOT",
      status: "success",
      company: spotify,
      countsByForm: { "20-F": 1, "6-K": 3 },
      latest10KDate: null,
    },
    {
      ticker: "UNKNOWN",
      status: "error",
      error: {
        code: "TICKER_NOT_FOUND",
        message:
          "UNKNOWN is not in SEC's ticker directory. Ticker lookup does not cover every filer.",
      },
    },
  ],
};

export function deferredResponse() {
  let complete: (response: Response) => void = () => {
    throw new Error("Deferred response was not initialized");
  };
  const promise = new Promise<Response>((resolve) => {
    complete = resolve;
  });
  return { promise, complete };
}
