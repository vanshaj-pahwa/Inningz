'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CacheKey, CacheConfig } from '../types';
import { getCache } from '../cache';
import { getRequestManager } from '../request';

interface UseCachedDataOptions {
  ttl?: number;
  staleWhileRevalidate?: number;
  pollInterval?: number;
  enabled?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

interface UseCachedDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
  invalidate: () => void;
}

export function useCachedData<T>(
  key: CacheKey,
  fetcher: () => Promise<T>,
  options: UseCachedDataOptions = {}
): UseCachedDataResult<T> {
  const {
    ttl,
    staleWhileRevalidate,
    pollInterval,
    enabled = true,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const cache = getCache();
  const requestManager = getRequestManager();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const cacheConfig: Partial<CacheConfig> | undefined =
    ttl !== undefined || staleWhileRevalidate !== undefined
      ? { ttl: ttl ?? 60000, staleWhileRevalidate: staleWhileRevalidate ?? 120000, version: 1 }
      : undefined;

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!enabled) return;

    // Check cache first (unless refreshing)
    if (!isRefresh) {
      const cached = cache.get<T>(key, cacheConfig);
      if (cached) {
        if (mountedRef.current) {
          setData(cached.data);
          setIsStale(cached.isStale);
          setLastUpdated(cached.timestamp);
          setLoading(false);
          setError(null);
        }

        // If not stale, we're done
        if (!cached.isStale) {
          return;
        }
        // If stale, continue to fetch fresh data in background
      }
    }

    try {
      if (mountedRef.current && !data) {
        setLoading(true);
      }

      const freshData = await requestManager.request(key, fetcher);

      // Cache the result
      cache.set(key, freshData, cacheConfig);

      if (mountedRef.current) {
        setData(freshData);
        setIsStale(false);
        setLastUpdated(Date.now());
        setLoading(false);
        setError(null);
        onSuccess?.(freshData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';

      if (mountedRef.current) {
        setError(errorMessage);
        setLoading(false);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  }, [key, fetcher, enabled, cache, requestManager, cacheConfig, data, onSuccess, onError]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    cache.delete(key);
    setData(null);
    setIsStale(false);
    setLastUpdated(null);
    fetchData(true);
  }, [key, cache, fetchData]);

  // Initial fetch and polling setup
  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      fetchData();

      // Set up polling if interval is specified
      if (pollInterval && pollInterval > 0) {
        pollTimerRef.current = setInterval(() => {
          fetchData(true);
        }, pollInterval);
      }
    }

    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [key, enabled, pollInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause polling when tab is hidden
  useEffect(() => {
    if (!pollInterval) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause polling
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      } else {
        // Resume polling and fetch immediately
        fetchData(true);
        pollTimerRef.current = setInterval(() => {
          fetchData(true);
        }, pollInterval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollInterval, fetchData]);

  return {
    data,
    loading,
    error,
    isStale,
    lastUpdated,
    refresh,
    invalidate,
  };
}
