
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUpcomingMatches } from '@/app/actions';
import type { LiveMatch } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar } from "lucide-react";

interface GroupedMatches {
  [seriesName: string]: LiveMatch[];
}

type MatchFilter = 'all' | 'international' | 'league' | 'domestic' | 'women';

const filters: { value: MatchFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'international', label: 'International' },
  { value: 'league', label: 'League' },
  { value: 'domestic', label: 'Domestic' },
  { value: 'women', label: 'Women' },
];

const categoryColors: Record<MatchFilter, string> = {
  international: 'bg-blue-500',
  league: 'bg-purple-500',
  domestic: 'bg-orange-500',
  women: 'bg-pink-500',
  all: '',
};

const categoryTextColors: Record<MatchFilter, string> = {
  international: 'text-blue-400',
  league: 'text-purple-400',
  domestic: 'text-orange-400',
  women: 'text-pink-400',
  all: '',
};

export default function UpcomingMatches() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<MatchFilter>('all');

  const getMatchCategory = (match: LiveMatch): MatchFilter => {
    const title = match.title.toLowerCase();
    const seriesName = (match.seriesName || '').toLowerCase();
    const combined = `${title} ${seriesName}`;
    if (combined.includes('women')) return 'women';
    if (combined.includes('ipl') || combined.includes('bbl') || combined.includes('psl') ||
      combined.includes('cpl') || combined.includes('league') || combined.includes('t20 league')) return 'league';
    if (combined.includes('test') || combined.includes('odi') || combined.includes('t20i') ||
      combined.includes('international')) return 'international';
    return 'domestic';
  };

  const filterMatches = (matches: LiveMatch[]): LiveMatch[] => {
    if (activeFilter === 'all') return matches;
    return matches.filter(match => getMatchCategory(match) === activeFilter);
  };

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      setError(null);
      const result = await getUpcomingMatches();
      if (result.success && result.matches) {
        setMatches(result.matches);
      } else {
        setError(result.error ?? "Failed to fetch upcoming matches.");
      }
      setLoading(false);
    };
    fetchMatches();
  }, []);

  const filteredMatches = filterMatches(matches);
  const groupedMatches: GroupedMatches = filteredMatches.reduce((acc, match) => {
    const seriesName = match.seriesName || 'Other Matches';
    if (!acc[seriesName]) acc[seriesName] = [];
    acc[seriesName].push(match);
    return acc;
  }, {} as GroupedMatches);

  if (loading) {
    return (
      <div className="space-y-6">
        <FilterBar activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-xl rounded-2xl">
          <AlertTitle className="text-lg">Unable to fetch matches</AlertTitle>
          <AlertDescription className="mt-2">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="p-5 rounded-full bg-amber-500/10 mb-5">
          <Calendar className="w-8 h-8 text-amber-400" />
        </div>
        <h3 className="text-xl font-display mb-2">No upcoming matches found</h3>
        <p className="text-muted-foreground text-center max-w-sm text-sm">
          Check back later for scheduled matches
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <FilterBar activeFilter={activeFilter} setActiveFilter={setActiveFilter} />

      {Object.keys(groupedMatches).length === 0 && (
        <div className="w-full flex flex-col items-center justify-center min-h-[40vh] p-8">
          <div className="p-5 rounded-full bg-amber-500/10 mb-5">
            <Calendar className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-xl font-display mb-2">No matches found</h3>
          <p className="text-muted-foreground text-center max-w-sm text-sm">
            Try selecting a different filter
          </p>
        </div>
      )}

      {Object.entries(groupedMatches).map(([seriesName, seriesMatches]) => (
        <section key={seriesName}>
          {/* Series Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-amber-500/30 to-transparent" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
              {seriesName}
            </h3>
            <div className="h-px flex-1 bg-gradient-to-l from-amber-500/30 to-transparent" />
          </div>

          {/* Match Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seriesMatches.map((match, index) => {
              const category = getMatchCategory(match);

              return (
                <Link
                  key={match.matchId}
                  href={`/match/${match.matchId}`}
                  className="stagger-in"
                  style={{ '--stagger-index': index } as React.CSSProperties}
                >
                  <div className="glass-card card-hover p-5 h-full">
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-4">
                      {activeFilter === 'all' && (
                        <span className="flex items-center gap-1.5 text-xs font-medium">
                          <span className={`w-1.5 h-1.5 rounded-full ${categoryColors[category]}`} />
                          <span className={categoryTextColors[category]}>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {match.title.split(',').slice(0, 1).join('')}
                      </span>
                    </div>

                    {/* Teams */}
                    <div className="space-y-3">
                      {match.teams.map((team, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-foreground">
                            {team.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Venue */}
                    {match.venue && match.venue !== 'N/A' && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span className="truncate">{match.venue}</span>
                      </div>
                    )}

                    {/* Status */}
                    {match.status && match.status.toLowerCase() !== 'status not available' && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs font-medium text-amber-400">
                          {match.status}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function FilterBar({ activeFilter, setActiveFilter }: { activeFilter: MatchFilter; setActiveFilter: (f: MatchFilter) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => setActiveFilter(filter.value)}
          className={`
            px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
            ${activeFilter === filter.value
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
              : 'bg-zinc-100 dark:bg-zinc-900 text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-transparent'
            }
          `}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
