'use client';

import { useEffect, useState } from 'react';
import { getSeriesStatsTypes, getSeriesStats } from '@/app/actions';
import type { SeriesStatsType, SeriesStatCategory } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart3, LoaderCircle } from "lucide-react";
import { getPlayerProfile } from '@/app/actions';
import type { PlayerProfile } from '@/app/actions';
import PlayerProfileDisplay from './player-profile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface SeriesStatsProps {
  seriesId: string;
}

export default function SeriesStatsDisplay({ seriesId }: SeriesStatsProps) {
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

  useEffect(() => {
    if (!selectedProfileId) return;
    setProfileLoading(true);
    getPlayerProfile(selectedProfileId, selectedPlayerName || undefined).then(result => {
      if (result.success && result.data) setSelectedProfile(result.data);
      setProfileLoading(false);
    });
  }, [selectedProfileId, selectedPlayerName]);

  // Load stat types on mount
  useEffect(() => {
    const fetchTypes = async () => {
      setLoading(true);
      setError(null);
      const result = await getSeriesStatsTypes(seriesId);
      if (result.success && result.data) {
        setStatsTypes(result.data);
      } else {
        setError(result.error ?? 'Failed to load stats types');
      }
      setLoading(false);
    };
    fetchTypes();
  }, [seriesId]);

  // Load stat data when selected stat changes
  useEffect(() => {
    if (!selectedStat) return;
    const fetchStats = async () => {
      setStatsLoading(true);
      const result = await getSeriesStats(seriesId, selectedStat);
      if (result.success && result.data) {
        setStatData(result.data);
      } else {
        setStatData(null);
      }
      setStatsLoading(false);
    };
    fetchStats();
  }, [seriesId, selectedStat]);

  // Get available stat options (exclude section dividers that have no value)
  const statOptions = statsTypes?.statsTypes.filter(t => t.value) ?? [];

  // Group stat options by category for the sub-tab strip
  const battingStats = statOptions.filter(s => s.category === 'Batting');
  const bowlingStats = statOptions.filter(s => s.category === 'Bowling');

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-48 rounded-xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

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
    <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-4 lg:gap-8">
      {/* Sidebar — mirrors the upstream page's grouped category rail so every
          leaderboard is one click away. On mobile it collapses into a
          horizontally scrollable strip so the table below stays the focus. */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        {/* Mobile: horizontal chip strip (Batting label · chips · Bowling · chips) */}
        <div className="lg:hidden -mx-4 px-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-x-3 whitespace-nowrap min-w-max border-b border-border/60">
            {battingStats.length > 0 && <StatGroupLabel label="Batting" inline />}
            {battingStats.map(s => (
              <StatOption
                key={s.value}
                label={s.header}
                active={selectedStat === s.value}
                onClick={() => setSelectedStat(s.value!)}
                inline
              />
            ))}
            {bowlingStats.length > 0 && <StatGroupLabel label="Bowling" inline />}
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
        {/* Desktop: vertical grouped rail */}
        <div className="hidden lg:block surface-card rounded-2xl overflow-hidden">
          {battingStats.length > 0 && (
            <>
              <StatGroupLabel label="Batting" />
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
              <StatGroupLabel label="Bowling" />
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

      {/* Stats table */}
      <div className="min-w-0">
      {statsLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      ) : statData && statData.entries.length > 0 ? (
        <div className="surface-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm" style={{ minWidth: 0 }}>
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-center py-2 px-1.5 sm:px-4 font-semibold text-muted-foreground text-[11px] sm:text-xs uppercase tracking-wider w-5 sm:w-8 border-r border-border/20">#</th>
                  <th className="text-center py-2 px-1 sm:px-4 font-semibold text-muted-foreground text-[11px] sm:text-xs uppercase tracking-wider border-r border-border/20">
                    {statData.headers[0] || 'Player'}
                  </th>
                  {statData.headers.slice(1).map((header, i) => (
                    <th key={header} className={`text-center py-2 px-2 sm:px-4 font-semibold text-muted-foreground text-[11px] sm:text-xs uppercase tracking-wider whitespace-nowrap ${i < statData.headers.length - 2 ? 'border-r border-border/20' : ''}`}>
                      {shortenHeader(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statData.entries.map((entry, index) => {
                  const isTop3 = index < 3;
                  return (
                    <tr
                      key={`${entry.playerId}-${index}`}
                      className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedProfileId(entry.playerId);
                        setSelectedPlayerName(entry.playerName);
                        setSelectedProfile(null);
                      }}
                    >
                      <td className="py-2 px-1.5 sm:px-4 text-center border-r border-border/20">
                        <span className={`font-mono text-[10px] sm:text-xs ${isTop3 ? 'text-amber-400 font-bold' : 'text-muted-foreground'}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-2 px-2 sm:px-4 max-w-[90px] sm:max-w-none text-center border-r border-border/20">
                        <span className="font-semibold text-foreground text-[11px] sm:text-sm truncate block">
                          {entry.playerName}
                        </span>
                      </td>
                      {statData.headers.slice(1).map((header, i) => {
                        const isMainValue = isMainStatColumn(selectedStat, header);
                        return (
                          <td key={header} className={`text-center py-2 px-2 sm:px-4 whitespace-nowrap ${i < statData.headers.length - 2 ? 'border-r border-border/20' : ''}`}>
                            <span className={`font-mono tabular-nums ${isMainValue ? 'font-display text-xs sm:text-base text-amber-400 score-glow' : 'text-muted-foreground text-[10px] sm:text-sm'}`}>
                              {entry.values[header] || '-'}
                            </span>
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
      ) : (
        <div className="w-full flex flex-col items-center justify-center min-h-[30vh] p-8">
          <div className="p-5 rounded-full bg-primary/10 mb-5">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-display mb-2">No stats available</h3>
          <p className="text-muted-foreground text-center max-w-sm text-sm">
            Statistics for this category are not available yet
          </p>
        </div>
      )}
      </div>

      {/* Player Profile Dialog */}
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
          {selectedProfile && (
            <PlayerProfileDisplay profile={selectedProfile} />
          )}
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
      className={`w-full flex items-center justify-between text-left px-3.5 py-2 text-[13px] font-medium border-l-2 transition-colors ${
        active
          ? 'text-primary border-primary bg-primary/5'
          : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/30'
      }`}
    >
      <span>{label}</span>
      {active && <span aria-hidden className="text-primary">›</span>}
    </button>
  );
}

function StatGroupLabel({ label, inline = false }: { label: string; inline?: boolean }) {
  if (inline) {
    return (
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 pl-1 pr-1 first:pl-0">
        {label}
      </span>
    );
  }
  return (
    <div className="px-3.5 py-2 bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
      {label}
    </div>
  );
}

function shortenHeader(header: string): string {
  const map: Record<string, string> = {
    'MATCHES': 'M',
    'INNS': 'I',
    'INNINGS': 'I',
    'RUNS': 'R',
    'WKTS': 'W',
    'WICKETS': 'W',
    'OVERS': 'O',
    'BALLS': 'B',
  };
  return map[header.toUpperCase()] || header;
}

function isMainStatColumn(statsType: string, header: string): boolean {
  const h = header.toUpperCase();
  switch (statsType) {
    case 'mostRuns': return h === 'RUNS';
    case 'highestScore': return h === 'RUNS';
    case 'highestAvg': return h === 'AVG';
    case 'highestSr': return h === 'SR';
    case 'mostHundreds': return h === '100S' || h === 'HUNDREDS';
    case 'mostFifties': return h === '50S' || h === 'FIFTIES';
    case 'mostFours': return h === '4S' || h === 'FOURS';
    case 'mostSixes': return h === '6S' || h === 'SIXES';
    case 'mostNineties': return h === '90S' || h === 'NINETIES';
    case 'mostWickets': return h === 'WKTS';
    case 'lowestAvg': return h === 'AVG';
    case 'bestBowlingInnings': return h === 'BBI' || h === 'WKTS';
    case 'mostFiveWickets': return h === '5-FERS';
    case 'lowestEcon': return h === 'ECON';
    case 'lowestSr': return h === 'SR';
    default: return false;
  }
}
