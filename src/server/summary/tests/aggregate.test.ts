import { describe, expect, it } from "vitest";
import { createDateWindow, summarizeFilings } from "../aggregate";
import { filing } from "./fixtures";

describe("summary date window and aggregation", () => {
  it.each([
    ["2026-09-09T23:59:59Z", { from: "2025-09-09", to: "2026-09-09" }],
    ["2024-02-29T12:00:00Z", { from: "2023-02-28", to: "2024-02-29" }],
    ["2025-02-28T12:00:00Z", { from: "2024-02-28", to: "2025-02-28" }],
    ["2026-01-01T00:30:00+02:00", { from: "2024-12-31", to: "2025-12-31" }],
  ])("uses an inclusive UTC calendar-year window for %s", (timestamp, expected) => {
    const now = new Date(timestamp);
    expect(createDateWindow(now)).toEqual(expected);
    expect(now.getTime()).toBe(new Date(timestamp).getTime());
  });

  it("counts exact forms at both boundaries and ignores outside/future dates", () => {
    const window = createDateWindow(new Date("2026-09-09T12:00:00Z"));
    const filings = Object.freeze([
      filing("8-K", "2025-09-08"),
      filing("8-K", "2025-09-09"),
      filing("8-K", "2026-09-09"),
      filing("8-K", "2026-09-10"),
      filing("10-K", "2026-02-01"),
      filing("10-K/A", "2026-03-01"),
      filing("20-F", "2026-02-01"),
      filing("10-K", "2026-09-10"),
    ]);
    expect(summarizeFilings(filings, window)).toEqual({
      countsByForm: { "8-K": 2, "10-K": 1, "10-K/A": 1, "20-F": 1 },
      latest10KDate: "2026-02-01",
    });
  });

  it("finds the latest exact 10-K in unordered older history independently of counts", () => {
    const filings = [
      filing("10-K", "2024-10-31"),
      filing("10-K/A", "2026-05-01"),
      filing("10-K", "1999-01-01"),
      filing("20-F", "2026-08-01"),
    ];
    expect(summarizeFilings(filings, { from: "2025-09-09", to: "2026-09-09" })).toEqual({
      countsByForm: { "10-K/A": 1, "20-F": 1 },
      latest10KDate: "2024-10-31",
    });
  });

  it("returns empty counts for empty or old history and null without an eligible exact 10-K", () => {
    const window = { from: "2025-09-09", to: "2026-09-09" };
    expect(summarizeFilings([], window)).toEqual({ countsByForm: {}, latest10KDate: null });
    expect(summarizeFilings([filing("10-K", "2024-10-31")], window)).toEqual({
      countsByForm: {},
      latest10KDate: "2024-10-31",
    });
    expect(
      summarizeFilings([filing("20-F", "2024-10-31"), filing("10-K", "2027-01-01")], window),
    ).toEqual({ countsByForm: {}, latest10KDate: null });
  });

  it("counts any form label safely, including names inherited by ordinary objects", () => {
    const result = summarizeFilings(
      [
        filing("__proto__", "2026-01-01"),
        filing("constructor", "2026-01-01"),
        filing("__proto__", "2026-01-02"),
      ],
      { from: "2025-09-09", to: "2026-09-09" },
    );
    expect(Object.entries(result.countsByForm)).toEqual([
      ["__proto__", 2],
      ["constructor", 1],
    ]);
  });
});
