import type { RequestConfig } from '../types';
import { getRateLimitForKey } from '../cache/ttl-config';
import { createBackoffTracker, sleep } from './backoff';

const DEFAULT_REQUEST_CONFIG: RequestConfig = {
  minInterval: 1000,
  maxConcurrent: 5,
  priority: 'normal',
  retryCount: 3,
  retryDelay: 1000,
};

interface InFlightRequest {
  promise: Promise<unknown>;
  timestamp: number;
}

export class RequestManager {
  // Track in-flight requests for deduplication
  private inFlight: Map<string, InFlightRequest> = new Map();

  // Track last request time for rate limiting
  private lastRequestTime: Map<string, number> = new Map();

  // Track concurrent requests per key pattern
  private concurrentCount: Map<string, number> = new Map();

  // Backoff tracker for errors
  private backoffTracker = createBackoffTracker();

  // Pending requests queue
  private pendingRequests: Array<{
    key: string;
    resolve: () => void;
    priority: 'high' | 'normal' | 'low';
  }> = [];

  /**
   * Execute a request with deduplication, rate limiting, and backoff
   */
  async request<T>(
    key: string,
    fetcher: () => Promise<T>,
    config?: Partial<RequestConfig>
  ): Promise<T> {
    const fullConfig = {
      ...DEFAULT_REQUEST_CONFIG,
      ...getRateLimitForKey(key),
      ...config,
    };

    // Check for in-flight request (deduplication)
    const existing = this.inFlight.get(key);
    if (existing) {
      // If the in-flight request is recent enough, reuse it
      const age = Date.now() - existing.timestamp;
      if (age < fullConfig.minInterval) {
        return existing.promise as Promise<T>;
      }
    }

    // Wait for backoff if there were recent errors
    const backoffDelay = this.backoffTracker.getDelay(key);
    if (backoffDelay > 0) {
      await sleep(backoffDelay);
    }

    // Enforce rate limiting
    await this.enforceRateLimit(key, fullConfig.minInterval);

    // Create and track the request
    const promise = this.executeWithRetry(key, fetcher, fullConfig);
    this.inFlight.set(key, { promise, timestamp: Date.now() });

    try {
      const result = await promise;
      this.backoffTracker.reset(key);
      return result;
    } catch (error) {
      this.backoffTracker.recordError(key);
      throw error;
    } finally {
      // Clean up in-flight tracking after a delay
      setTimeout(() => {
        const current = this.inFlight.get(key);
        if (current && current.promise === promise) {
          this.inFlight.delete(key);
        }
      }, fullConfig.minInterval);
    }
  }

  /**
   * Enforce minimum interval between requests
   */
  private async enforceRateLimit(key: string, minInterval: number): Promise<void> {
    const lastTime = this.lastRequestTime.get(key) || 0;
    const elapsed = Date.now() - lastTime;

    if (elapsed < minInterval) {
      const waitTime = minInterval - elapsed;
      await sleep(waitTime);
    }

    this.lastRequestTime.set(key, Date.now());
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: RequestConfig
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.retryCount; attempt++) {
      try {
        return await fetcher();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw lastError;
        }

        if (attempt < config.retryCount) {
          // Calculate exponential backoff for retries
          const delay = config.retryDelay * Math.pow(2, attempt - 1);
          await sleep(Math.min(delay, 30000)); // Cap at 30 seconds
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Check if an error should not be retried
   */
  private isNonRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Don't retry 4xx errors (client errors)
      if (error.message.includes('404') || error.message.includes('403')) {
        return true;
      }
      // Don't retry abort errors
      if (error.name === 'AbortError') {
        return true;
      }
    }
    return false;
  }

  /**
   * Cancel all pending requests for a key
   */
  cancel(key: string): void {
    this.inFlight.delete(key);
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    this.inFlight.clear();
  }

  /**
   * Get the number of pending requests
   */
  getPendingCount(): number {
    return this.inFlight.size;
  }

  /**
   * Check if a request is in flight
   */
  isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  /**
   * Get the time until the next request is allowed
   */
  getTimeUntilNextRequest(key: string, minInterval?: number): number {
    const interval = minInterval || getRateLimitForKey(key).minInterval;
    const lastTime = this.lastRequestTime.get(key) || 0;
    const elapsed = Date.now() - lastTime;

    if (elapsed >= interval) return 0;
    return interval - elapsed;
  }

  /**
   * Reset all tracking state
   */
  reset(): void {
    this.inFlight.clear();
    this.lastRequestTime.clear();
    this.concurrentCount.clear();
    this.backoffTracker.clear();
    this.pendingRequests = [];
  }
}

// Singleton instance
let requestManagerInstance: RequestManager | null = null;

export function getRequestManager(): RequestManager {
  if (!requestManagerInstance) {
    requestManagerInstance = new RequestManager();
  }
  return requestManagerInstance;
}
