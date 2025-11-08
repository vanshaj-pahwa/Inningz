
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRecentMatches } from '@/app/actions';
import type { LiveMatch } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoaderCircle, History, ChevronRight, ChevronDown } from "lucide-react";

interface GroupedMatches {
  [seriesName: string]: LiveMatch[];
}

type MatchFilter = 'all' | 'international' | 'league' | 'domestic' | 'women';

export default function RecentMatches() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<MatchFilter>('all');

  const toggleSeries = (seriesName: string) => {
    setExpandedSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seriesName)) {
        newSet.delete(seriesName);
      } else {
        newSet.add(seriesName);
      }
      return newSet;
    });
  };

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
      const result = await getRecentMatches();
      if (result.success && result.matches) {
        setMatches(result.matches);
        // Open first series by default
        if (result.matches.length > 0) {
          const firstSeries = result.matches[0].seriesName || 'Other Matches';
          setExpandedSeries(new Set([firstSeries]));
        }
      } else {
        setError(result.error ?? "Failed to fetch recent matches.");
      }
      setLoading(false);
    };

    fetchMatches();
  }, []);

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[60vh] p-8">
        <LoaderCircle className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium text-primary">Finding recent matches...</p>
        <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle className="text-lg">Unable to fetch matches</AlertTitle>
          <AlertDescription className="mt-2">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="p-4 rounded-full bg-primary/10 mb-4">
          <History className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No recent matches found</h3>
        <p className="text-muted-foreground text-center max-w-sm">
          Check back later for completed matches
        </p>
      </div>
    );
  }

  // Filter and group matches by series
  const filteredMatches = filterMatches(matches);
  const groupedMatches: GroupedMatches = filteredMatches.reduce((acc, match) => {
    const seriesName = match.seriesName || 'Other Matches';
    if (!acc[seriesName]) {
      acc[seriesName] = [];
    }
    acc[seriesName].push(match);
    return acc;
  }, {} as GroupedMatches);

  const isComplete = (status: string) => {
    return status.toLowerCase().includes('won');
  };

  const getCategoryDisplay = (category: MatchFilter) => {
    const styles = {
      international: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      league: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      domestic: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      women: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
      all: ''
    };
    const labels = {
      international: 'International',
      league: 'League',
      domestic: 'Domestic',
      women: 'Women',
      all: ''
    };
    return { style: styles[category], label: labels[category] };
  };

  const filters: { value: MatchFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'international', label: 'International' },
    { value: 'league', label: 'League' },
    { value: 'domestic', label: 'Domestic' },
    { value: 'women', label: 'Women' },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* No matches for filter */}
      {Object.keys(groupedMatches).length === 0 && (
        <div className="w-full flex flex-col items-center justify-center min-h-[40vh] p-8">
          <div className="p-4 rounded-full bg-primary/10 mb-4">
            <History className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No matches found</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Try selecting a different filter
          </p>
        </div>
      )}

      {Object.entries(groupedMatches).map(([seriesName, seriesMatches]) => {
        const isExpanded = expandedSeries.has(seriesName);

        return (
          <div key={seriesName} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            {/* Series Header - Accordion Toggle */}
            <button
              onClick={() => toggleSeries(seriesName)}
              className="flex w-full items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white transition-opacity hover:opacity-90"
            >
              <h3 className="text-sm font-bold uppercase tracking-wide">{seriesName}</h3>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>

            {/* Matches in this series - Collapsible */}
            {isExpanded && (
              <div className="divide-y divide-border">
                {seriesMatches.map((match) => {
                  const matchIsComplete = isComplete(match.status);

                  return (
                    <Link
                      key={match.matchId}
                      href={`/match/${match.matchId}`}
                      className="block bg-card transition-colors hover:bg-accent/50"
                    >
                      <div className="p-4">
                        {/* Match info and venue */}
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="flex-1 text-xs text-muted-foreground">
                            <span>{match.title.split(',').slice(0, 2).join(',')}</span>
                            {match.venue && (
                              <span className="ml-1.5">• {match.venue}</span>
                            )}
                          </div>
                          {activeFilter === 'all' && (() => {
                            const category = getMatchCategory(match);
                            const display = getCategoryDisplay(category);
                            return (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${display.style}`}>
                                {display.label}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Teams and scores */}
                        <div className="space-y-2.5">
                          {match.teams.map((team, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {team.name}
                                </span>
                              </div>
                              {team.score && (
                                <span className="text-base font-semibold tabular-nums text-foreground">
                                  {team.score}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Status */}
                        {match.status && match.status.toLowerCase() !== 'status not available' && (
                          <div className="mt-3 pt-2 border-t border-border/50">
                            <span
                              className={`text-sm font-medium ${
                                matchIsComplete
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {match.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
