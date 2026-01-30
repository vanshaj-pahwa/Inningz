'use client';

import { useEffect, useState } from 'react';
import { getSeriesPointsTable } from '@/app/actions';
import type { PointsTableData, PointsTableGroup } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TableProperties } from "lucide-react";

interface PointsTableProps {
  seriesId: string;
  onAvailabilityChange?: (available: boolean) => void;
}

export default function PointsTableDisplay({ seriesId, onAvailabilityChange }: PointsTableProps) {
  const [data, setData] = useState<PointsTableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const result = await getSeriesPointsTable(seriesId);
      if (result.success && result.data) {
        setData(result.data);
        onAvailabilityChange?.(true);
      } else if (result.success && !result.data) {
        // Points table not available for this series
        setData(null);
        onAvailabilityChange?.(false);
      } else {
        setError(result.error ?? 'Failed to load points table');
        onAvailabilityChange?.(false);
      }
      setLoading(false);
    };
    fetchData();
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
    <div className="space-y-8">
      {data.groups.map((group, groupIdx) => (
        <GroupTable key={groupIdx} group={group} showGroupName={data.groups.length > 1} />
      ))}
    </div>
  );
}

function GroupTable({ group, showGroupName }: { group: PointsTableGroup; showGroupName: boolean }) {
  return (
    <div className="space-y-3">
      {showGroupName && group.groupName && (
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {group.groupName}
        </h3>
      )}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-8">#</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Team</th>
                <th className="text-center py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">M</th>
                <th className="text-center py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">W</th>
                <th className="text-center py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">L</th>
                <th className="text-center py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">T</th>
                <th className="text-center py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">NR</th>
                <th className="text-center py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Pts</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">NRR</th>
                <th className="text-center py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Form</th>
              </tr>
            </thead>
            <tbody>
              {group.teams.map((team, idx) => {
                const isQualified = team.teamQualifyStatus === 'Q';
                return (
                  <tr
                    key={team.teamId}
                    className={`
                      border-b border-border/30 last:border-0 transition-colors
                      ${isQualified ? 'bg-primary/5' : 'hover:bg-muted/30'}
                    `}
                  >
                    <td className="py-3 px-4">
                      <span className={`font-mono text-xs ${idx < 3 ? 'text-amber-400 font-bold' : 'text-muted-foreground'}`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground whitespace-nowrap">
                          {team.teamName}
                        </span>
                        {isQualified && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Q</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-3 px-3 text-muted-foreground font-mono tabular-nums">{team.matchesPlayed}</td>
                    <td className="text-center py-3 px-3 text-green-400 font-mono tabular-nums font-medium">{team.matchesWon}</td>
                    <td className="text-center py-3 px-3 text-red-400 font-mono tabular-nums font-medium">{team.matchesLost}</td>
                    <td className="text-center py-3 px-3 text-muted-foreground font-mono tabular-nums">{team.matchesTied}</td>
                    <td className="text-center py-3 px-3 text-muted-foreground font-mono tabular-nums">{team.noRes}</td>
                    <td className="text-center py-3 px-3">
                      <span className="font-display text-base text-amber-400 score-glow tabular-nums">{team.points}</span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={`font-mono tabular-nums text-xs ${
                        team.nrr.startsWith('+') ? 'text-green-400' : team.nrr.startsWith('-') ? 'text-red-400' : 'text-muted-foreground'
                      }`}>
                        {team.nrr}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4 hidden sm:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        {team.form.slice(-5).map((result, i) => (
                          <span
                            key={i}
                            className={`
                              w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
