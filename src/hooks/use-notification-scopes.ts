'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface Scopes {
    matches: string[];
    series: string[];
    teams: string[];
}

const EMPTY: Scopes = { matches: [], series: [], teams: [] };

// Normalise team-name comparison the same way on both client + server.
function normalizeTeam(name: string): string {
    return name.trim();
}

// Client-side cache so the popover on a MatchCard opens with the current
// state immediately, without waiting for the fetch. Shared across mounts.
let scopesCache: Scopes | null = null;
let inflight: Promise<Scopes> | null = null;

async function fetchScopes(endpoint: string): Promise<Scopes> {
    if (scopesCache) return scopesCache;
    if (inflight) return inflight;
    inflight = fetch(`/api/push/scopes?endpoint=${encodeURIComponent(endpoint)}`)
        .then((r) => r.json())
        .then((d) => {
            const s: Scopes = d?.scopes ?? EMPTY;
            scopesCache = s;
            return s;
        })
        .catch(() => EMPTY)
        .finally(() => { inflight = null; });
    return inflight;
}

async function saveScopes(endpoint: string, scopes: Scopes): Promise<Scopes> {
    const res = await fetch('/api/push/scopes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, scopes }),
    });
    const data = await res.json();
    if (data?.scopes) scopesCache = data.scopes;
    return data?.scopes ?? scopes;
}

interface UsePushEndpointReturn { endpoint: string | null; permissionGranted: boolean; }
function usePushEndpoint(): UsePushEndpointReturn {
    const [endpoint, setEndpoint] = useState<string | null>(null);
    const [granted, setGranted] = useState(false);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (typeof window === 'undefined') return;
            if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
            const permission = Notification.permission;
            if (cancelled) return;
            setGranted(permission === 'granted');
            if (permission !== 'granted') return;
            try {
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.getSubscription();
                if (!cancelled) setEndpoint(sub?.endpoint ?? null);
            } catch { /* ignore */ }
        })();
        return () => { cancelled = true; };
    }, []);
    return { endpoint, permissionGranted: granted };
}

// Read + mutate the scoped push preferences for the current device.
// Callers get `isXOn` predicates and `toggleX` mutators. Toggles are
// optimistic and sync to server in the background.
export function useNotificationScopes() {
    const { endpoint, permissionGranted } = usePushEndpoint();
    const [scopes, setScopes] = useState<Scopes>(scopesCache ?? EMPTY);
    const [loading, setLoading] = useState(true);
    const savingRef = useRef<Promise<Scopes> | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!endpoint) { setLoading(false); return; }
        (async () => {
            const s = await fetchScopes(endpoint);
            if (!cancelled) { setScopes(s); setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [endpoint]);

    const persist = useCallback(async (next: Scopes) => {
        if (!endpoint) return;
        setScopes(next);
        scopesCache = next;
        // Coalesce rapid toggles: if a save is in flight we still overwrite
        // scopesCache above so the next save (chained via savingRef) picks up
        // the newest snapshot.
        const p = (savingRef.current ?? Promise.resolve(scopes))
            .then(() => saveScopes(endpoint, scopesCache ?? next));
        savingRef.current = p;
        try {
            const saved = await p;
            if (savingRef.current === p) setScopes(saved);
        } catch { /* ignore, state already optimistic */ }
    }, [endpoint, scopes]);

    const isMatchOn  = useCallback((id: string) => scopes.matches.includes(id), [scopes.matches]);
    const isSeriesOn = useCallback((id: string) => scopes.series.includes(id),  [scopes.series]);
    const isTeamOn   = useCallback((name: string) => scopes.teams.includes(normalizeTeam(name)), [scopes.teams]);

    const toggleMatch = useCallback((id: string) => {
        const on = scopes.matches.includes(id);
        return persist({
            ...scopes,
            matches: on ? scopes.matches.filter((x) => x !== id) : [...scopes.matches, id],
        });
    }, [scopes, persist]);

    const toggleSeries = useCallback((id: string) => {
        const on = scopes.series.includes(id);
        return persist({
            ...scopes,
            series: on ? scopes.series.filter((x) => x !== id) : [...scopes.series, id],
        });
    }, [scopes, persist]);

    const toggleTeam = useCallback((name: string) => {
        const key = normalizeTeam(name);
        const on = scopes.teams.includes(key);
        return persist({
            ...scopes,
            teams: on ? scopes.teams.filter((x) => x !== key) : [...scopes.teams, key],
        });
    }, [scopes, persist]);

    const status = useMemo(() => {
        if (!permissionGranted) return 'permission-needed' as const;
        if (!endpoint) return 'not-subscribed' as const;
        if (loading) return 'loading' as const;
        return 'ready' as const;
    }, [permissionGranted, endpoint, loading]);

    return { status, scopes, isMatchOn, isSeriesOn, isTeamOn, toggleMatch, toggleSeries, toggleTeam };
}
