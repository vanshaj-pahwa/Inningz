'use client';

import { createContext, useContext, ReactNode, useCallback, useEffect, useState } from 'react';
import type { RecentItem, RecentItemType } from '@/hooks/use-recent-history';

const STORAGE_KEY = 'inningz-recent-history';
const MAX_ITEMS = 10;

interface RecentHistoryContextType {
  history: RecentItem[];
  addItem: (item: Omit<RecentItem, 'timestamp'>) => void;
  addMatch: (id: string, title: string, subtitle?: string) => void;
  addSeries: (id: string, title: string, subtitle?: string) => void;
  addPlayer: (id: string, name: string, subtitle?: string) => void;
  removeItem: (id: string, type: RecentItemType) => void;
  clearHistory: () => void;
}

const RecentHistoryContext = createContext<RecentHistoryContextType | null>(null);

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

export function RecentHistoryProvider({ children }: { children: ReactNode }) {
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

  const addMatch = useCallback((id: string, title: string, subtitle?: string) => {
    addItem({ id, type: 'match', title, subtitle });
  }, [addItem]);

  const addSeries = useCallback((id: string, title: string, subtitle?: string) => {
    addItem({ id, type: 'series', title, subtitle });
  }, [addItem]);

  const addPlayer = useCallback((id: string, name: string, subtitle?: string) => {
    addItem({ id, type: 'player', title: name, subtitle });
  }, [addItem]);

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

  return (
    <RecentHistoryContext.Provider
      value={{
        history,
        addItem,
        addMatch,
        addSeries,
        addPlayer,
        removeItem,
        clearHistory,
      }}
    >
      {children}
    </RecentHistoryContext.Provider>
  );
}

export function useRecentHistoryContext() {
  const context = useContext(RecentHistoryContext);
  if (!context) {
    throw new Error('useRecentHistoryContext must be used within RecentHistoryProvider');
  }
  return context;
}
