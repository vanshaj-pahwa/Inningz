'use client';

import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { getLiveMatches } from '@/app/actions';
import type { LiveMatch } from '@/app/actions';

// --- Types ---

interface AlertPreferences {
  enabled: boolean;
  mutedMatchIds: string[];
}

const DEFAULT_PREFS: AlertPreferences = { enabled: false, mutedMatchIds: [] };
const STORAGE_KEY = 'inningz-match-alerts';
const POLL_INTERVAL_ACTIVE = 15_000;  // 15s when tab visible
const POLL_INTERVAL_BG = 45_000;      // 45s when tab hidden
const NOTIF_COOLDOWN = 30_000;        // 30s per match+type

// --- Helpers ---

function loadPrefs(): AlertPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(p: AlertPreferences) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

function parseWickets(score?: string): number {
  if (!score) return 0;
  const m = score.match(/(\d+)\/(\d+)/);
  return m ? parseInt(m[2], 10) : 0;
}

// --- Context ---

interface MatchAlertsContextType {
  enabled: boolean;
  toggleAlerts: () => Promise<void>;
  isMatchMuted: (matchId: string) => boolean;
  toggleMuteMatch: (matchId: string) => void;
}

const MatchAlertsContext = createContext<MatchAlertsContextType | null>(null);

// --- Provider ---

interface MatchSnapshot {
  teams: { name: string; wickets: number }[];
  status: string;
}

export function MatchAlertsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AlertPreferences>(DEFAULT_PREFS);
  const snapshots = useRef<Map<string, MatchSnapshot>>(new Map());
  const cooldowns = useRef<Map<string, number>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load from localStorage on mount
  useEffect(() => { setPrefs(loadPrefs()); }, []);

  const update = useCallback((fn: (prev: AlertPreferences) => AlertPreferences) => {
    setPrefs(prev => {
      const next = fn(prev);
      savePrefs(next);
      return next;
    });
  }, []);

  const toggleAlerts = useCallback(async () => {
    if (prefs.enabled) {
      update(p => ({ ...p, enabled: false }));
      return;
    }
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
    }
    if ('Notification' in window && Notification.permission !== 'granted') return;
    update(p => ({ ...p, enabled: true }));
  }, [prefs.enabled, update]);

  const isMatchMuted = useCallback(
    (matchId: string) => prefs.mutedMatchIds.includes(matchId),
    [prefs.mutedMatchIds]
  );

  const toggleMuteMatch = useCallback((matchId: string) => {
    update(p => ({
      ...p,
      mutedMatchIds: p.mutedMatchIds.includes(matchId)
        ? p.mutedMatchIds.filter(id => id !== matchId)
        : [...p.mutedMatchIds, matchId],
    }));
  }, [update]);

  // --- Notification helper ---
  const notify = useCallback((title: string, body: string, matchId: string, type: string) => {
    const key = `${matchId}:${type}`;
    const now = Date.now();
    if ((cooldowns.current.get(key) ?? 0) > now - NOTIF_COOLDOWN) return;
    cooldowns.current.set(key, now);

    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(title, {
        body,
        icon: '/icon-192.png',
        tag: key,
        silent: false,
      });
      n.onclick = () => {
        window.focus();
        window.location.href = `/match/${matchId}`;
      };
    }
  }, []);

  // --- Polling loop ---
  const poll = useCallback(async () => {
    try {
      const result = await getLiveMatches();
      if (!result.success || !result.matches) return;

      const currentPrefs = loadPrefs(); // read fresh in case state is stale
      if (!currentPrefs.enabled) return;

      for (const match of result.matches) {
        if (currentPrefs.mutedMatchIds.includes(match.matchId)) continue;

        const prev = snapshots.current.get(match.matchId);
        const curr: MatchSnapshot = {
          teams: match.teams.map(t => ({ name: t.name, wickets: parseWickets(t.score) })),
          status: match.status,
        };

        if (prev) {
          // Detect wickets
          for (let i = 0; i < Math.min(prev.teams.length, curr.teams.length); i++) {
            const prevW = prev.teams[i].wickets;
            const currW = curr.teams[i].wickets;
            if (currW > prevW) {
              const teamScore = match.teams[i].score ?? '';
              const diff = currW - prevW;
              notify(
                `Wicket! ${match.teams[i].name}`,
                `${match.teams[i].name} ${teamScore}${diff > 1 ? ` (${diff} wickets fell)` : ''}`,
                match.matchId,
                `wicket-${i}-${currW}`
              );
            }
          }

          // Detect milestones from status text
          const statusLower = match.status.toLowerCase();
          const prevStatusLower = prev.status.toLowerCase();
          if (statusLower.includes('won') && !prevStatusLower.includes('won')) {
            notify(
              `Result: ${match.title}`,
              match.status,
              match.matchId,
              'result'
            );
          }
        }

        snapshots.current.set(match.matchId, curr);
      }

      // Clean up snapshots for matches no longer live
      const liveIds = new Set(result.matches.map((m: LiveMatch) => m.matchId));
      for (const key of snapshots.current.keys()) {
        if (!liveIds.has(key)) snapshots.current.delete(key);
      }
    } catch { /* silent */ }
  }, [notify]);

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (!prefs.enabled) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }

    // Initial poll
    poll();

    const startInterval = (ms: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(poll, ms);
    };

    startInterval(POLL_INTERVAL_ACTIVE);

    const onVisibility = () => {
      startInterval(document.hidden ? POLL_INTERVAL_BG : POLL_INTERVAL_ACTIVE);
      if (!document.hidden) poll(); // immediate poll on focus
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [prefs.enabled, poll]);

  return (
    <MatchAlertsContext.Provider value={{ enabled: prefs.enabled, toggleAlerts, isMatchMuted, toggleMuteMatch }}>
      {children}
    </MatchAlertsContext.Provider>
  );
}

export function useMatchAlerts() {
  const ctx = useContext(MatchAlertsContext);
  if (!ctx) throw new Error('useMatchAlerts must be used within MatchAlertsProvider');
  return ctx;
}
