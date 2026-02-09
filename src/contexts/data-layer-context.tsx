'use client';

import { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import type { CacheKey, CacheConfig } from '@/lib/data-layer/types';
import { StorageCache, getCache } from '@/lib/data-layer/cache';
import { RequestManager, getRequestManager } from '@/lib/data-layer/request';

interface DataLayerContextType {
  cache: StorageCache;
  requestManager: RequestManager;

  /**
   * Fetch data with automatic caching
   * Returns cached data if available and fresh, otherwise fetches and caches
   */
  fetchWithCache: <T>(
    key: CacheKey,
    fetcher: () => Promise<T>,
    config?: Partial<CacheConfig>
  ) => Promise<T>;

  /**
   * Invalidate all cached data for a specific match
   */
  invalidateMatchData: (matchId: string) => void;

  /**
   * Invalidate all match lists (live, recent, upcoming)
   */
  invalidateAllMatches: () => void;

  /**
   * Invalidate player data
   */
  invalidatePlayerData: (playerId: string) => void;

  /**
   * Invalidate series data
   */
  invalidateSeriesData: (seriesId: string) => void;

  /**
   * Clear all cached data
   */
  clearAllCache: () => void;
}

const DataLayerContext = createContext<DataLayerContextType | null>(null);

export function DataLayerProvider({ children }: { children: ReactNode }) {
  // Use singleton instances
  const cache = useMemo(() => getCache(), []);
  const requestManager = useMemo(() => getRequestManager(), []);

  const fetchWithCache = useCallback(
    async <T,>(
      key: CacheKey,
      fetcher: () => Promise<T>,
      config?: Partial<CacheConfig>
    ): Promise<T> => {
      // Check cache first
      const cached = cache.get<T>(key, config);
      if (cached && !cached.isStale) {
        return cached.data;
      }

      // Fetch fresh data
      const data = await requestManager.request(key, fetcher);

      // Cache the result
      cache.set(key, data, config);

      return data;
    },
    [cache, requestManager]
  );

  const invalidateMatchData = useCallback(
    (matchId: string) => {
      cache.invalidatePattern(`match:${matchId}`);
    },
    [cache]
  );

  const invalidateAllMatches = useCallback(() => {
    cache.invalidatePattern('matches:');
  }, [cache]);

  const invalidatePlayerData = useCallback(
    (playerId: string) => {
      cache.invalidatePattern(`player:${playerId}`);
    },
    [cache]
  );

  const invalidateSeriesData = useCallback(
    (seriesId: string) => {
      cache.invalidatePattern(`series:${seriesId}`);
    },
    [cache]
  );

  const clearAllCache = useCallback(() => {
    cache.clear();
    requestManager.reset();
  }, [cache, requestManager]);

  const value: DataLayerContextType = useMemo(
    () => ({
      cache,
      requestManager,
      fetchWithCache,
      invalidateMatchData,
      invalidateAllMatches,
      invalidatePlayerData,
      invalidateSeriesData,
      clearAllCache,
    }),
    [
      cache,
      requestManager,
      fetchWithCache,
      invalidateMatchData,
      invalidateAllMatches,
      invalidatePlayerData,
      invalidateSeriesData,
      clearAllCache,
    ]
  );

  return (
    <DataLayerContext.Provider value={value}>
      {children}
    </DataLayerContext.Provider>
  );
}

export function useDataLayer(): DataLayerContextType {
  const context = useContext(DataLayerContext);
  if (!context) {
    throw new Error('useDataLayer must be used within a DataLayerProvider');
  }
  return context;
}

/**
 * Hook to check if we're online
 */
export function useOnlineStatus(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}
