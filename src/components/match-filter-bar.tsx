'use client';

import type { LiveMatch } from '@/app/actions';

export type MatchFilter = 'all' | 'international' | 'league' | 'domestic' | 'women';

const filters: { value: MatchFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'international', label: 'International' },
    { value: 'league', label: 'League' },
    { value: 'domestic', label: 'Domestic' },
    { value: 'women', label: 'Women' },
];

// Prefer the scraped `matchType` when present; fall back to keyword sniffing
// from the title + series name. Kept aligned across Live / Recent / Upcoming so
// filter counts stay consistent no matter which tab the user is on.
export function getMatchCategory(match: LiveMatch): MatchFilter {
    if (match.matchType) {
        const t = match.matchType.toLowerCase() as MatchFilter;
        if (t === 'international' || t === 'league' || t === 'domestic' || t === 'women') return t;
    }
    const title = (match.title || '').toLowerCase();
    const seriesName = (match.seriesName || '').toLowerCase();
    const combined = `${title} ${seriesName}`;
    if (combined.includes('women')) return 'women';
    if (combined.includes('ipl') || combined.includes('bbl') || combined.includes('psl') ||
        combined.includes('cpl') || combined.includes('league') || combined.includes('t20 league')) return 'league';
    if (combined.includes('test') || combined.includes('odi') || combined.includes('t20i') ||
        combined.includes('international') || combined.includes('world cup') || combined.includes('icc')) return 'international';
    return 'domestic';
}

export function countByCategory(matches: LiveMatch[]): Record<MatchFilter, number> {
    const counts: Record<MatchFilter, number> = { all: matches.length, international: 0, league: 0, domestic: 0, women: 0 };
    matches.forEach((m) => {
        const cat = getMatchCategory(m);
        if (cat in counts) counts[cat] += 1;
    });
    return counts;
}

export default function MatchFilterBar({
    activeFilter,
    setActiveFilter,
    counts,
}: {
    activeFilter: MatchFilter;
    setActiveFilter: (f: MatchFilter) => void;
    counts: Record<MatchFilter, number>;
}) {
    return (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {filters.map((filter) => {
                const n = counts[filter.value] ?? 0;
                if (filter.value !== 'all' && n === 0) return null;
                const active = activeFilter === filter.value;
                return (
                    <button
                        key={filter.value}
                        onClick={() => setActiveFilter(filter.value)}
                        aria-current={active ? 'page' : undefined}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <span>{filter.label}</span>
                        <span className={`text-[11px] tabular-nums ${active ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`}>
                            {n}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
