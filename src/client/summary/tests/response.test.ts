import { expect, it } from "vitest";
import { summary } from "../../tests/fixtures";
import { summaryResponseSchema } from "../schemas/summary";

it("preserves exact form counts even for property names with special object behavior", () => {
  const countsByForm = Object.fromEntries([
    ["__proto__", 2],
    ["constructor", 1],
  ]);
  const payload = { ...summary, results: [{ ...summary.results[0], countsByForm }] };
  const parsed = summaryResponseSchema.parse(payload);
  expect(parsed.results[0]).toMatchObject({ countsByForm });
  const result = parsed.results[0];
  if (result?.status !== "success") throw new Error("Expected a successful company");
  expect(Object.entries(result.countsByForm)).toEqual([
    ["__proto__", 2],
    ["constructor", 1],
  ]);
});

it("rejects missing company outcomes instead of displaying an apparently empty success", () => {
  expect(summaryResponseSchema.safeParse({ ...summary, results: [] }).success).toBe(false);
});
