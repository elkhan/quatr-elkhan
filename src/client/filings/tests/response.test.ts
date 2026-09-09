import { describe, expect, it } from "vitest";
import { filings, filingsPage } from "../../tests/fixtures";
import { filingsResponseSchema } from "../schemas/filings";

describe("original document links at the client boundary", () => {
  it.each([
    "javascript:alert(1)",
    "https://www.sec.gov.evil.example/Archives/edgar/data/1/report.htm",
    "https://www.sec.gov@evil.example/Archives/edgar/data/1/report.htm",
    "https://user@www.sec.gov/Archives/edgar/data/1/report.htm",
    "http://www.sec.gov/Archives/edgar/data/1/report.htm",
    "https://www.sec.gov/Archives/edgar/data/../../redirect",
    "not a URL",
  ])("rejects unsafe or invalid document URL %s", (documentUrl) => {
    const payload = { ...filingsPage(), filings: [{ ...filings[0], documentUrl }] };
    expect(filingsResponseSchema.safeParse(payload).success).toBe(false);
  });
  it("keeps both original documents and complete-submission fallback links", () => {
    const documentUrl = "https://www.sec.gov/Archives/edgar/data/320193/0000320193-26-000001.txt";
    const payload = { ...filingsPage(), filings: [filings[0], { ...filings[1], documentUrl }] };
    expect(
      filingsResponseSchema.parse(payload).filings.map((filing) => filing.documentUrl),
    ).toEqual([filings[0]?.documentUrl, documentUrl]);
  });
});
