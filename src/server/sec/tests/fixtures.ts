// Small synthetic SEC-shaped payloads; no live network dependency in tests.
export const directory = {
  0: { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." },
  1: { cik_str: 1067983, ticker: "BRK-B", title: "Berkshire Hathaway Inc." },
  2: { cik_str: 1067983, ticker: "BRK-A", title: "Berkshire Hathaway Inc." },
};

export const recent = {
  accessionNumber: ["0000320193-26-000001", "0000320193-25-000002"],
  form: ["10-Q", "10-K/A"],
  filingDate: ["2026-08-01", "2025-11-01"],
  primaryDocument: ["quarterly.htm", "amendment.htm"],
  unrelatedColumn: [1, 2],
};

export const archive = {
  accessionNumber: ["0000320193-25-000002", "0001193125-24-000003"],
  form: ["10-K/A", "10-K"],
  filingDate: ["2025-11-01", "2024-10-31"],
  primaryDocument: ["outdated-amendment.htm", ""],
};

export const oldestArchive = {
  accessionNumber: ["0000320193-00-000004"],
  form: ["8-K"],
  filingDate: ["2000-01-01"],
};

export const main = {
  cik: "0000320193",
  name: "Apple Inc.",
  unrelatedMetadata: true,
  filings: {
    recent,
    files: [
      { name: "CIK0000320193-submissions-001.json", filingCount: 2 },
      { name: "CIK0000320193-submissions-002.json", filingCount: 1 },
    ],
  },
};
