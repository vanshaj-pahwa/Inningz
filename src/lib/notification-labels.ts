'use client';

// Local cache of human-readable labels for the ids we save into a
// subscription's scopes. The server stores match/series ids only; this cache
// lets the "Following" strip show real names ("India tour of England, 2026")
// instead of ids ("10532"). Populated at the point a user toggles the scope
// from a card, since we already have the label rendered there.

const STORAGE_KEY = 'inningz-notification-labels';

interface LabelStore {
    matches: Record<string, string>;
    series: Record<string, string>;
}

function empty(): LabelStore {
    return { matches: {}, series: {} };
}

function read(): LabelStore {
    if (typeof window === 'undefined') return empty();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return empty();
        const parsed = JSON.parse(raw);
        return {
            matches: parsed?.matches ?? {},
            series: parsed?.series ?? {},
        };
    } catch {
        return empty();
    }
}

function write(store: LabelStore) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch { /* quota, private mode, etc */ }
}

export function rememberMatchLabel(id: string, label: string) {
    if (!id || !label) return;
    const s = read();
    if (s.matches[id] === label) return;
    s.matches[id] = label;
    write(s);
}

export function rememberSeriesLabel(id: string, label: string) {
    if (!id || !label) return;
    const s = read();
    if (s.series[id] === label) return;
    s.series[id] = label;
    write(s);
}

export function getMatchLabel(id: string): string | undefined {
    return read().matches[id];
}

export function getSeriesLabel(id: string): string | undefined {
    return read().series[id];
}
