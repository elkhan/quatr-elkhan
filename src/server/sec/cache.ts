import type { CacheEntry } from "./types/cache";

const CACHE_TTL_MS = 5 * 60_000;
const MAX_COMPLETED_ENTRIES = 20;

function evictCompletedEntries<T>(entries: Map<string, CacheEntry<T>>): void {
  const completed = [...entries].filter(([, entry]) => Number.isFinite(entry.expiresAt));
  const excessCount = Math.max(0, completed.length - MAX_COMPLETED_ENTRIES);
  const excess = completed.slice(0, excessCount);
  for (const [key] of excess) entries.delete(key);
}

export function createCache<T>() {
  const entries = new Map<string, CacheEntry<T>>();

  function remember(key: string, load: () => Promise<T>): Promise<T> {
    const cached = entries.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.promise;

    const entry: CacheEntry<T> = {
      expiresAt: Number.POSITIVE_INFINITY,
      promise: load()
        .then((value) => {
          entry.expiresAt = Date.now() + CACHE_TTL_MS;
          // Completed entries are bounded; in-flight requests must remain shared.
          evictCompletedEntries(entries);
          return value;
        })
        .catch((error) => {
          entries.delete(key);
          throw error;
        }),
    };
    entries.delete(key);
    entries.set(key, entry);
    return entry.promise;
  }

  return { remember };
}
