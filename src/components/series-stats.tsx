'use client';

import { useEffect, useState } from 'react';
import { getSeriesStatsTypes, getSeriesStats } from '@/app/actions';
import type { SeriesStatsType, SeriesStatCategory } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { BarChart3, ChevronDown } from "lucide-react";

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
  const selectedStatLabel = statOptions.find(s => s.value === selectedStat)?.header || 'Most Runs';

  // Group stat options by category for the dropdown
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
    <div className="space-y-6">
      {/* Stat type selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-xl gap-2">
              <BarChart3 className="h-4 w-4" />
              {selectedStatLabel}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {battingStats.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground tracking-wider uppercase">Batting</div>
                <DropdownMenuRadioGroup value={selectedStat} onValueChange={setSelectedStat}>
                  {battingStats.map(s => (
                    <DropdownMenuRadioItem key={s.value} value={s.value!}>
                      {s.header}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </>
            )}
            {bowlingStats.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground tracking-wider uppercase mt-1">Bowling</div>
                <DropdownMenuRadioGroup value={selectedStat} onValueChange={setSelectedStat}>
                  {bowlingStats.map(s => (
                    <DropdownMenuRadioItem key={s.value} value={s.value!}>
                      {s.header}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats table */}
      {statsLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      ) : statData && statData.entries.length > 0 ? (
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-8">#</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    {statData.headers[0] || 'Player'}
                  </th>
                  {statData.headers.slice(1).map((header) => (
                    <th key={header} className="text-right py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                      {header}
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
                      className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className={`font-mono text-xs ${isTop3 ? 'text-amber-400 font-bold' : 'text-muted-foreground'}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-foreground">
                          {entry.playerName}
                        </span>
                      </td>
                      {statData.headers.slice(1).map((header) => {
                        // Highlight the main value column (varies by stat type)
                        const isMainValue = isMainStatColumn(selectedStat, header);
                        return (
                          <td key={header} className="text-right py-3 px-4 whitespace-nowrap">
                            <span className={`font-mono tabular-nums ${isMainValue ? 'font-display text-base text-amber-400 score-glow' : 'text-muted-foreground'}`}>
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
  );
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
