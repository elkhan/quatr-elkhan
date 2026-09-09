import type { Filing, FilingRow } from "./types/filing";

function documentUrl(cik: string, row: FilingRow): string {
  const base = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}`;
  if (!row.primaryDocument) return `${base}/${row.accessionNumber}.txt`;

  const accessionDirectory = row.accessionNumber.replaceAll("-", "");
  const documentPath = row.primaryDocument.split("/").map(encodeURIComponent).join("/");
  return `${base}/${accessionDirectory}/${documentPath}`;
}

// Main response first, then archives: the first occurrence of each accession wins.
export function normalizeFilings(
  cik: string,
  sources: readonly (readonly FilingRow[])[],
): Filing[] {
  const filings = new Map<string, Filing>();
  for (const rows of sources) {
    for (const row of rows) {
      if (filings.has(row.accessionNumber)) continue;
      filings.set(row.accessionNumber, {
        accessionNumber: row.accessionNumber,
        form: row.form,
        filingDate: row.filingDate,
        documentUrl: documentUrl(cik, row),
      });
    }
  }
  return [...filings.values()];
}
