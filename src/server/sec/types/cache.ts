export interface CacheEntry<T> {
  expiresAt: number;
  promise: Promise<T>;
}
