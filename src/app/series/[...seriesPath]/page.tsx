'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getSeriesMatches } from '@/app/actions';
import type { LiveMatch } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Calendar, BarChart3, TableProperties, Filter, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SeriesStatsDisplay from '@/components/series-stats';
import PointsTableDisplay from '@/components/points-table';
import { useRecentHistoryContext } from '@/contexts/recent-history-context';

type SeriesView = 'matches' | 'stats' | 'points';

export default function SeriesPage() {
  const router = useRouter();
  const params = useParams();
  const { addSeries } = useRecentHistoryContext();
  const seriesPath = params.seriesPath as string[] | undefined;
  const seriesId = seriesPath ? seriesPath.join('/') : undefined;

  const [view, setView] = useState<SeriesView>('matches');
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPointsTable, setHasPointsTable] = useState<boolean | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [hasTrackedSeries, setHasTrackedSeries] = useState(false);

  useEffect(() => {
    if (!seriesId) return;
    const fetchMatches = async () => {
      setLoading(true);
      setError(null);
      const result = await getSeriesMatches(seriesId);
      if (result.success && result.matches) {
        setMatches(result.matches);
      } else {
        setError(result.error ?? 'Failed to fetch series matches.');
      }
      setLoading(false);
    };
    fetchMatches();
  }, [seriesId]);

  // Track series in recent history
  useEffect(() => {
    if (matches.length > 0 && seriesId && !hasTrackedSeries) {
      const seriesName = matches[0].seriesName || 'Series';
      addSeries(seriesId, seriesName);
      setHasTrackedSeries(true);
    }
  }, [matches, seriesId, addSeries, hasTrackedSeries]);

  const handlePointsAvailability = useCallback((available: boolean) => {
    setHasPointsTable(available);
  }, []);

  if (!seriesId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-display">Series not found.</p>
          <p className="text-muted-foreground text-sm mt-1">Could not load series details.</p>
          <Button variant="outline" className="mt-6 rounded-xl" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </main>
    );
  }

  const isLive = (status: string) => {
    const s = status.toLowerCase();
    return s.includes('live') || s.includes('need') || s.includes('session') ||
      s.includes('innings') || s.includes('lead') || s.includes('rain') ||
      s.includes('weather') || s.includes('delay') || s.includes('stops play');
  };

  const isComplete = (status: string) => status.toLowerCase().includes('won');

  const seriesName = matches.length > 0 ? (matches[0].seriesName || 'Series Matches') : 'Series Matches';

  // Extract unique team names for filter
  const teamNames = Array.from(
    new Set(matches.flatMap(m => m.teams.map(t => t.name)).filter(Boolean))
  ).sort();

  // Helper to get date key from match
  const getMatchDateKey = (match: LiveMatch): { dateKey: string; timestamp: number } => {
    if (match.startDate) {
      const timestampMs = match.startDate < 10000000000 ? match.startDate * 1000 : match.startDate;
      const date = new Date(timestampMs);
      if (!isNaN(date.getTime())) {
        return {
          dateKey: date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }).toUpperCase().replace(',', ''),
          timestamp: timestampMs
        };
      }
    }
    return { dateKey: 'DATE TBD', timestamp: Number.MAX_SAFE_INTEGER };
  };

  // Extract unique dates for filter (sorted chronologically)
  const availableDates = Array.from(
    new Map(
      matches.map(m => {
        const { dateKey, timestamp } = getMatchDateKey(m);
        return [dateKey, { dateKey, timestamp }];
      })
    ).values()
  ).sort((a, b) => a.timestamp - b.timestamp).map(d => d.dateKey);

  // Filter matches by team and date
  const filteredMatches = matches.filter(m => {
    const teamMatch = teamFilter === 'all' || m.teams.some(t => t.name === teamFilter);
    const dateMatch = dateFilter === 'all' || getMatchDateKey(m).dateKey === dateFilter;
    return teamMatch && dateMatch;
  });

  // Group matches by date
  const groupMatchesByDate = (matchList: LiveMatch[]) => {
    const groups: { date: string; timestamp: number; matches: LiveMatch[] }[] = [];
    const dateMap = new Map<string, { timestamp: number; matches: LiveMatch[] }>();

    matchList.forEach(match => {
      const { dateKey, timestamp } = getMatchDateKey(match);

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { timestamp, matches: [] });
      }
      dateMap.get(dateKey)!.matches.push(match);
    });

    // Convert map to array and sort by date
    dateMap.forEach((value, key) => {
      groups.push({ date: key, timestamp: value.timestamp, matches: value.matches });
    });

    return groups.sort((a, b) => a.timestamp - b.timestamp);
  };

  const groupedMatches = groupMatchesByDate(filteredMatches);

  const tabs: { value: SeriesView; label: string; shortLabel: string; icon: typeof Calendar; hidden?: boolean }[] = [
    { value: 'matches', label: 'Matches', shortLabel: 'Matches', icon: Calendar },
    { value: 'points', label: 'Points Table', shortLabel: 'Table', icon: TableProperties, hidden: hasPointsTable === false },
    { value: 'stats', label: 'Stats', shortLabel: 'Stats', icon: BarChart3 },
  ];

  const visibleTabs = tabs.filter(t => !t.hidden);

  return (
    <div className="min-h-screen stadium-glow">
      {/* Header - Glass Nav */}
      <header className="sticky top-0 z-50 w-full glass-nav">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-4 h-14">
            <Button variant="ghost" size="icon" className="rounded-xl shrink-0 hover:bg-black/5 dark:hover:bg-white/10" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg md:text-xl font-display tracking-tight truncate">
              {loading ? 'Loading...' : seriesName}
            </h1>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 pb-2">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = view === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setView(tab.value)}
                  className={`
                    flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all
                    ${isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span className="md:hidden">{tab.shortLabel}</span>
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {view === 'matches' && (
          <>
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton h-40 rounded-2xl" />
                ))}
              </div>
            )}

            {error && (
              <div className="w-full flex items-center justify-center min-h-[60vh]">
                <Alert variant="destructive" className="max-w-xl rounded-2xl">
                  <AlertTitle className="text-lg">Unable to fetch matches</AlertTitle>
                  <AlertDescription className="mt-2">{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {!loading && !error && matches.length > 0 && (
              <div className="flex justify-end gap-2 mb-4">
                {/* Date Filter */}
                {availableDates.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        {dateFilter === 'all' ? 'All Dates' : dateFilter}
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl max-h-72 overflow-y-auto">
                      <DropdownMenuRadioGroup value={dateFilter} onValueChange={setDateFilter}>
                        <DropdownMenuRadioItem value="all" className="rounded-lg">
                          All Dates
                        </DropdownMenuRadioItem>
                        {availableDates.map((date) => (
                          <DropdownMenuRadioItem key={date} value={date} className="rounded-lg">
                            {date}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Team Filter */}
                {teamNames.length > 2 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl gap-2">
                        <Filter className="h-3.5 w-3.5" />
                        {teamFilter === 'all' ? 'All Teams' : teamFilter}
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl max-h-72 overflow-y-auto">
                      <DropdownMenuRadioGroup value={teamFilter} onValueChange={setTeamFilter}>
                        <DropdownMenuRadioItem value="all" className="rounded-lg">
                          All Teams
                        </DropdownMenuRadioItem>
                        {teamNames.map((name) => (
                          <DropdownMenuRadioItem key={name} value={name} className="rounded-lg">
                            {name}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}

            {!loading && !error && matches.length === 0 && (
              <div className="w-full flex flex-col items-center justify-center min-h-[60vh] p-8">
                <div className="p-5 rounded-full bg-primary/10 mb-5">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-display mb-2">No matches found</h3>
                <p className="text-muted-foreground text-center max-w-sm text-sm">
                  No matches available for this series yet
                </p>
              </div>
            )}

            {!loading && !error && matches.length > 0 && (
              <div className="space-y-8">
                {groupedMatches.map((group, groupIndex) => (
                  <div key={group.date}>
                    {/* Date Header */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {group.date}
                      </h3>
                      <div className="h-px flex-1 bg-gradient-to-l from-primary/30 to-transparent" />
                    </div>

                    {/* Matches Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.matches.map((match, index) => {
                        const matchIsLive = isLive(match.status);
                        const matchIsComplete = isComplete(match.status);
                        const globalIndex = groupIndex * 10 + index;

                        return (
                          <Link
                            key={match.matchId}
                            href={`/match/${match.matchId}`}
                            className="stagger-in"
                            style={{ '--stagger-index': globalIndex } as React.CSSProperties}
                          >
                            <div className={`
                              glass-card card-hover p-5 h-full
                              ${matchIsLive ? 'ring-1 ring-red-500/20' : ''}
                            `}>
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-medium text-muted-foreground truncate">
                                  {match.title}
                                </span>
                                {matchIsLive && (
                                  <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 shrink-0">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    LIVE
                                  </span>
                                )}
                              </div>

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
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === 'stats' && (
          <SeriesStatsDisplay seriesId={seriesId} />
        )}

        {view === 'points' && (
          <PointsTableDisplay seriesId={seriesId} onAvailabilityChange={handlePointsAvailability} />
        )}
      </main>

      {/* Hidden prefetch for points table availability check */}
      {hasPointsTable === null && (
        <div className="hidden">
          <PointsTableDisplay seriesId={seriesId} onAvailabilityChange={handlePointsAvailability} />
        </div>
      )}
    </div>
  );
}
