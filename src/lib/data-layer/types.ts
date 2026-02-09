// Data layer type definitions

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: number;
}

export interface CacheConfig {
  ttl: number;
  staleWhileRevalidate: number;
  version: number;
}

export interface CacheResult<T> {
  data: T;
  isStale: boolean;
  timestamp: number;
}

// Cache key types for type safety
export type CacheKey =
  | 'matches:live'
  | 'matches:recent'
  | 'matches:upcoming'
  | `match:${string}:score`
  | `match:${string}:scorecard`
  | `match:${string}:squads`
  | `match:${string}:commentary`
  | `player:${string}`
  | `series:${string}:matches`
  | `series:${string}:stats`
  | `series:${string}:schedule`
  | `rankings:${string}:${string}`;

// Request manager types
export interface RequestConfig {
  minInterval: number;
  maxConcurrent: number;
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  retryDelay: number;
}

export interface BackoffConfig {
  baseDelay: number;
  maxDelay: number;
  multiplier: number;
  jitter: number;
}

// Commentary streaming types
export interface CommentaryItem {
  timestamp?: number;
  type: string;
  text: string;
  event?: string;
  runs?: number;
  overNumber?: number;
  overSummary?: string;
}

export interface CommentaryState {
  items: CommentaryItem[];
  newestTimestamp: number | null;
  oldestTimestamp: number | null;
  inningsId: number;
  hasMore: boolean;
}

// SSE types
export type SSEConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'fallback';

export interface SSEMessage<T> {
  type: 'initial' | 'update' | 'error' | 'heartbeat';
  data?: T;
  error?: string;
  timestamp: number;
}
