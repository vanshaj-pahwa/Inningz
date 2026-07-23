'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getSeriesMatches, getSeriesStats } from '@/app/actions';
import type { LiveMatch, SeriesStatCategory } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Filter, ChevronDown, X, Calendar } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deriveMatchFormat, displayMatchFormat } from '@/lib/utils';
import SeriesStatsDisplay from '@/components/series-stats';
import PointsTableDisplay from '@/components/points-table';
import MatchCard from '@/components/match-card';
import { useRecentHistoryContext } from '@/contexts/recent-history-context';

type SeriesView = 'matches' | 'stats' | 'points';

export default function SeriesPage() {
  const router = useRouter();
  const params = useParams();
  const { addSeries } = useRecentHistoryContext();
  const seriesPath = params.seriesPath as string[] | undefined;
  const seriesId = seriesPath ? seriesPath.join('/') : undefined;

  const [view, setView] = useState<SeriesView>('matches');
  const viewInitialized = useRef(false);

  // Read ?view= param on mount
  useEffect(() => {
    if (viewInitialized.current) return;
    viewInitialized.current = true;
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'stats' || v === 'points' || v === 'matches') {
      setView(v);
    }
  }, []);
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPointsTable, setHasPointsTable] = useState<boolean | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [showPast, setShowPast] = useState(false);
  const [hasTrackedSeries, setHasTrackedSeries] = useState(false);
  const [topRunScorer, setTopRunScorer] = useState<{ name: string; value: string } | null>(null);
  const [topWicketTaker, setTopWicketTaker] = useState<{ name: string; value: string } | null>(null);
  const [topPerformersLoading, setTopPerformersLoading] = useState(true);
  const headerRef = useRef<HTMLElement>(null);

  const hasActiveFilter = dateFilter !== 'all' || teamFilter !== 'all' || formatFilter !== 'all' || statusFilter !== 'all';
  const resetFilters = () => {
    setDateFilter('all');
    setTeamFilter('all');
    setFormatFilter('all');
    setStatusFilter('all');
  };

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

    // Fetch series top performers
    const fetchTopPerformers = async () => {
      setTopPerformersLoading(true);
      const [runsResult, wktsResult] = await Promise.all([
        getSeriesStats(seriesId, 'mostRuns').catch(() => null),
        getSeriesStats(seriesId, 'mostWickets').catch(() => null),
      ]);
      if (runsResult?.success && runsResult.data?.entries?.[0]) {
        const top = runsResult.data.entries[0];
        setTopRunScorer({ name: top.playerName, value: top.values['RUNS'] || top.values['Runs'] || '' });
      }
      if (wktsResult?.success && wktsResult.data?.entries?.[0]) {
        const top = wktsResult.data.entries[0];
        setTopWicketTaker({ name: top.playerName, value: top.values['WKTS'] || top.values['Wkts'] || '' });
      }
      setTopPerformersLoading(false);
    };
    fetchTopPerformers();
  }, [seriesId]);

  // Track series in recent history — skip if we don't have a real series
  // name; a "Series" chip tells the user nothing.
  useEffect(() => {
    if (matches.length > 0 && seriesId && !hasTrackedSeries) {
      const seriesName = matches[0].seriesName?.trim();
      if (!seriesName) return;
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

  const isComplete = (status: string) => {
    const s = status.toLowerCase();
    return s.includes('won') || s.includes('no result') || s.includes('drawn') ||
      s.includes('tied') || s.includes('complete') || s.includes('abandoned');
  };

  const isLive = (status: string) => {
    if (isComplete(status)) return false;
    const s = status.toLowerCase();
    return s.includes('live') || s.includes('need') || s.includes('session') ||
      s.includes('innings') || s.includes('lead') || s.includes('delay') ||
      s.includes('stops play');
  };

  const seriesName = matches.length > 0 ? (matches[0].seriesName || 'Series Matches') : 'Series Matches';

  // Extract unique team names for filter
  const teamNames = Array.from(
    new Set(matches.flatMap(m => m.teams.map(t => t.name)).filter(Boolean))
  ).sort();

  // Formats actually present in this series (TEST, ODI, T20, ...), taken from the
  // real matchFormat field, falling back to a title-derived guess if absent.
  const matchFmt = (m: LiveMatch) => displayMatchFormat(m.matchFormat) || deriveMatchFormat(m.title, m.seriesName) || null;
  // Whether the series spans more than one format at all (decides if tabs show).
  const allFormats = Array.from(new Set(matches.map(matchFmt).filter(Boolean) as string[]));

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

  // Filter by team + date first, then derive which formats remain so the format
  // tabs stay in sync with the current date/team selection (dynamic tabs).
  const dateTeamFiltered = matches.filter(m => {
    const teamMatch = teamFilter === 'all' || m.teams.some(t => t.name === teamFilter);
    const dateMatch = dateFilter === 'all' || getMatchDateKey(m).dateKey === dateFilter;
    return teamMatch && dateMatch;
  });
  const availableFormats = Array.from(new Set(dateTeamFiltered.map(matchFmt).filter(Boolean) as string[]));
  const effectiveFormat = formatFilter !== 'all' && availableFormats.includes(formatFilter) ? formatFilter : 'all';
  const filteredMatches = dateTeamFiltered.filter(m => effectiveFormat === 'all' || matchFmt(m) === effectiveFormat);

  // Group matches by date, then partition into today / future / past so the
  // list reads top-to-bottom as "what matters now → what's next → history".
  type DateGroup = { date: string; timestamp: number; matches: LiveMatch[] };
  const { todayGroups, futureGroups, pastGroups } = (() => {
    const dateMap = new Map<string, { timestamp: number; matches: LiveMatch[] }>();
    filteredMatches.forEach(match => {
      const { dateKey, timestamp } = getMatchDateKey(match);
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, { timestamp, matches: [] });
      dateMap.get(dateKey)!.matches.push(match);
    });
    const now = new Date();
    const todayKey = now.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    }).toUpperCase().replace(',', '');
    const todayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEndMs = todayStartMs + 86_400_000;

    const all: DateGroup[] = [];
    dateMap.forEach((v, date) => all.push({ date, timestamp: v.timestamp, matches: v.matches }));

    const today = all.filter(g => g.date === todayKey);
    const future = all
      .filter(g => g.date !== todayKey && g.timestamp >= todayEndMs)
      .sort((a, b) => a.timestamp - b.timestamp);
    const past = all
      .filter(g => g.date !== todayKey && g.timestamp < todayStartMs)
      .sort((a, b) => b.timestamp - a.timestamp);
    return { todayGroups: today, futureGroups: future, pastGroups: past };
  })();

  const pastMatchCount = pastGroups.reduce((n, g) => n + g.matches.length, 0);
  // Only collapse past matches when there's something above them worth reading
  // first (today or future). When the series is over — no today, no future —
  // past IS the content, so show it expanded instead of hiding it in an accordion
  // that leaves the page looking empty.
  const hasContentAbove = todayGroups.length > 0 || futureGroups.length > 0;
  const collapsePast = hasContentAbove && pastMatchCount > 6;

  const tabs: { value: SeriesView; label: string; shortLabel: string; hidden?: boolean }[] = [
    { value: 'matches', label: 'Matches', shortLabel: 'Matches' },
    { value: 'points', label: 'Points Table', shortLabel: 'Table', hidden: hasPointsTable === false },
    { value: 'stats', label: 'Stats', shortLabel: 'Stats' },
  ];

  const visibleTabs = tabs.filter(t => !t.hidden);

  return (
    <div className="min-h-screen stadium-glow">
      {/* Header - Glass Nav */}
      <header ref={headerRef} className="sticky top-0 z-50 w-full glass-nav">
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
          <div className="flex gap-0.5 pb-2">
            {visibleTabs.map(tab => {
              const isActive = view === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setView(tab.value)}
                  className={`
                    px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all
                    ${isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  <span className="md:hidden">{tab.shortLabel}</span>
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Series Top Performers + Filters */}
          {view === 'matches' && (
            <div className="space-y-2 pb-2">
              {/* Top Performers */}
              {topPerformersLoading ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="min-w-0 px-3 py-1.5 sm:py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 flex-1">
                    <p className="text-[11px] sm:text-[11px] uppercase tracking-wider text-orange-400 font-semibold">Most Runs</p>
                    <div className="skeleton h-3 sm:h-3.5 w-32 rounded mt-1" />
                  </div>
                  <div className="min-w-0 px-3 py-1.5 sm:py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex-1">
                    <p className="text-[11px] sm:text-[11px] uppercase tracking-wider text-purple-400 font-semibold">Most Wickets</p>
                    <div className="skeleton h-3 sm:h-3.5 w-32 rounded mt-1" />
                  </div>
                </div>
              ) : (topRunScorer || topWicketTaker) && (
                <div className="flex flex-col sm:flex-row gap-2">
                  {topRunScorer && topRunScorer.value && (
                    <div className="min-w-0 px-3 py-1.5 sm:py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 flex-1">
                      <p className="text-[11px] sm:text-[11px] uppercase tracking-wider text-orange-400 font-semibold">Most Runs</p>
                      <p className="text-[11px] sm:text-xs font-medium truncate">{topRunScorer.name} <span className="text-muted-foreground">({topRunScorer.value})</span></p>
                    </div>
                  )}
                  {topWicketTaker && topWicketTaker.value && (
                    <div className="min-w-0 px-3 py-1.5 sm:py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex-1">
                      <p className="text-[11px] sm:text-[11px] uppercase tracking-wider text-purple-400 font-semibold">Most Wickets</p>
                      <p className="text-[11px] sm:text-xs font-medium truncate">{topWicketTaker.name} <span className="text-muted-foreground">({topWicketTaker.value})</span></p>
                    </div>
                  )}
                </div>
              )}
              {/* Filters */}
              {!loading && !error && matches.length > 0 && (
                <div className="flex justify-end gap-2">
                  {hasActiveFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="rounded-xl gap-1.5 h-7 sm:h-8 text-[11px] sm:text-xs px-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Reset
                    </Button>
                  )}
                  {availableDates.length > 1 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-7 sm:h-8 text-[11px] sm:text-xs px-2.5">
                          <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          {dateFilter === 'all' ? 'All Dates' : dateFilter}
                          <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl max-h-72 overflow-y-auto">
                        <DropdownMenuRadioGroup value={dateFilter} onValueChange={setDateFilter}>
                          <DropdownMenuRadioItem value="all" className="rounded-lg">All Dates</DropdownMenuRadioItem>
                          {availableDates.map((date) => (
                            <DropdownMenuRadioItem key={date} value={date} className="rounded-lg">{date}</DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {teamNames.length > 2 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-7 sm:h-8 text-[11px] sm:text-xs px-2.5">
                          <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          {teamFilter === 'all' ? 'All Teams' : teamFilter}
                          <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl max-h-72 overflow-y-auto">
                        <DropdownMenuRadioGroup value={teamFilter} onValueChange={setTeamFilter}>
                          <DropdownMenuRadioItem value="all" className="rounded-lg">All Teams</DropdownMenuRadioItem>
                          {teamNames.map((name) => (
                            <DropdownMenuRadioItem key={name} value={name} className="rounded-lg">{name}</DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {view === 'matches' && (
          <>
            {/* Format tabs stay on top since format applies to every section
                (including today). Status filter moves below today's group. */}
            {!loading && !error && matches.length > 0 && allFormats.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-6">
                {['all', ...availableFormats].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormatFilter(f)}
                    className={`px-3.5 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
                      effectiveFormat === f ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f === 'all' ? 'All' : f}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="space-y-8">
                {[...Array(3)].map((_, g) => (
                  <div key={g}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                      <div className="skeleton h-3 w-28 rounded" />
                      <div className="h-px flex-1 bg-gradient-to-l from-primary/30 to-transparent" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(g === 1 ? 2 : 1)].map((_, i) => (
                        <div key={i} className="surface-card p-5 space-y-4">
                          <div className="skeleton h-3 w-3/5 rounded" />
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="skeleton h-4 w-2/5 rounded" />
                              <div className="skeleton h-5 w-20 rounded" />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="skeleton h-4 w-2/5 rounded" />
                              <div className="skeleton h-5 w-20 rounded" />
                            </div>
                          </div>
                          <div className="pt-3 border-t border-border/50">
                            <div className="skeleton h-3 w-3/4 rounded" />
                          </div>
                          <div className="skeleton h-3 w-2/5 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
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

            {!loading && !error && matches.length === 0 && (
              <div className="w-full flex flex-col items-center justify-center min-h-[60vh] p-8">
                <h3 className="text-xl font-display mb-2">No matches found</h3>
                <p className="text-muted-foreground text-center max-w-sm text-sm">
                  No matches available for this series yet
                </p>
              </div>
            )}

            {!loading && !error && matches.length > 0 && (() => {
              const showUpcoming = statusFilter === 'all' || statusFilter === 'upcoming';
              const showPastSection = statusFilter === 'all' || statusFilter === 'past';
              const collapseThisRun = showPastSection && collapsePast && statusFilter !== 'past';
              const hasFilterableBelow = futureGroups.length > 0 || pastGroups.length > 0;
              const visibleBelowCount =
                (showUpcoming ? futureGroups.reduce((n, g) => n + g.matches.length, 0) : 0) +
                (showPastSection ? pastMatchCount : 0);
              const nothingToShow = todayGroups.length === 0 && visibleBelowCount === 0;
              if (nothingToShow) {
                return (
                  <div className="w-full flex flex-col items-center justify-center min-h-[40vh] p-8">
                    <h3 className="text-xl font-display mb-2">No matches for this filter</h3>
                    <p className="text-muted-foreground text-center max-w-sm text-sm">
                      Try switching the status filter or clearing the date/team selection.
                    </p>
                  </div>
                );
              }
              return (
                <div className="space-y-8">
                  {/* Today — always shown so it stays a fixed context anchor. */}
                  {todayGroups.map((group) => (
                    <div key={group.date} className="rounded-2xl bg-primary/[0.03] ring-1 ring-primary/15 p-4 md:p-5">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="h-px flex-1 bg-gradient-to-r from-primary/60 to-transparent" />
                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-primary px-1">
                          Today · {group.date}
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-l from-primary/60 to-transparent" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.matches.map((match, index) => (
                          <div
                            key={match.matchId}
                            className="stagger-in"
                            style={{ '--stagger-index': index } as React.CSSProperties}
                          >
                            <MatchCard match={match} header="series" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Status filter chips — sit between today and the rest, and
                      only appear when there's future or past content to filter. */}
                  {hasFilterableBelow && (
                    <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                      {(['all', 'upcoming', 'past'] as const).map((s) => {
                        const label = s === 'all' ? 'All' : s === 'upcoming' ? 'Upcoming' : 'Past';
                        const active = statusFilter === s;
                        return (
                          <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`shrink-0 px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
                              active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span>{label}</span>
                            <span className="hidden md:inline"> matches</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Future — chronological. Skipped when filter=past. */}
                  {showUpcoming && futureGroups.map((group, groupIndex) => (
                    <DateGroupBlock key={group.date} group={group} baseStagger={(groupIndex + todayGroups.length) * 6} />
                  ))}

                  {/* Past — collapsed when many finished matches AND status filter isn't past. */}
                  {showPastSection && pastGroups.length > 0 && (
                    <div>
                      {collapseThisRun ? (
                        <button
                          type="button"
                          onClick={() => setShowPast((v) => !v)}
                          className="w-full flex items-center gap-3 py-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <div className="h-px flex-1 bg-border" />
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                            <ChevronDown className={`h-3 w-3 transition-transform ${showPast ? '' : '-rotate-90'}`} />
                            {showPast ? 'Hide' : 'Show'} {pastMatchCount} past match{pastMatchCount === 1 ? '' : 'es'}
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </button>
                      ) : null}
                      {(!collapseThisRun || showPast) && (
                        <div className="space-y-8 mt-4">
                          {pastGroups.map((group, groupIndex) => (
                            <DateGroupBlock key={group.date} group={group} baseStagger={groupIndex * 6} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
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

function DateGroupBlock({
  group,
  baseStagger = 0,
}: {
  group: { date: string; matches: LiveMatch[] };
  baseStagger?: number;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
          {group.date}
        </h3>
        <div className="h-px flex-1 bg-gradient-to-l from-primary/30 to-transparent" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {group.matches.map((match, index) => (
          <div
            key={match.matchId}
            className="stagger-in"
            style={{ '--stagger-index': baseStagger + index } as React.CSSProperties}
          >
            <MatchCard match={match} header="series" />
          </div>
        ))}
      </div>
    </div>
  );
}
