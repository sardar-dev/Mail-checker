interface CacheEntry<T> {
  value: T;
  expiry: number;
}

/**
 * LRU-style in-memory cache with TTL.
 * Used to cache DNS/MX results so the same domain isn't looked up repeatedly.
 */
export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTtlMs: number;

  constructor(maxSize = 500, defaultTtlMs = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used) for LRU eviction
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // If already exists, delete first to update position
    this.cache.delete(key);

    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Domain DNS/MX cache — 5 minute TTL, max 500 domains
export const dnsCache = new LRUCache<{ mxFound: boolean; domainValid: boolean }>(
  500,
  5 * 60 * 1000
);

// Email verification cache — 10 minute TTL, max 2000 emails
export const emailCache = new LRUCache<{
  wellFormed: boolean;
  validDomain: boolean;
  validMailbox: boolean | null;
}>(2000, 10 * 60 * 1000);
