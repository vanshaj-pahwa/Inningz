import type { CacheEntry, CacheConfig, CacheResult, CacheKey } from '../types';
import { getConfigForKey } from './ttl-config';

const STORAGE_PREFIX = 'inningz-cache:';
const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB limit for localStorage
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean up every 5 minutes

export class StorageCache {
  private memoryCache: Map<string, CacheEntry<unknown>>;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.memoryCache = new Map();
    this.startCleanupTimer();
    this.cleanExpiredEntries();
  }

  /**
   * Get data from cache
   * Returns null if not found or expired beyond stale-while-revalidate
   */
  get<T>(key: CacheKey, config?: Partial<CacheConfig>): CacheResult<T> | null {
    const fullKey = STORAGE_PREFIX + key;
    const cacheConfig = { ...getConfigForKey(key), ...config };

    // Try memory cache first
    const memoryEntry = this.memoryCache.get(fullKey) as CacheEntry<T> | undefined;
    if (memoryEntry) {
      const result = this.checkEntry(memoryEntry, cacheConfig);
      if (result) return result;
    }

    // Try localStorage
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(fullKey);
      if (!stored) return null;

      const entry = JSON.parse(stored) as CacheEntry<T>;

      // Check version
      if (entry.version !== cacheConfig.version) {
        this.delete(key);
        return null;
      }

      const result = this.checkEntry(entry, cacheConfig);
      if (result) {
        // Populate memory cache
        this.memoryCache.set(fullKey, entry);
        return result;
      }

      // Entry is too old, clean it up
      this.delete(key);
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Set data in cache
   */
  set<T>(key: CacheKey, data: T, config?: Partial<CacheConfig>): void {
    const fullKey = STORAGE_PREFIX + key;
    const cacheConfig = { ...getConfigForKey(key), ...config };

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: cacheConfig.ttl,
      version: cacheConfig.version,
    };

    // Always set in memory cache
    this.memoryCache.set(fullKey, entry);

    // Try to set in localStorage
    if (typeof window === 'undefined') return;

    try {
      const serialized = JSON.stringify(entry);

      // Check if we need to free up space
      if (this.wouldExceedQuota(serialized.length)) {
        this.evictOldestEntries(serialized.length);
      }

      localStorage.setItem(fullKey, serialized);
    } catch (e) {
      // localStorage might be full or unavailable
      // Try to free up space and retry once
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        this.evictOldestEntries(1024 * 1024); // Free up 1MB
        try {
          localStorage.setItem(fullKey, JSON.stringify(entry));
        } catch {
          // Give up on localStorage, memory cache still works
        }
      }
    }
  }

  /**
   * Delete a cache entry
   */
  delete(key: CacheKey): void {
    const fullKey = STORAGE_PREFIX + key;
    this.memoryCache.delete(fullKey);

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(fullKey);
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * Invalidate all entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    // Clear from memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear from localStorage
    if (typeof window === 'undefined') return;

    try {
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX) && key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignore errors
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.memoryCache.clear();

    if (typeof window === 'undefined') return;

    try {
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignore errors
    }
  }

  /**
   * Check if an entry is valid and return result with staleness flag
   */
  private checkEntry<T>(entry: CacheEntry<T>, config: CacheConfig): CacheResult<T> | null {
    const age = Date.now() - entry.timestamp;
    const maxAge = config.ttl + config.staleWhileRevalidate;

    // Entry is too old
    if (age > maxAge) {
      return null;
    }

    return {
      data: entry.data,
      isStale: age > config.ttl,
      timestamp: entry.timestamp,
    };
  }

  /**
   * Check if adding data would exceed quota
   */
  private wouldExceedQuota(newDataSize: number): boolean {
    if (typeof window === 'undefined') return false;

    try {
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const value = localStorage.getItem(key);
          if (value) totalSize += value.length;
        }
      }
      return (totalSize + newDataSize) > MAX_STORAGE_SIZE;
    } catch {
      return false;
    }
  }

  /**
   * Evict oldest entries to free up space
   */
  private evictOldestEntries(bytesToFree: number): void {
    if (typeof window === 'undefined') return;

    try {
      // Collect all entries with their timestamps
      const entries: Array<{ key: string; timestamp: number; size: number }> = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const parsed = JSON.parse(value) as CacheEntry<unknown>;
              entries.push({
                key,
                timestamp: parsed.timestamp,
                size: value.length,
              });
            } catch {
              // Invalid entry, mark for deletion
              entries.push({ key, timestamp: 0, size: value.length });
            }
          }
        }
      }

      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);

      // Delete oldest entries until we've freed enough space
      let freedBytes = 0;
      for (const entry of entries) {
        if (freedBytes >= bytesToFree) break;
        localStorage.removeItem(entry.key);
        this.memoryCache.delete(entry.key);
        freedBytes += entry.size;
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanExpiredEntries(): void {
    // Clean memory cache
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      const config = getConfigForKey(key.replace(STORAGE_PREFIX, '') as CacheKey);
      const maxAge = config.ttl + config.staleWhileRevalidate;
      if (now - entry.timestamp > maxAge) {
        this.memoryCache.delete(key);
      }
    }

    // Clean localStorage
    if (typeof window === 'undefined') return;

    try {
      const keysToDelete: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const entry = JSON.parse(value) as CacheEntry<unknown>;
              const cacheKey = key.replace(STORAGE_PREFIX, '') as CacheKey;
              const config = getConfigForKey(cacheKey);
              const maxAge = config.ttl + config.staleWhileRevalidate;

              if (now - entry.timestamp > maxAge) {
                keysToDelete.push(key);
              }
            } catch {
              // Invalid entry, delete it
              keysToDelete.push(key);
            }
          }
        }
      }

      keysToDelete.forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignore errors
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    if (typeof window === 'undefined') return;

    this.cleanupTimer = setInterval(() => {
      this.cleanExpiredEntries();
    }, CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup timer (for testing/cleanup)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.memoryCache.clear();
  }
}

// Singleton instance
let cacheInstance: StorageCache | null = null;

export function getCache(): StorageCache {
  if (!cacheInstance) {
    cacheInstance = new StorageCache();
  }
  return cacheInstance;
}
