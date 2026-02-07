'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getLiveMatches } from '@/app/actions';

interface MatchInfo {
  matchId: string;
  title: string;
  teams: { name?: string; score?: string }[];
  status: string;
}

interface MatchesContextType {
  liveMatches: MatchInfo[];
  loading: boolean;
  getAdjacentMatches: (currentMatchId: string) => { prev: MatchInfo | null; next: MatchInfo | null };
  refreshMatches: () => Promise<void>;
}

const MatchesContext = createContext<MatchesContextType | null>(null);

export function MatchesProvider({ children }: { children: ReactNode }) {
  const [liveMatches, setLiveMatches] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    try {
      const result = await getLiveMatches();
      if (result.success && result.matches) {
        setLiveMatches(
          result.matches.map((m) => ({
            matchId: m.matchId,
            title: m.title,
            teams: m.teams,
            status: m.status,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch matches for navigation:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    // Refresh every 60 seconds
    const interval = setInterval(fetchMatches, 60000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const getAdjacentMatches = useCallback(
    (currentMatchId: string) => {
      const index = liveMatches.findIndex((m) => m.matchId === currentMatchId);
      if (index === -1) return { prev: null, next: null };

      return {
        prev: index > 0 ? liveMatches[index - 1] : null,
        next: index < liveMatches.length - 1 ? liveMatches[index + 1] : null,
      };
    },
    [liveMatches]
  );

  const refreshMatches = useCallback(async () => {
    setLoading(true);
    await fetchMatches();
  }, [fetchMatches]);

  return (
    <MatchesContext.Provider value={{ liveMatches, loading, getAdjacentMatches, refreshMatches }}>
      {children}
    </MatchesContext.Provider>
  );
}

export function useMatches() {
  const context = useContext(MatchesContext);
  if (!context) {
    throw new Error('useMatches must be used within a MatchesProvider');
  }
  return context;
}

// Hook to use in match pages for swipe navigation
export function useMatchNavigation(currentMatchId: string) {
  const { getAdjacentMatches } = useMatches();
  return getAdjacentMatches(currentMatchId);
}
