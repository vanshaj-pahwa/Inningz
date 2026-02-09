'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SSEConnectionStatus, SSEMessage } from '../types';
import { getCache } from '../cache';
import { getScoreForMatchId } from '@/app/actions';

interface UseLiveScoreOptions {
  pollInterval?: number;
  useSSE?: boolean;
  enabled?: boolean;
  onUpdate?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

interface UseLiveScoreResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  connectionStatus: SSEConnectionStatus;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
}

const DEFAULT_POLL_INTERVAL = 10000; // 10 seconds
const SSE_RECONNECT_DELAY = 5000; // 5 seconds

export function useLiveScore<T = unknown>(
  matchId: string,
  options: UseLiveScoreOptions = {}
): UseLiveScoreResult<T> {
  const {
    pollInterval = DEFAULT_POLL_INTERVAL,
    useSSE = true,
    enabled = true,
    onUpdate,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<SSEConnectionStatus>('connecting');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cache = getCache();
  const cacheKey = `match:${matchId}:score` as const;

  // Fallback polling function
  const pollData = useCallback(async () => {
    if (!mountedRef.current || !enabled) return;

    try {
      const result = await getScoreForMatchId(matchId);
      if (result.success && result.data && mountedRef.current) {
        const scoreData = result.data as T;
        setData(scoreData);
        setError(null);
        setLastUpdated(Date.now());
        setLoading(false);

        // Cache the result
        cache.set(cacheKey, scoreData);
        onUpdate?.(scoreData);
      }
    } catch (err) {
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch score';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  }, [matchId, enabled, cache, cacheKey, onUpdate, onError]);

  // Start fallback polling
  const startFallbackPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    setConnectionStatus('fallback');
    pollData();
    pollTimerRef.current = setInterval(pollData, pollInterval);
  }, [pollData, pollInterval]);

  // Connect to SSE
  const connectSSE = useCallback(() => {
    if (!useSSE || typeof EventSource === 'undefined') {
      startFallbackPolling();
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');

    const eventSource = new EventSource(`/api/scores/${matchId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (mountedRef.current) {
        setConnectionStatus('connected');
        setError(null);

        // Stop fallback polling if running
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    };

    eventSource.onmessage = (event) => {
      if (!mountedRef.current) return;

      try {
        const message = JSON.parse(event.data) as SSEMessage<T>;

        switch (message.type) {
          case 'initial':
          case 'update':
            if (message.data) {
              setData(message.data);
              setError(null);
              setLastUpdated(message.timestamp);
              setLoading(false);

              // Cache the result
              cache.set(cacheKey, message.data);
              onUpdate?.(message.data);
            }
            break;

          case 'error':
            setError(message.error || 'Unknown error');
            onError?.(new Error(message.error || 'Unknown error'));
            break;

          case 'heartbeat':
            // Just a keep-alive, no action needed
            break;
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = () => {
      if (!mountedRef.current) return;

      eventSource.close();
      eventSourceRef.current = null;
      setConnectionStatus('disconnected');

      // Try to reconnect after a delay, or fall back to polling
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          // Try SSE again, or fall back to polling
          if (navigator.onLine) {
            connectSSE();
          } else {
            startFallbackPolling();
          }
        }
      }, SSE_RECONNECT_DELAY);
    };
  }, [matchId, useSSE, cache, cacheKey, onUpdate, onError, startFallbackPolling]);

  // Manual refresh
  const refresh = useCallback(async () => {
    setLoading(true);
    await pollData();
  }, [pollData]);

  // Initial setup
  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || !matchId) {
      setLoading(false);
      return;
    }

    // Try to load from cache first
    const cached = cache.get<T>(cacheKey);
    if (cached) {
      setData(cached.data);
      setLastUpdated(cached.timestamp);
      setLoading(false);
    }

    // Connect to SSE or start polling
    if (useSSE) {
      connectSSE();
    } else {
      startFallbackPolling();
    }

    return () => {
      mountedRef.current = false;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [matchId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle online/offline
  useEffect(() => {
    const handleOnline = () => {
      if (mountedRef.current && connectionStatus === 'fallback') {
        // Try SSE again
        connectSSE();
      }
    };

    const handleOffline = () => {
      if (mountedRef.current) {
        setConnectionStatus('disconnected');
        setError('You are offline');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionStatus, connectSSE]);

  // Pause when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Close SSE connection when tab is hidden
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      } else if (enabled) {
        // Reconnect when tab becomes visible
        if (useSSE) {
          connectSSE();
        } else {
          startFallbackPolling();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, useSSE, connectSSE, startFallbackPolling]);

  return {
    data,
    loading,
    error,
    connectionStatus,
    lastUpdated,
    refresh,
  };
}
