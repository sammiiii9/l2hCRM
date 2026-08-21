/**
 * Ultra-fast In-Memory TTLCache for Next.js Serverless & Node runtimes.
 * Prevents redundant trans-continental database queries to Australia for read-heavy endpoints.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export async function getOrSetCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const cached = memoryCache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const data = await fetcher();
  memoryCache.set(key, {
    data,
    expiresAt: now + ttlMs,
  });

  return data;
}

export function invalidateCache(keyPrefix?: string) {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryCache.delete(key);
    }
  }
}
