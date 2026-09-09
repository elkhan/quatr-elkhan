import type { Filing } from "../../sec/types/filing";

// Deliberately unordered; two filings share a date and amendments stay distinct.
export const filings: readonly Filing[] = [
  {
    accessionNumber: "0000000001-25-000004",
    form: "10-K/A",
    filingDate: "2025-11-01",
    documentUrl: "https://www.sec.gov/fixture/amendment.htm",
  },
  {
    accessionNumber: "0000000001-99-000001",
    form: "10-K",
    filingDate: "1999-01-01",
    documentUrl: "https://www.sec.gov/fixture/old.htm",
  },
  {
    accessionNumber: "0000000001-26-000006",
    form: "8-K",
    filingDate: "2026-09-01",
    documentUrl: "https://www.sec.gov/fixture/current.htm",
  },
  {
    accessionNumber: "0000000001-25-000003",
    form: "10-K",
    filingDate: "2025-11-01",
    documentUrl: "https://www.sec.gov/fixture/annual.htm",
  },
  {
    accessionNumber: "0000000001-24-000002",
    form: "20-F",
    filingDate: "2024-02-29",
    documentUrl: "https://www.sec.gov/fixture/foreign.htm",
  },
];
