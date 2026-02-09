import type { BackoffConfig } from '../types';

const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  baseDelay: 1000,       // 1 second
  maxDelay: 60000,       // 60 seconds
  multiplier: 2,         // Double each time
  jitter: 0.1,           // 10% random jitter
};

/**
 * Calculate backoff delay based on error count
 */
export function calculateBackoff(
  errorCount: number,
  config?: Partial<BackoffConfig>
): number {
  const { baseDelay, maxDelay, multiplier, jitter } = {
    ...DEFAULT_BACKOFF_CONFIG,
    ...config,
  };

  // Calculate exponential delay
  const exponentialDelay = baseDelay * Math.pow(multiplier, errorCount - 1);

  // Apply max delay cap
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter to prevent thundering herd
  const jitterAmount = cappedDelay * jitter * (Math.random() * 2 - 1);
  const finalDelay = Math.max(0, cappedDelay + jitterAmount);

  return Math.round(finalDelay);
}

/**
 * Sleep for a given duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  config?: Partial<BackoffConfig>
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = calculateBackoff(attempt, config);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Create a function that tracks error counts and applies backoff
 */
export function createBackoffTracker(config?: Partial<BackoffConfig>) {
  const errorCounts = new Map<string, number>();
  const lastErrorTime = new Map<string, number>();

  return {
    /**
     * Get the current backoff delay for a key
     * Returns 0 if no backoff needed
     */
    getDelay(key: string): number {
      const count = errorCounts.get(key) || 0;
      if (count === 0) return 0;

      const lastTime = lastErrorTime.get(key) || 0;
      const delay = calculateBackoff(count, config);
      const elapsed = Date.now() - lastTime;

      // If enough time has passed, no delay needed
      if (elapsed >= delay) {
        return 0;
      }

      return delay - elapsed;
    },

    /**
     * Record an error for a key
     */
    recordError(key: string): void {
      const count = (errorCounts.get(key) || 0) + 1;
      errorCounts.set(key, count);
      lastErrorTime.set(key, Date.now());
    },

    /**
     * Reset error count for a key (on success)
     */
    reset(key: string): void {
      errorCounts.delete(key);
      lastErrorTime.delete(key);
    },

    /**
     * Get error count for a key
     */
    getErrorCount(key: string): number {
      return errorCounts.get(key) || 0;
    },

    /**
     * Clear all error counts
     */
    clear(): void {
      errorCounts.clear();
      lastErrorTime.clear();
    },
  };
}
