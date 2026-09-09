import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { normalizeFilings } from "../normalize";
import { filingColumnsSchema } from "../schemas/filing";
import { archive, oldestArchive, recent } from "./fixtures";

function normalizePayloads(cik: string, sources: unknown[]) {
  const rows = sources.map((source) => filingColumnsSchema.parse(source));
  return normalizeFilings(cik, rows);
}

describe("SEC filing normalization", () => {
  it("aligns columns, includes older filings, and gives recent duplicates precedence", () => {
    const filings = normalizePayloads("0000320193", [recent, archive, oldestArchive]);
    expect(filings).toEqual([
      {
        accessionNumber: "0000320193-26-000001",
        form: "10-Q",
        filingDate: "2026-08-01",
        documentUrl:
          "https://www.sec.gov/Archives/edgar/data/320193/000032019326000001/quarterly.htm",
      },
      {
        accessionNumber: "0000320193-25-000002",
        form: "10-K/A",
        filingDate: "2025-11-01",
        documentUrl:
          "https://www.sec.gov/Archives/edgar/data/320193/000032019325000002/amendment.htm",
      },
      {
        accessionNumber: "0001193125-24-000003",
        form: "10-K",
        filingDate: "2024-10-31",
        documentUrl: "https://www.sec.gov/Archives/edgar/data/320193/0001193125-24-000003.txt",
      },
      {
        accessionNumber: "0000320193-00-000004",
        form: "8-K",
        filingDate: "2000-01-01",
        documentUrl: "https://www.sec.gov/Archives/edgar/data/320193/0000320193-00-000004.txt",
      },
    ]);
  });

  it("preserves document subdirectories and encodes reserved filename characters", () => {
    const filings = normalizePayloads("0000320193", [
      { ...oldestArchive, primaryDocument: ["xslF345/report #1?😀.xml"] },
    ]);
    expect(filings[0]?.documentUrl).toBe(
      "https://www.sec.gov/Archives/edgar/data/320193/000032019300000004/xslF345/report%20%231%3F%F0%9F%98%80.xml",
    );
  });

  it("allows empty history and a real leap-day filing", () => {
    expect(
      normalizePayloads("0000320193", [{ accessionNumber: [], form: [], filingDate: [] }]),
    ).toEqual([]);
    expect(
      normalizePayloads("0000320193", [{ ...oldestArchive, filingDate: ["2024-02-29"] }])[0]
        ?.filingDate,
    ).toBe("2024-02-29");
  });

  it.each([
    ["missing required column", { ...oldestArchive, form: undefined }],
    ["unequal required columns", { ...oldestArchive, filingDate: [] }],
    ["unequal optional column", { ...oldestArchive, primaryDocument: [] }],
    ["impossible calendar date", { ...oldestArchive, filingDate: ["2025-02-29"] }],
    ["empty required value", { ...oldestArchive, form: [" "] }],
    ["malformed accession", { ...oldestArchive, accessionNumber: ["../filing"] }],
    ["document traversal", { ...oldestArchive, primaryDocument: ["../other.htm"] }],
    ["invalid document Unicode", { ...oldestArchive, primaryDocument: ["\ud800.htm"] }],
  ])("rejects %s instead of returning incomplete or misleading filings", (_label, payload) => {
    expect(() => normalizePayloads("0000320193", [payload])).toThrow(ZodError);
  });
});
