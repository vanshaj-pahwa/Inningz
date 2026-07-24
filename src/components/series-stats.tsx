'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSeriesStatsTypes, getSeriesStats, getPlayerProfile } from '@/app/actions';
import type { SeriesStatsType, SeriesStatCategory, PlayerProfile } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart3, LoaderCircle, Search, Zap, Target, ArrowUpRight } from 'lucide-react';
import PlayerProfileDisplay from './player-profile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { buildTeamHref } from '@/lib/utils';

interface SeriesStatsProps {
  seriesId: string;
  seriesName?: string;
}

export default function SeriesStatsDisplay({ seriesId, seriesName }: SeriesStatsProps) {
  const [statsTypes, setStatsTypes] = useState<SeriesStatsType | null>(null);
  const [selectedStat, setSelectedStat] = useState<string>('mostRuns');
  const [statData, setStatData] = useState<SeriesStatCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!selectedProfileId) return;
    setProfileLoading(true);
    getPlayerProfile(selectedProfileId, selectedPlayerName || undefined).then(result => {
      if (result.success && result.data) setSelectedProfile(result.data);
      setProfileLoading(false);
    });
  }, [selectedProfileId, selectedPlayerName]);

  useEffect(() => {
    const fetchTypes = async () => {
      setLoading(true);
      setError(null);
      const result = await getSeriesStatsTypes(seriesId);
      if (result.success && result.data) setStatsTypes(result.data);
      else setError(result.error ?? 'Failed to load stats types');
      setLoading(false);
    };
    fetchTypes();
  }, [seriesId]);

  useEffect(() => {
    if (!selectedStat) return;
    const fetchStats = async () => {
      setStatsLoading(true);
      const result = await getSeriesStats(seriesId, selectedStat);
      if (result.success && result.data) setStatData(result.data);
      else setStatData(null);
      setStatsLoading(false);
    };
    fetchStats();
  }, [seriesId, selectedStat]);

  // Reset the client-side search whenever the user switches leaderboard —
  // otherwise a query like "Bumrah" left over from Most Wickets keeps every
  // Most Runs row hidden until the field is manually cleared.
  useEffect(() => { setQuery(''); }, [selectedStat]);

  const statOptions = statsTypes?.statsTypes.filter(t => t.value) ?? [];
  const battingStats = statOptions.filter(s => s.category === 'Batting');
  const bowlingStats = statOptions.filter(s => s.category === 'Bowling');
  const selectedStatMeta = statOptions.find(s => s.value === selectedStat);
  const selectedStatCategory = selectedStatMeta?.category ?? 'Batting';
  const selectedStatLabel = selectedStatMeta?.header ?? 'Most Runs';

  const filteredEntries = useMemo(() => {
    if (!statData) return [];
    const q = query.trim().toLowerCase();
    if (!q) return statData.entries;
    return statData.entries.filter(e => e.playerName.toLowerCase().includes(q));
  }, [statData, query]);

  if (loading) return <StatsLoading />;

  if (error) {
    return (
      <div className="w-full flex items-center justify-center min-h-[40vh]">
        <Alert variant="destructive" className="max-w-xl rounded-2xl">
          <AlertTitle className="text-lg">Unable to load stats</AlertTitle>
          <AlertDescription className="mt-2">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-4 lg:gap-8">
      {/* Category rail — narrower on desktop, horizontal chip strip on mobile */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="lg:hidden -mx-4 px-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-x-3 whitespace-nowrap min-w-max border-b border-border/60">
            {battingStats.length > 0 && <StatGroupLabel label="Batting" icon="bat" inline />}
            {battingStats.map(s => (
              <StatOption
                key={s.value}
                label={s.header}
                active={selectedStat === s.value}
                onClick={() => setSelectedStat(s.value!)}
                inline
              />
            ))}
            {bowlingStats.length > 0 && <StatGroupLabel label="Bowling" icon="ball" inline />}
            {bowlingStats.map(s => (
              <StatOption
                key={s.value}
                label={s.header}
                active={selectedStat === s.value}
                onClick={() => setSelectedStat(s.value!)}
                inline
              />
            ))}
          </div>
        </div>
        <div className="hidden lg:block surface-card rounded-2xl overflow-hidden">
          {battingStats.length > 0 && (
            <>
              <StatGroupLabel label="Batting" icon="bat" />
              <ul>
                {battingStats.map(s => (
                  <li key={s.value}>
                    <StatOption
                      label={s.header}
                      active={selectedStat === s.value}
                      onClick={() => setSelectedStat(s.value!)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
          {bowlingStats.length > 0 && (
            <>
              <StatGroupLabel label="Bowling" icon="ball" />
              <ul>
                {bowlingStats.map(s => (
                  <li key={s.value}>
                    <StatOption
                      label={s.header}
                      active={selectedStat === s.value}
                      onClick={() => setSelectedStat(s.value!)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>

      {/* Right column: header context, podium, table */}
      <div className="min-w-0 space-y-5 md:space-y-6">
        <StatsHeader
          title={selectedStatLabel}
          category={selectedStatCategory}
          seriesName={seriesName}
          entryCount={statData?.entries.length ?? 0}
          query={query}
          onQueryChange={setQuery}
        />

        {statsLoading ? (
          <TableSkeleton />
        ) : statData && statData.entries.length > 0 ? (
          <LeaderboardTable
            entries={filteredEntries}
            headers={statData.headers}
            statsType={selectedStat}
            onSelectPlayer={(entry) => {
              setSelectedProfileId(entry.playerId);
              setSelectedPlayerName(entry.playerName);
              setSelectedProfile(null);
            }}
            queryActive={query.trim().length > 0}
          />
        ) : (
          <EmptyState label={selectedStatLabel} />
        )}
      </div>

      <Dialog open={!!selectedProfileId} onOpenChange={(open) => {
        if (!open) {
          setSelectedProfileId(null);
          setSelectedPlayerName(null);
          setSelectedProfile(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Player Profile</DialogTitle>
          </DialogHeader>
          {profileLoading && (
            <div className="flex justify-center items-center p-12">
              <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Loading player profile...</p>
            </div>
          )}
          {selectedProfile && <PlayerProfileDisplay profile={selectedProfile} />}
          {!profileLoading && !selectedProfile && selectedProfileId && (
            <div className="p-8 text-center text-muted-foreground">
              Failed to load player profile
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────

function StatsHeader({
  title, category, seriesName, entryCount, query, onQueryChange,
}: {
  title: string;
  category: string;
  seriesName?: string;
  entryCount: number;
  query: string;
  onQueryChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <span>{category}</span>
          {seriesName && (
            <>
              <span aria-hidden className="text-muted-foreground/40">·</span>
              <span className="truncate">{seriesName}</span>
            </>
          )}
        </div>
        <h2 className="mt-1 font-display text-2xl md:text-3xl tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      <div className="relative w-full md:w-72">
        <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={`Search ${entryCount} players`}
          className="w-full h-9 pl-9 pr-3 rounded-xl bg-muted/40 border border-border/60 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
        />
      </div>
    </div>
  );
}

// ─── Podium (top 3 highlight) ───────────────────────────────────────

// ─── Leaderboard table ───────────────────────────────────────────────

function LeaderboardTable({
  entries, headers, statsType, onSelectPlayer, queryActive,
}: {
  entries: Array<{ playerId: string; playerName: string; values: Record<string, string> }>;
  headers: string[];
  statsType: string;
  onSelectPlayer: (e: { playerId: string; playerName: string; values: Record<string, string> }) => void;
  queryActive: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div className="surface-card rounded-2xl p-8 text-center">
        <p className="font-display text-lg">No players match your search</p>
        <p className="mt-1 text-sm text-muted-foreground">Try a shorter or different name.</p>
      </div>
    );
  }
  const secondaryHeaders = headers.slice(1);
  return (
    <div className="surface-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20">
              <th className="text-center py-2.5 px-3 w-10 sticky left-0 bg-muted/20 z-[1]">#</th>
              <th className="text-left py-2.5 px-3 sticky left-10 bg-muted/20 z-[1] min-w-[160px]">
                {headers[0] || 'Player'}
              </th>
              {secondaryHeaders.map((header) => {
                const main = isMainStatColumn(statsType, header);
                const boundary = boundaryClass(header);
                return (
                  <th
                    key={header}
                    className={`text-right py-2.5 px-3 whitespace-nowrap ${boundary ?? (main ? 'text-primary' : '')}`}
                  >
                    {displayHeader(header)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {entries.map((entry, index) => {
              // Rank is either the search-result index (when a query is active
              // top-3 highlighting is meaningless) or the leaderboard rank.
              const rank = index + 1;
              const isTop3 = !queryActive && rank <= 3;
              // Row highlight mirrors the points-table convention: subtle
              // primary-tinted background on the top of the table so the eye
              // sees them as "the winners" without any bespoke card treatment.
              return (
                <tr
                  key={entry.playerId + index}
                  className={`group transition-colors ${
                    isTop3 ? 'bg-primary/[0.04] hover:bg-primary/[0.07]' : 'hover:bg-muted/25'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center sticky left-0 bg-inherit z-[1]">
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        isTop3 ? 'text-amber-400 font-bold' : 'text-muted-foreground'
                      }`}
                    >
                      {rank}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 sticky left-10 bg-inherit z-[1]">
                    <button
                      type="button"
                      onClick={() => onSelectPlayer(entry)}
                      className="inline-flex items-center gap-1 text-left text-foreground hover:text-primary transition-colors"
                    >
                      <span className="font-semibold text-[13px] md:text-sm">{entry.playerName}</span>
                      <ArrowUpRight aria-hidden className="w-3 h-3 opacity-0 group-hover:opacity-70 transition-opacity" />
                    </button>
                  </td>
                  {secondaryHeaders.map((header) => {
                    const main = isMainStatColumn(statsType, header);
                    const boundary = boundaryClass(header);
                    const raw = entry.values[header] ?? '';
                    if (isTeamHeader(header)) {
                      return (
                        <td key={header} className="py-2.5 px-3 text-right whitespace-nowrap">
                          <TeamLink name={raw} />
                        </td>
                      );
                    }
                    // Coloring priority:
                    // 1. boundary (4s / 6s) — app-wide convention wins
                    // 2. main value on a top-3 row — amber `score-glow`
                    // 3. main value otherwise — display face, plain fg
                    // 4. other secondary columns — muted
                    let cls: string;
                    if (boundary) {
                      cls = `${boundary} font-semibold text-[13px] md:text-sm`;
                    } else if (main && isTop3) {
                      cls = 'font-display text-base md:text-lg text-amber-400 score-glow';
                    } else if (main) {
                      cls = 'font-display text-base md:text-lg text-foreground';
                    } else {
                      cls = 'text-[13px] text-muted-foreground';
                    }
                    return (
                      <td
                        key={header}
                        className="py-2.5 px-3 text-right whitespace-nowrap tabular-nums"
                      >
                        <span className={cls}>{raw || '–'}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Opponent-team cell: renders as an internal link when the team name
// resolves to a `/team/{id}/{slug}` route, otherwise plain text. Uses the
// static name→id map baked into `buildTeamHref` so no extra scraping needed.
function TeamLink({ name }: { name: string }) {
  const trimmed = (name || '').trim();
  if (!trimmed) return <span className="text-muted-foreground/60">–</span>;
  const href = buildTeamHref(undefined, trimmed);
  const inner = <span className="text-[13px] font-medium">{trimmed}</span>;
  if (!href) return <span className="text-muted-foreground">{trimmed}</span>;
  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className="text-foreground hover:text-primary transition-colors underline decoration-transparent hover:decoration-primary/60 underline-offset-4"
    >
      {inner}
    </Link>
  );
}

// ─── Empty + Loading ────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="surface-card rounded-2xl p-8 md:p-10 text-center flex flex-col items-center">
      <div className="p-4 rounded-full bg-primary/10 mb-4">
        <BarChart3 className="w-7 h-7 text-primary" />
      </div>
      <p className="font-display text-xl">No data for {label}</p>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        The upstream hasn&apos;t published this leaderboard for the series yet.
      </p>
    </div>
  );
}

function StatsLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-4 lg:gap-8">
      <div className="hidden lg:block skeleton h-96 rounded-2xl" />
      <div className="space-y-5">
        <div className="flex justify-between">
          <div className="skeleton h-9 w-56 rounded" />
          <div className="skeleton h-9 w-72 rounded" />
        </div>
        <TableSkeleton />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="surface-card rounded-2xl overflow-hidden">
      <div className="skeleton h-11 w-full" />
      <div className="divide-y divide-border/40">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

// ─── Category rail primitives ────────────────────────────────────────

function StatOption({
  label, active, onClick, inline = false,
}: { label: string; active: boolean; onClick: () => void; inline?: boolean }) {
  if (inline) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'true' : undefined}
        className={`relative shrink-0 px-1 py-2.5 text-[13px] font-medium transition-colors ${
          active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {label}
        {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" aria-hidden />}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`w-full flex items-center justify-between text-left px-3.5 py-2 text-[13px] font-medium transition-colors ${
        active
          ? 'text-primary bg-primary/10 border-l-2 border-primary'
          : 'text-muted-foreground hover:text-foreground border-l-2 border-transparent hover:bg-muted/30'
      }`}
    >
      <span>{label}</span>
    </button>
  );
}

function StatGroupLabel({
  label, icon, inline = false,
}: { label: string; icon: 'bat' | 'ball'; inline?: boolean }) {
  const Icon = icon === 'bat' ? Zap : Target;
  if (inline) {
    return (
      <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 pl-1 pr-1 first:pl-0">
        <Icon aria-hidden className="w-3 h-3" />
        {label}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-3.5 py-2 bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
      <Icon aria-hidden className="w-3 h-3" />
      {label}
    </div>
  );
}

// ─── Header/label helpers ────────────────────────────────────────────

// Compact scorecard-style header (used inside dense table cells).
function displayHeader(header: string): string {
  const map: Record<string, string> = {
    'MATCHES': 'M',
    'INNS': 'I',
    'INNINGS': 'I',
    'RUNS': 'R',
    'WKTS': 'W',
    'WICKETS': 'W',
    'OVERS': 'O',
    'BALLS': 'B',
    '4-FERS': '4W',
    '5-FERS': '5W',
    'VS': 'Vs',
    'ECON': 'Econ',
    'AVG': 'Avg',
  };
  return map[header.toUpperCase()] || header;
}

// Boundary-column headers get the same colour convention as the scorecard
// (blue for fours, violet for sixes) so the eye reads the two the same way
// across the app.
function boundaryClass(header: string): string | null {
  const h = header.toUpperCase();
  if (h === '4S' || h === 'FOURS' || h === '4') return 'text-blue-500 dark:text-blue-400';
  if (h === '6S' || h === 'SIXES' || h === '6') return 'text-violet-500 dark:text-violet-400';
  return null;
}

// Which column carries the leaderboard's headline number for a given stat.
function isMainStatColumn(statsType: string, header: string): boolean {
  const h = header.toUpperCase();
  switch (statsType) {
    case 'mostRuns': return h === 'RUNS' || h === 'R';
    case 'highestScore': return h === 'RUNS' || h === 'R';
    case 'highestAvg': return h === 'AVG';
    case 'highestSr': return h === 'SR';
    case 'mostHundreds': return h === '100S' || h === 'HUNDREDS';
    case 'mostFifties': return h === '50S' || h === 'FIFTIES';
    case 'mostFours': return h === '4S' || h === 'FOURS';
    case 'mostSixes': return h === '6S' || h === 'SIXES';
    case 'mostNineties': return h === '90S' || h === 'NINETIES';
    case 'mostWickets': return h === 'WKTS' || h === 'W' || h === 'WICKETS';
    case 'lowestAvg': return h === 'AVG';
    case 'bestBowlingInnings': return h === 'BBI' || h === 'WKTS';
    case 'mostFiveWickets': return h === '5-FERS';
    case 'lowestEcon': return h === 'ECON';
    case 'lowestSr': return h === 'SR';
    default: return false;
  }
}

// Team-name columns (opponent for a per-innings stat) render as a team link.
function isTeamHeader(header: string): boolean {
  const h = header.toUpperCase();
  return h === 'VS' || h === 'OPP' || h === 'OPPOSITION';
}
