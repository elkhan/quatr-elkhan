import type { Filing } from "../sec/types/filing";
import type { DateWindow, FilingSummary } from "./types/summary";

export function createDateWindow(now: Date): DateWindow {
  const previousYear = new Date(now);
  previousYear.setUTCFullYear(now.getUTCFullYear() - 1);
  if (previousYear.getUTCMonth() !== now.getUTCMonth()) {
    // February 29 rolls into March in a non-leap year; use February's last day.
    previousYear.setUTCDate(0);
  }
  return { from: previousYear.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

export function summarizeFilings(filings: readonly Filing[], window: DateWindow): FilingSummary {
  const counts = new Map<string, number>();
  let latest10KDate: string | null = null;
  for (const filing of filings) {
    if (filing.filingDate > window.to) continue;
    if (filing.form === "10-K" && (latest10KDate === null || filing.filingDate > latest10KDate)) {
      latest10KDate = filing.filingDate;
    }
    if (filing.filingDate >= window.from) {
      counts.set(filing.form, (counts.get(filing.form) ?? 0) + 1);
    }
  }
  return { countsByForm: Object.fromEntries(counts), latest10KDate };
}
