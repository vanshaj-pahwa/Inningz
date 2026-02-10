'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLiveMatches } from '@/app/actions';
import type { LiveMatch } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Calendar, Filter } from "lucide-react";

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

export default function LiveMatches() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<MatchFilter>('all');

  const getMatchCategory = (match: LiveMatch): MatchFilter => {
    // Use scraped matchType if available
    if (match.matchType) {
      return match.matchType.toLowerCase() as MatchFilter;
    }
    // Fallback to hardcoded logic if matchType not scraped
    const title = match.title.toLowerCase();
    const seriesName = (match.seriesName || '').toLowerCase();
    const combined = `${title} ${seriesName}`;
    if (combined.includes('women')) return 'women';
    if (combined.includes('ipl') || combined.includes('bbl') || combined.includes('psl') ||
      combined.includes('cpl') || combined.includes('league') || combined.includes('t20 league')) return 'league';
    if (combined.includes('test') || combined.includes('odi') || combined.includes('t20i') ||
      combined.includes('international') || combined.includes('world cup') || combined.includes('icc')) return 'international';
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
      const result = await getLiveMatches();
      if (result.success && result.matches) {
        setMatches(result.matches);
      } else {
        setError(result.error ?? "Failed to fetch live matches.");
      }
      setLoading(false);
    };
    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredMatches = filterMatches(matches);
  const groupedMatches: GroupedMatches = filteredMatches.reduce((acc, match) => {
    const seriesName = match.seriesName || 'Other Matches';
    if (!acc[seriesName]) acc[seriesName] = [];
    acc[seriesName].push(match);
    return acc;
  }, {} as GroupedMatches);

  const isLive = (status: string) => {
    const s = status.toLowerCase();
    return s.includes('live') || s.includes('need') || s.includes('session') ||
      s.includes('innings') || s.includes('lead') || s.includes('rain') ||
      s.includes('weather') || s.includes('delay') || s.includes('stops play');
  };

  const isComplete = (status: string) => status.toLowerCase().includes('won');

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
        <div className="p-5 rounded-full bg-primary/10 mb-5">
          <Calendar className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-display mb-2">No live matches at the moment</h3>
        <p className="text-muted-foreground text-center max-w-sm text-sm">
          Check back later for live cricket action or explore recent matches
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <FilterBar activeFilter={activeFilter} setActiveFilter={setActiveFilter} />

      {Object.keys(groupedMatches).length === 0 && (
        <div className="w-full flex flex-col items-center justify-center min-h-[40vh] p-8">
          <div className="p-5 rounded-full bg-primary/10 mb-5">
            <Calendar className="w-8 h-8 text-primary" />
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
            <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
              {seriesName}
            </h3>
            <div className="h-px flex-1 bg-gradient-to-l from-primary/30 to-transparent" />
          </div>

          {/* Match Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seriesMatches.map((match, index) => {
              const matchIsLive = isLive(match.status);
              const matchIsComplete = isComplete(match.status);
              const category = getMatchCategory(match);

              return (
                <Link
                  key={match.matchId}
                  href={`/match/${match.matchId}`}
                  className="stagger-in"
                  style={{ '--stagger-index': index } as React.CSSProperties}
                >
                  <div className={`
                    glass-card card-hover p-5 h-full
                    ${matchIsLive ? 'ring-1 ring-red-500/20' : ''}
                  `}>
                    {/* Top row: Category + Live badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {activeFilter === 'all' && (
                          <span className="flex items-center gap-1.5 text-xs font-medium">
                            <span className={`w-1.5 h-1.5 rounded-full ${categoryColors[category]}`} />
                            <span className={categoryTextColors[category]}>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                          </span>
                        )}
                      </div>
                      {matchIsLive && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          LIVE
                        </span>
                      )}
                    </div>

                    {/* Teams and Scores */}
                    <div className="space-y-3">
                      {match.teams.map((team, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold truncate text-foreground">
                            {team.name}
                          </span>
                          {team.score && (
                            <span className="font-display text-lg tabular-nums flex-shrink-0 text-foreground">
                              {team.score}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Status */}
                    {match.status && match.status.toLowerCase() !== 'status not available' && (
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <p className={`text-xs font-medium leading-relaxed ${matchIsLive
                          ? 'text-red-400'
                          : matchIsComplete
                            ? 'text-amber-400'
                            : 'text-muted-foreground'
                          }`}>
                          {match.status}
                        </p>
                      </div>
                    )}

                    {/* Venue */}
                    {match.venue && (
                      <p className="text-xs text-muted-foreground mt-2 truncate">
                        {match.venue}
                      </p>
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
  const activeLabel = filters.find(f => f.value === activeFilter)?.label ?? 'All';
  return (
    <div className="flex items-center">
      {/* Desktop: inline pills */}
      <div className="hidden md:flex gap-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`
              shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${activeFilter === filter.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-neutral-100 dark:bg-neutral-800 text-muted-foreground hover:text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }
            `}
          >
            {filter.label}
          </button>
        ))}
      </div>
      {/* Mobile: dropdown on the right */}
      <div className="md:hidden ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl gap-2">
              <Filter className="h-3.5 w-3.5" />
              {activeLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuRadioGroup value={activeFilter} onValueChange={(v) => setActiveFilter(v as MatchFilter)}>
              {filters.map((filter) => (
                <DropdownMenuRadioItem key={filter.value} value={filter.value} className="rounded-lg">
                  {filter.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
