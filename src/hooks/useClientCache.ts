"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// In-memory runtime cache
const memoryCache = new Map<string, { data: any; timestamp: number }>();

export interface UseCachedFetchOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  ttlMs?: number; // Time-to-live before background revalidation (default: 30s)
  initialData?: T;
  persistKey?: string; // If provided, persists in sessionStorage
}

export function useCachedFetch<T>({
  key,
  fetcher,
  ttlMs = 30000,
  initialData,
  persistKey,
}: UseCachedFetchOptions<T>) {
  // Try to grab from memory or sessionStorage immediately for 0ms render
  const getCachedValue = (): T | undefined => {
    const mem = memoryCache.get(key);
    if (mem) return mem.data;

    if (typeof window !== "undefined" && persistKey) {
      try {
        const stored = sessionStorage.getItem(`l2h_cache_${persistKey}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.data) {
            memoryCache.set(key, { data: parsed.data, timestamp: parsed.timestamp || Date.now() });
            return parsed.data;
          }
        }
      } catch (e) {}
    }

    return initialData;
  };

  const [data, setData] = useState<T | undefined>(getCachedValue);
  const [loading, setLoading] = useState<boolean>(!getCachedValue());
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const execute = useCallback(
    async (force: boolean = false) => {
      const now = Date.now();
      const existing = memoryCache.get(key);

      // If we have fresh cached data and not forced, return immediately
      if (!force && existing && now - existing.timestamp < ttlMs) {
        setData(existing.data);
        setLoading(false);
        return existing.data;
      }

      if (!existing && !data) {
        setLoading(true);
      } else {
        setIsRevalidating(true);
      }

      try {
        const result = await fetcherRef.current();
        memoryCache.set(key, { data: result, timestamp: Date.now() });

        if (typeof window !== "undefined" && persistKey) {
          try {
            sessionStorage.setItem(
              `l2h_cache_${persistKey}`,
              JSON.stringify({ data: result, timestamp: Date.now() })
            );
          } catch (e) {}
        }

        setData(result);
        setError(null);
        return result;
      } catch (err) {
        console.error(`Cache fetch error [${key}]:`, err);
        setError(err);
      } finally {
        setLoading(false);
        setIsRevalidating(false);
      }
    },
    [key, ttlMs, persistKey, data]
  );

  useEffect(() => {
    // Immediate check & background fetch
    const cached = getCachedValue();
    if (cached) {
      setData(cached);
      setLoading(false);
    }
    execute(false);
  }, [key]);

  const mutate = useCallback(
    (newData: T | ((prev: T | undefined) => T), revalidate: boolean = true) => {
      setData((prev) => {
        const updated = typeof newData === "function" ? (newData as any)(prev) : newData;
        memoryCache.set(key, { data: updated, timestamp: Date.now() });
        if (typeof window !== "undefined" && persistKey) {
          try {
            sessionStorage.setItem(
              `l2h_cache_${persistKey}`,
              JSON.stringify({ data: updated, timestamp: Date.now() })
            );
          } catch (e) {}
        }
        return updated;
      });

      if (revalidate) {
        execute(true);
      }
    },
    [key, persistKey, execute]
  );

  return {
    data,
    loading,
    isRevalidating,
    error,
    refresh: () => execute(true),
    mutate,
  };
}

// Direct memory cache setter/getter for manual prefetching
export function setClientCache<T>(key: string, data: T) {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

export function getClientCache<T>(key: string): T | undefined {
  return memoryCache.get(key)?.data;
}

export function clearClientCache(keyPrefix?: string) {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  Array.from(memoryCache.keys()).forEach((k) => {
    if (k.startsWith(keyPrefix)) memoryCache.delete(k);
  });
}
