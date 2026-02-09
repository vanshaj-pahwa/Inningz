'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CommentaryItem } from '../types';
import { CommentaryStream } from '../streaming';
import { loadMoreCommentary } from '@/app/actions';

interface UseCommentaryOptions {
  initialCommentary?: CommentaryItem[];
  inningsId?: number;
  enabled?: boolean;
}

interface UseCommentaryResult {
  commentary: CommentaryItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  loadingMore: boolean;
  inningsId: number;
  setInningsId: (id: number) => void;
  updateCommentary: (newItems: CommentaryItem[]) => void;
  oldestTimestamp: number | null;
}

export function useCommentary(
  matchId: string,
  options: UseCommentaryOptions = {}
): UseCommentaryResult {
  const {
    initialCommentary = [],
    inningsId: initialInningsId = 1,
    enabled = true,
  } = options;

  const [commentary, setCommentary] = useState<CommentaryItem[]>(initialCommentary);
  const [loading, setLoading] = useState(initialCommentary.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [inningsId, setInningsIdState] = useState(initialInningsId);
  const [oldestTimestamp, setOldestTimestamp] = useState<number | null>(null);

  const streamRef = useRef<CommentaryStream | null>(null);
  const mountedRef = useRef(true);

  // Initialize commentary stream
  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) return;

    streamRef.current = new CommentaryStream(matchId, initialCommentary, {
      onUpdate: (state) => {
        if (mountedRef.current) {
          setCommentary(state.items as CommentaryItem[]);
          setHasMore(state.hasMore);
          setOldestTimestamp(state.oldestTimestamp);
          setLoading(false);
        }
      },
    });

    // Set initial state
    const state = streamRef.current.getState();
    setCommentary(state.items as CommentaryItem[]);
    setHasMore(state.hasMore);
    setOldestTimestamp(state.oldestTimestamp);
    setLoading(false);

    return () => {
      mountedRef.current = false;
      streamRef.current?.destroy();
      streamRef.current = null;
    };
  }, [matchId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update commentary when initial commentary changes (from parent live score)
  const updateCommentary = useCallback((newItems: CommentaryItem[]) => {
    if (!mountedRef.current || !streamRef.current) return;
    streamRef.current.updateWithNewItems(newItems);
  }, []);

  // Change innings
  const setInningsId = useCallback((newInningsId: number) => {
    if (!mountedRef.current) return;

    setInningsIdState(newInningsId);
    setCommentary([]);
    setHasMore(true);
    setOldestTimestamp(null);
    setLoading(true);
    setError(null);

    // Reset the stream for new innings
    if (streamRef.current) {
      streamRef.current.setInnings(newInningsId);
    }
  }, []);

  // Load more (older) commentary
  const loadMore = useCallback(async () => {
    if (!mountedRef.current || !enabled || !hasMore || loadingMore) return;

    setLoadingMore(true);
    setError(null);

    try {
      // Get the oldest timestamp to fetch commentary before
      const timestamp = oldestTimestamp ? oldestTimestamp - 1 : 9999999999999;

      const result = await loadMoreCommentary(matchId, timestamp, inningsId);

      if (result.success && result.commentary && mountedRef.current) {
        // Convert Commentary to CommentaryItem
        const olderCommentary: CommentaryItem[] = result.commentary.map((item, index) => ({
          type: item.type ?? 'live',
          text: item.text ?? '',
          event: item.event,
          runs: item.runs,
          overNumber: item.overNumber,
          overSummary: item.overSummary,
          // Use result timestamp + index as synthetic timestamp for ordering
          timestamp: result.timestamp ? result.timestamp - index : undefined,
        }));

        if (olderCommentary.length === 0) {
          setHasMore(false);
        } else {
          // Add older items to the stream
          streamRef.current?.addOlderItems(olderCommentary);
        }
      } else if (!result.success && mountedRef.current) {
        setError(result.error || 'Failed to load more commentary');
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load more commentary');
      }
    } finally {
      if (mountedRef.current) {
        setLoadingMore(false);
      }
    }
  }, [matchId, inningsId, enabled, hasMore, loadingMore, oldestTimestamp]);

  return {
    commentary,
    loading,
    error,
    hasMore,
    loadMore,
    loadingMore,
    inningsId,
    setInningsId,
    updateCommentary,
    oldestTimestamp,
  };
}
