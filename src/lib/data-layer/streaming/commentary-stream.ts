import type { CommentaryItem, CommentaryState } from '../types';

interface CommentaryStreamOptions {
  pollInterval?: number;
  maxItems?: number;
  onUpdate?: (state: CommentaryState) => void;
  onError?: (error: Error) => void;
}

const DEFAULT_POLL_INTERVAL = 10000; // 10 seconds
const DEFAULT_MAX_ITEMS = 500;

/**
 * CommentaryStream manages incremental commentary updates
 * Instead of fetching all commentary on each poll, it tracks the newest
 * timestamp and only processes new items
 */
export class CommentaryStream {
  private state: CommentaryState;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private options: Required<CommentaryStreamOptions>;
  private isPolling = false;
  private matchId: string;

  constructor(
    matchId: string,
    initialItems: CommentaryItem[] = [],
    options: CommentaryStreamOptions = {}
  ) {
    this.matchId = matchId;
    this.options = {
      pollInterval: options.pollInterval ?? DEFAULT_POLL_INTERVAL,
      maxItems: options.maxItems ?? DEFAULT_MAX_ITEMS,
      onUpdate: options.onUpdate ?? (() => {}),
      onError: options.onError ?? (() => {}),
    };

    // Initialize state from initial items
    this.state = this.createInitialState(initialItems);
  }

  /**
   * Create initial state from commentary items
   */
  private createInitialState(items: CommentaryItem[]): CommentaryState {
    const sortedItems = this.sortByTimestamp(items);
    const newestTimestamp = sortedItems.length > 0 ? (sortedItems[0].timestamp ?? null) : null;
    const oldestTimestamp = sortedItems.length > 0
      ? (sortedItems[sortedItems.length - 1].timestamp ?? null)
      : null;

    return {
      items: sortedItems,
      newestTimestamp,
      oldestTimestamp,
      inningsId: 1,
      hasMore: true,
    };
  }

  /**
   * Sort commentary by timestamp (newest first)
   */
  private sortByTimestamp(items: CommentaryItem[]): CommentaryItem[] {
    return [...items].sort((a, b) => {
      const timeA = a.timestamp ?? 0;
      const timeB = b.timestamp ?? 0;
      return timeB - timeA;
    });
  }

  /**
   * Merge new commentary items with existing ones
   * Deduplicates by timestamp and keeps newest first
   */
  mergeCommentary(newItems: CommentaryItem[]): CommentaryItem[] {
    const existingTimestamps = new Set(
      this.state.items.map(item => item.timestamp).filter(Boolean)
    );

    // Filter out items we already have
    const uniqueNewItems = newItems.filter(
      item => item.timestamp && !existingTimestamps.has(item.timestamp)
    );

    if (uniqueNewItems.length === 0) {
      return this.state.items;
    }

    // Merge and sort
    const merged = [...uniqueNewItems, ...this.state.items];
    const sorted = this.sortByTimestamp(merged);

    // Trim to max items
    return sorted.slice(0, this.options.maxItems);
  }

  /**
   * Update state with new commentary items
   */
  updateWithNewItems(newItems: CommentaryItem[]): void {
    const merged = this.mergeCommentary(newItems);

    // Check if anything actually changed
    if (merged.length === this.state.items.length && merged[0]?.timestamp === this.state.items[0]?.timestamp) {
      return;
    }

    const newestTimestamp = merged.length > 0 ? (merged[0].timestamp ?? null) : null;
    const oldestTimestamp = merged.length > 0 ? (merged[merged.length - 1].timestamp ?? null) : null;

    this.state = {
      ...this.state,
      items: merged,
      newestTimestamp,
      oldestTimestamp,
    };

    this.options.onUpdate(this.state);
  }

  /**
   * Add older commentary items (from pagination)
   */
  addOlderItems(olderItems: CommentaryItem[]): void {
    const existingTimestamps = new Set(
      this.state.items.map(item => item.timestamp).filter(Boolean)
    );

    // Filter out items we already have
    const uniqueOlderItems = olderItems.filter(
      item => item.timestamp && !existingTimestamps.has(item.timestamp)
    );

    if (uniqueOlderItems.length === 0) {
      this.state = { ...this.state, hasMore: false };
      this.options.onUpdate(this.state);
      return;
    }

    // Add to end and sort
    const merged = [...this.state.items, ...uniqueOlderItems];
    const sorted = this.sortByTimestamp(merged);

    // Trim to max items
    const trimmed = sorted.slice(0, this.options.maxItems);

    const oldestTimestamp = trimmed.length > 0
      ? (trimmed[trimmed.length - 1].timestamp ?? null)
      : null;

    this.state = {
      ...this.state,
      items: trimmed,
      oldestTimestamp,
      hasMore: uniqueOlderItems.length >= 10, // Assume more if we got a full page
    };

    this.options.onUpdate(this.state);
  }

  /**
   * Change innings - resets state
   */
  setInnings(inningsId: number, items: CommentaryItem[] = []): void {
    this.state = {
      ...this.createInitialState(items),
      inningsId,
    };
    this.options.onUpdate(this.state);
  }

  /**
   * Get current state
   */
  getState(): CommentaryState {
    return this.state;
  }

  /**
   * Get items newer than a given timestamp
   */
  getNewItemsSince(timestamp: number): CommentaryItem[] {
    return this.state.items.filter(item => (item.timestamp ?? 0) > timestamp);
  }

  /**
   * Get the oldest timestamp (for pagination)
   */
  getOldestTimestamp(): number | null {
    return this.state.oldestTimestamp;
  }

  /**
   * Get the newest timestamp (for incremental updates)
   */
  getNewestTimestamp(): number | null {
    return this.state.newestTimestamp;
  }

  /**
   * Check if there are more items to load
   */
  hasMore(): boolean {
    return this.state.hasMore;
  }

  /**
   * Get match ID
   */
  getMatchId(): string {
    return this.matchId;
  }

  /**
   * Destroy the stream
   */
  destroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isPolling = false;
  }
}

/**
 * Extract timestamp from commentary text if not provided
 * Looks for patterns like "13.4" or "Over 13.4"
 */
export function extractTimestampFromCommentary(item: CommentaryItem): number | null {
  if (item.timestamp) return item.timestamp;

  // Try to parse over number and ball number
  const overMatch = item.text.match(/^(\d+)\.(\d+)/);
  if (overMatch) {
    const over = parseInt(overMatch[1], 10);
    const ball = parseInt(overMatch[2], 10);
    // Create a synthetic timestamp based on over.ball
    return over * 10 + ball;
  }

  return null;
}
