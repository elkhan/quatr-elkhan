import type { Filing } from "../sec/types/filing";
import type { FilingsPage, FilingsQuery } from "./types/filings";

function compareFilings(left: Filing, right: Filing): number {
  const dateOrder = left.filingDate.localeCompare(right.filingDate);
  if (dateOrder !== 0) return dateOrder;
  return left.accessionNumber.localeCompare(right.accessionNumber);
}

export function paginateFilings(filings: readonly Filing[], query: FilingsQuery): FilingsPage {
  const { page, pageSize, form, sort } = query;
  const matches = filings.filter((filing) => form === undefined || filing.form === form);
  const total = matches.length;

  // Check against the page count before multiplying: a valid page may be MAX_SAFE_INTEGER.
  if (page > Math.ceil(total / pageSize)) return { filings: [], page, pageSize, total };

  const direction = sort === "asc" ? 1 : -1;
  const ordered = matches.toSorted((left, right) => direction * compareFilings(left, right));
  const start = (page - 1) * pageSize;
  return { filings: ordered.slice(start, start + pageSize), page, pageSize, total };
}
