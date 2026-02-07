'use client';

import { useCallback, useEffect, useState } from 'react';

export type RecentItemType = 'match' | 'series' | 'player';

export interface RecentItem {
  id: string;
  type: RecentItemType;
  title: string;
  subtitle?: string;
  timestamp: number;
}

const STORAGE_KEY = 'inningz-recent-history';
const MAX_ITEMS = 10;

function getStoredHistory(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: RecentItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function useRecentHistory() {
  const [history, setHistory] = useState<RecentItem[]>([]);

  useEffect(() => {
    setHistory(getStoredHistory());
  }, []);

  const addItem = useCallback((item: Omit<RecentItem, 'timestamp'>) => {
    setHistory((prev) => {
      // Remove existing item with same id and type
      const filtered = prev.filter(
        (h) => !(h.id === item.id && h.type === item.type)
      );

      // Add new item at the beginning
      const newHistory = [
        { ...item, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_ITEMS);

      saveHistory(newHistory);
      return newHistory;
    });
  }, []);

  const removeItem = useCallback((id: string, type: RecentItemType) => {
    setHistory((prev) => {
      const filtered = prev.filter(
        (h) => !(h.id === id && h.type === type)
      );
      saveHistory(filtered);
      return filtered;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  return {
    history,
    addItem,
    removeItem,
    clearHistory,
  };
}
