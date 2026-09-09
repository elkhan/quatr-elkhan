import { describe, expect, it } from "vitest";
import { paginateFilings } from "../service";
import type { FilingsQuery } from "../types/filings";
import { filings } from "./fixtures";

const sortCases: [FilingsQuery["sort"], number[]][] = [
  ["asc", [1, 4, 3, 0, 2]],
  ["desc", [2, 0, 3, 4, 1]],
];

describe("filing filtering, ordering, and pagination", () => {
  it("filters the full history before sorting and pagination", () => {
    const result = paginateFilings(filings, { page: 2, pageSize: 1, form: "10-K", sort: "desc" });
    expect(result).toEqual({ filings: [filings[1]], page: 2, pageSize: 1, total: 2 });
  });

  it.each(sortCases)("sorts %s with accession number breaking date ties", (sort, indexes) => {
    const result = paginateFilings(filings, { page: 1, pageSize: 25, sort });
    expect(result.filings).toEqual(indexes.map((index) => filings[index]));
  });

  it("supports foreign and amendment forms through exact matching", () => {
    expect(
      paginateFilings(filings, { page: 1, pageSize: 25, form: "20-F", sort: "desc" }).filings,
    ).toEqual([filings[4]]);
    expect(
      paginateFilings(filings, { page: 1, pageSize: 25, form: "10-K/A", sort: "desc" }).filings,
    ).toEqual([filings[0]]);
  });

  it("handles the last partial page, no matches, empty history, and pages beyond the end", () => {
    expect(paginateFilings(filings, { page: 3, pageSize: 2, sort: "desc" })).toEqual({
      filings: [filings[1]],
      page: 3,
      pageSize: 2,
      total: 5,
    });
    expect(paginateFilings(filings, { page: 4, pageSize: 2, sort: "desc" })).toEqual({
      filings: [],
      page: 4,
      pageSize: 2,
      total: 5,
    });
    expect(
      paginateFilings(filings, { page: 1, pageSize: 25, form: "NO-MATCH", sort: "desc" }),
    ).toEqual({ filings: [], page: 1, pageSize: 25, total: 0 });
    expect(paginateFilings([], { page: 1, pageSize: 25, sort: "desc" })).toEqual({
      filings: [],
      page: 1,
      pageSize: 25,
      total: 0,
    });
  });

  it("does not mutate a shared cached history or lose precision for a very large valid page", () => {
    const shared = Object.freeze([...filings]);
    paginateFilings(shared, { page: 1, pageSize: 25, sort: "asc" });
    expect(shared).toEqual(filings);
    expect(
      paginateFilings(shared, { page: Number.MAX_SAFE_INTEGER, pageSize: 100, sort: "desc" }),
    ).toEqual({ filings: [], page: Number.MAX_SAFE_INTEGER, pageSize: 100, total: 5 });
  });
});
