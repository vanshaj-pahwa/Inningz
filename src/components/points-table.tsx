'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getSeriesPointsTable, getSeriesStats } from '@/app/actions';
import type { PointsTableData, PointsTableGroup, PointsTableTeam } from '@/app/actions';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TableProperties, ChevronDown, ChevronRight, Share2 } from "lucide-react";
import PointsTableShareDialog from '@/components/share-cards/points-table-share-dialog';
import { buildMatchHref } from '@/lib/utils';
import { teamFlagImageUrl } from '@/lib/upstream';

interface PointsTableProps {
  seriesId: string;
  onAvailabilityChange?: (available: boolean) => void;
  showTopPerformers?: boolean;
  seriesName?: string;
}

export default function PointsTableDisplay({ seriesId, onAvailabilityChange, showTopPerformers = false, seriesName }: PointsTableProps) {
  const [data, setData] = useState<PointsTableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topRunScorer, setTopRunScorer] = useState<{ name: string; value: string } | null>(null);
  const [topWicketTaker, setTopWicketTaker] = useState<{ name: string; value: string } | null>(null);
  const [topPerformersLoading, setTopPerformersLoading] = useState(showTopPerformers);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const result = await getSeriesPointsTable(seriesId);
      if (result.success && result.data) {
        setData(result.data);
        onAvailabilityChange?.(true);
      } else if (result.success && !result.data) {
        setData(null);
        onAvailabilityChange?.(false);
      } else {
        setError(result.error ?? 'Failed to load points table');
        onAvailabilityChange?.(false);
      }
      setLoading(false);
    };
    fetchData();

    // Fetch top performers only when needed
    if (!showTopPerformers) return;
    setTopPerformersLoading(true);
    Promise.all([
      getSeriesStats(seriesId, 'mostRuns').catch(() => null),
      getSeriesStats(seriesId, 'mostWickets').catch(() => null),
    ]).then(([runsResult, wktsResult]) => {
      if (runsResult?.success && runsResult.data?.entries?.[0]) {
        const top = runsResult.data.entries[0];
        setTopRunScorer({ name: top.playerName, value: top.values['RUNS'] || top.values['Runs'] || '' });
      }
      if (wktsResult?.success && wktsResult.data?.entries?.[0]) {
        const top = wktsResult.data.entries[0];
        setTopWicketTaker({ name: top.playerName, value: top.values['WKTS'] || top.values['Wkts'] || '' });
      }
      setTopPerformersLoading(false);
    });
  }, [seriesId]);

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
          <AlertTitle className="text-lg">Unable to load points table</AlertTitle>
          <AlertDescription className="mt-2">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data || data.groups.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[30vh] p-8">
        <div className="p-5 rounded-full bg-primary/10 mb-5">
          <TableProperties className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-display mb-2">No points table</h3>
        <p className="text-muted-foreground text-center max-w-sm text-sm">
          Points table is not available for this series
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Performers */}
      {showTopPerformers && (topPerformersLoading || topRunScorer || topWicketTaker) && (
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            {topPerformersLoading ? (
              <>
                <div className="min-w-0 px-3 py-2 sm:py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 flex-1">
                  <p className="text-[11px] sm:text-[11px] uppercase tracking-wider text-orange-400 font-semibold">Most Runs</p>
                  <div className="skeleton h-3 sm:h-3.5 w-32 rounded mt-1" />
                </div>
                <div className="min-w-0 px-3 py-2 sm:py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex-1">
                  <p className="text-[11px] sm:text-[11px] uppercase tracking-wider text-purple-400 font-semibold">Most Wickets</p>
                  <div className="skeleton h-3 sm:h-3.5 w-32 rounded mt-1" />
                </div>
              </>
            ) : (
              <>
                {topRunScorer && topRunScorer.value && (
                  <div className="min-w-0 px-3 py-2 sm:py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 flex-1">
                    <p className="text-[11px] sm:text-[11px] uppercase tracking-wider text-orange-400 font-semibold">Most Runs</p>
                    <p className="text-[11px] sm:text-xs font-medium truncate">{topRunScorer.name} <span className="text-muted-foreground">({topRunScorer.value})</span></p>
                  </div>
                )}
                {topWicketTaker && topWicketTaker.value && (
                  <div className="min-w-0 px-3 py-2 sm:py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex-1">
                    <p className="text-[11px] sm:text-[11px] uppercase tracking-wider text-purple-400 font-semibold">Most Wickets</p>
                    <p className="text-[11px] sm:text-xs font-medium truncate">{topWicketTaker.name} <span className="text-muted-foreground">({topWicketTaker.value})</span></p>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex justify-end">
            <Link
              href={`/series/${seriesId}${seriesName ? `/${seriesName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` : ''}?view=stats`}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all stats
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShareOpen(true)}
          className="rounded-xl gap-1.5 h-7 sm:h-8 text-[11px] sm:text-xs px-2.5"
        >
          <Share2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          Share
        </Button>
      </div>

      {data.groups.map((group, groupIdx) => (
        <GroupTable key={groupIdx} group={group} showGroupName={data.groups.length > 1} />
      ))}

      <PointsTableShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        cardData={{
          seriesName: data.seriesName || seriesName || 'Series',
          matchType: data.matchType,
          groups: data.groups,
        }}
      />
    </div>
  );
}

function GroupTable({ group, showGroupName }: { group: PointsTableGroup; showGroupName: boolean }) {
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);

  const toggleTeam = (teamId: number) => {
    setExpandedTeam(prev => prev === teamId ? null : teamId);
  };

  const totalCols = 11;

  // Determine playoff qualification cutoff
  // If any team has 'Q' status, draw line after the last qualified team
  // Otherwise for 8+ team leagues (IPL-like), default to top 4
  const qualifyCutoff = (() => {
    const lastQIdx = group.teams.map((t, i) => t.teamQualifyStatus === 'Q' ? i : -1).filter(i => i >= 0).pop();
    if (lastQIdx !== undefined && lastQIdx >= 0) return lastQIdx;
    if (group.teams.length >= 8) return 3; // top 4 (0-indexed: after index 3)
    return -1;
  })();

  return (
    <div className="space-y-3">
      {showGroupName && group.groupName && (
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {group.groupName}
        </h3>
      )}
      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2.5 px-2 sm:px-4 font-semibold text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wider w-6 sm:w-8">#</th>
                <th className="text-left py-2.5 px-2 sm:px-4 font-semibold text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wider">Team</th>
                <th className="text-center py-2.5 px-1.5 sm:px-3 font-semibold text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wider">M</th>
                <th className="text-center py-2.5 px-1.5 sm:px-3 font-semibold text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wider">W</th>
                <th className="text-center py-2.5 px-1.5 sm:px-3 font-semibold text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wider">L</th>
                <th className="text-center py-2.5 px-1.5 sm:px-3 font-semibold text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wider ">T</th>
                <th className="text-center py-2.5 px-1.5 sm:px-3 font-semibold text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wider ">NR</th>
                <th className="text-center py-2.5 px-1.5 sm:px-3 font-semibold text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wider">Pts</th>
                <th className="text-right py-2.5 px-2 sm:px-4 font-semibold text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wider">NRR</th>
                <th className="text-center py-2.5 px-2 sm:px-4 font-semibold text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wider hidden sm:table-cell">Form</th>
                <th className="w-6 sm:w-10"></th>
              </tr>
            </thead>
            <tbody>
              {group.teams.map((team, idx) => (
                <Fragment key={team.teamId}>
                  <TeamRow
                    team={team}
                    rank={idx + 1}
                    isExpanded={expandedTeam === team.teamId}
                    onToggle={() => toggleTeam(team.teamId)}
                    totalCols={totalCols}
                    qualifyCutoff={qualifyCutoff}
                  />
                  {idx === qualifyCutoff && (
                    <tr>
                      <td colSpan={totalCols} className="p-0 h-0.5 bg-primary/20" />
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TeamRow({
  team,
  rank,
  isExpanded,
  onToggle,
  totalCols,
}: {
  team: PointsTableTeam;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
  totalCols: number;
  qualifyCutoff: number;
}) {
  const router = useRouter();
  const isQualified = team.teamQualifyStatus === 'Q';
  const isEliminated = team.teamQualifyStatus === 'E';
  const hasMatches = team.matches.length > 0;

  return (
    <>
      <tr
        onClick={hasMatches ? onToggle : undefined}
        className={`
          border-b border-border/30 transition-colors
          ${isQualified ? 'bg-primary/5' : isEliminated ? 'bg-red-500/[0.04] opacity-70' : 'hover:bg-muted/30'}
          ${hasMatches ? 'cursor-pointer' : ''}
          ${isExpanded ? 'bg-muted/20' : ''}
        `}
      >
        <td className="py-2.5 px-2 sm:px-4">
          <span className={`font-mono text-[10px] sm:text-xs ${
            rank <= 4 ? 'text-amber-400 font-bold' : 'text-muted-foreground'
          }`}>
            {rank}
          </span>
        </td>
        <td className="py-2.5 px-2 sm:px-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {team.teamImageId && (
              <Image
                src={teamFlagImageUrl(team.teamImageId, team.teamName.toLowerCase())}
                alt={team.teamName}
                width={72}
                height={52}
                className="object-contain shrink-0 w-5 h-4 sm:w-[28px] sm:h-[20px]"
                unoptimized
              />
            )}
            <span className="font-semibold text-foreground whitespace-nowrap text-xs sm:text-sm">
              {team.teamName}
            </span>
            {isQualified && (
              <span className="text-[11px] sm:text-[10px] font-bold text-primary bg-primary/10 px-1 sm:px-1.5 py-0.5 rounded">Q</span>
            )}
            {isEliminated && (
              <span className="text-[11px] sm:text-[10px] font-bold text-red-400 border border-red-400/40 px-1 sm:px-1.5 py-0.5 rounded">E</span>
            )}
          </div>
        </td>
        <td className="text-center py-2.5 px-1.5 sm:px-3 text-muted-foreground font-mono tabular-nums">{team.matchesPlayed}</td>
        <td className="text-center py-2.5 px-1.5 sm:px-3 text-green-400 font-mono tabular-nums font-medium">{team.matchesWon}</td>
        <td className="text-center py-2.5 px-1.5 sm:px-3 text-red-400 font-mono tabular-nums font-medium">{team.matchesLost}</td>
        <td className="text-center py-2.5 px-1.5 sm:px-3 text-muted-foreground font-mono tabular-nums ">{team.matchesTied}</td>
        <td className="text-center py-2.5 px-1.5 sm:px-3 text-muted-foreground font-mono tabular-nums ">{team.noRes}</td>
        <td className="text-center py-2.5 px-1.5 sm:px-3">
          <span className="font-display text-sm sm:text-base text-amber-400 score-glow tabular-nums">{team.points}</span>
        </td>
        <td className="text-right py-2.5 px-2 sm:px-4">
          <span className={`font-mono tabular-nums text-[10px] sm:text-xs ${
            team.nrr.startsWith('+') ? 'text-green-400' : team.nrr.startsWith('-') ? 'text-red-400' : 'text-muted-foreground'
          }`}>
            {team.nrr}
          </span>
        </td>
        <td className="text-center py-2.5 px-2 sm:px-4 hidden sm:table-cell">
          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
            {team.form.slice(-5).map((result, i) => (
              <span
                key={i}
                className={`
                  w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[11px] sm:text-[10px] font-bold flex items-center justify-center
                  ${result === 'W' ? 'bg-green-500/20 text-green-400' :
                    result === 'L' ? 'bg-red-500/20 text-red-400' :
                    'bg-zinc-500/20 text-zinc-400'}
                `}
              >
                {result}
              </span>
            ))}
          </div>
        </td>
        <td className="py-2.5 px-1 sm:px-2 text-center">
          {hasMatches && (
            <ChevronDown className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground transition-transform duration-200 inline-block ${isExpanded ? 'rotate-180' : ''}`} />
          )}
        </td>
      </tr>
      {isExpanded && hasMatches && (
        <tr>
          <td colSpan={totalCols} className="p-0">
            <div className="mx-4 my-3 rounded-xl border border-border/40 bg-muted/5 overflow-hidden shadow-inner">
              {/* Match history table */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/10 border-b border-border/30">
                    <th className="text-left py-2 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Opponent</th>
                    <th className="text-left py-2 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Description</th>
                    <th className="text-left py-2 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-16">Date</th>
                    <th className="text-left py-2 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {team.matches.map((match, i) => {
                    const row = (
                      <tr
                        key={match.matchId || i}
                        className={`border-b border-border/10 last:border-0 transition-colors ${match.matchId ? 'cursor-pointer hover:bg-primary/10' : ''}`}
                        onClick={match.matchId ? (e) => {
                          e.stopPropagation();
                          router.push(buildMatchHref(match.matchId, match.matchName || match.opponent));
                        } : undefined}
                      >
                        <td className="py-2.5 px-4 text-sm text-foreground">
                          {match.opponent || match.opponentShortName}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-muted-foreground hidden sm:table-cell">
                          {match.matchName}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                          {match.date}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`text-xs font-medium ${
                            match.result
                              ? match.won ? 'text-green-400' : 'text-red-400'
                              : 'text-muted-foreground'
                          }`}>
                            {match.result || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                    return row;
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
