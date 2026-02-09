import type { CacheConfig, CacheKey } from '../types';

// TTL values in milliseconds
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

// Default cache configurations by data type
export const TTL_CONFIG: Record<string, CacheConfig> = {
  // Live data - short TTL
  'matches:live': {
    ttl: 15 * SECOND,
    staleWhileRevalidate: 30 * SECOND,
    version: 1,
  },
  'match:score': {
    ttl: 5 * SECOND,
    staleWhileRevalidate: 10 * SECOND,
    version: 1,
  },
  'match:scorecard:live': {
    ttl: 30 * SECOND,
    staleWhileRevalidate: 1 * MINUTE,
    version: 1,
  },
  'match:scorecard:complete': {
    ttl: 5 * MINUTE,
    staleWhileRevalidate: 30 * MINUTE,
    version: 1,
  },
  'match:squads': {
    ttl: 5 * MINUTE,
    staleWhileRevalidate: 30 * MINUTE,
    version: 1,
  },

  // Recent/Upcoming - medium TTL
  'matches:recent': {
    ttl: 2 * MINUTE,
    staleWhileRevalidate: 5 * MINUTE,
    version: 1,
  },
  'matches:upcoming': {
    ttl: 5 * MINUTE,
    staleWhileRevalidate: 15 * MINUTE,
    version: 1,
  },

  // Player profiles - long TTL
  'player': {
    ttl: 1 * HOUR,
    staleWhileRevalidate: 24 * HOUR,
    version: 1,
  },

  // Series data - medium-long TTL
  'series:matches': {
    ttl: 30 * MINUTE,
    staleWhileRevalidate: 2 * HOUR,
    version: 1,
  },
  'series:stats': {
    ttl: 30 * MINUTE,
    staleWhileRevalidate: 2 * HOUR,
    version: 1,
  },
  'series:schedule': {
    ttl: 30 * MINUTE,
    staleWhileRevalidate: 2 * HOUR,
    version: 1,
  },

  // Rankings - very long TTL
  'rankings': {
    ttl: 6 * HOUR,
    staleWhileRevalidate: 24 * HOUR,
    version: 1,
  },
};

// Get config for a cache key
export function getConfigForKey(key: CacheKey): CacheConfig {
  // Exact match
  if (key in TTL_CONFIG) {
    return TTL_CONFIG[key];
  }

  // Pattern matching for dynamic keys
  if (key.startsWith('match:') && key.endsWith(':score')) {
    return TTL_CONFIG['match:score'];
  }
  if (key.startsWith('match:') && key.endsWith(':scorecard')) {
    // Could check if match is live or complete for different TTL
    return TTL_CONFIG['match:scorecard:live'];
  }
  if (key.startsWith('match:') && key.endsWith(':squads')) {
    return TTL_CONFIG['match:squads'];
  }
  if (key.startsWith('player:')) {
    return TTL_CONFIG['player'];
  }
  if (key.startsWith('series:') && key.includes(':matches')) {
    return TTL_CONFIG['series:matches'];
  }
  if (key.startsWith('series:') && key.includes(':stats')) {
    return TTL_CONFIG['series:stats'];
  }
  if (key.startsWith('series:') && key.includes(':schedule')) {
    return TTL_CONFIG['series:schedule'];
  }
  if (key.startsWith('rankings:')) {
    return TTL_CONFIG['rankings'];
  }

  // Default config for unknown keys
  return {
    ttl: 1 * MINUTE,
    staleWhileRevalidate: 5 * MINUTE,
    version: 1,
  };
}

// Rate limit configurations
export const RATE_LIMITS: Record<string, { minInterval: number; maxConcurrent: number }> = {
  'match:score': { minInterval: 5 * SECOND, maxConcurrent: 1 },
  'matches:live': { minInterval: 10 * SECOND, maxConcurrent: 1 },
  'matches:recent': { minInterval: 10 * SECOND, maxConcurrent: 1 },
  'matches:upcoming': { minInterval: 10 * SECOND, maxConcurrent: 1 },
  'match:scorecard': { minInterval: 10 * SECOND, maxConcurrent: 1 },
  'match:commentary': { minInterval: 5 * SECOND, maxConcurrent: 1 },
  'player': { minInterval: 1 * SECOND, maxConcurrent: 3 },
  'series': { minInterval: 5 * SECOND, maxConcurrent: 2 },
  'default': { minInterval: 1 * SECOND, maxConcurrent: 5 },
};

export function getRateLimitForKey(key: string): { minInterval: number; maxConcurrent: number } {
  // Match key patterns to rate limits
  for (const pattern of Object.keys(RATE_LIMITS)) {
    if (pattern !== 'default' && key.includes(pattern.replace(':', ''))) {
      return RATE_LIMITS[pattern];
    }
  }
  return RATE_LIMITS['default'];
}
