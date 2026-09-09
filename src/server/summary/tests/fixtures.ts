import { archive, main, oldestArchive } from "../../sec/tests/fixtures";
import type { Filing } from "../../sec/types/filing";

export function filing(form: string, filingDate: string): Filing {
  return {
    form,
    filingDate,
    accessionNumber: "0000000001-26-000001",
    documentUrl: "https://www.sec.gov/fixture/report.htm",
  };
}

export const summaryDirectory = {
  0: { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." },
  1: { cik_str: 1639920, ticker: "SPOT", title: "Spotify Technology S.A." },
  2: { cik_str: 19617, ticker: "JPM", title: "JPMorgan Chase & Co." },
};

const spotifySubmissions = {
  cik: "0001639920",
  name: "Spotify Technology S.A.",
  filings: {
    recent: {
      accessionNumber: ["0001639920-25-000001", "0001639920-26-000002"],
      form: ["20-F", "6-K"],
      filingDate: ["2025-09-09", "2026-09-09"],
    },
    files: [],
  },
};

const jpmSubmissions = {
  cik: "0000019617",
  name: "JPMorgan Chase & Co.",
  filings: {
    recent: { accessionNumber: [], form: [], filingDate: [] },
    files: [],
  },
};

export const summaryPayloads = new Map<string, unknown>([
  ["https://www.sec.gov/files/company_tickers.json", summaryDirectory],
  ["https://data.sec.gov/submissions/CIK0000320193.json", main],
  ["https://data.sec.gov/submissions/CIK0000320193-submissions-001.json", archive],
  ["https://data.sec.gov/submissions/CIK0000320193-submissions-002.json", oldestArchive],
  ["https://data.sec.gov/submissions/CIK0001639920.json", spotifySubmissions],
  ["https://data.sec.gov/submissions/CIK0000019617.json", jpmSubmissions],
]);
