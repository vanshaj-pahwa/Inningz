'use client';

import { useEffect, useState } from 'react';
import { getBallMapData } from '@/app/actions';
import type { BallMapData } from '@/app/actions';

// The current at-crease batters, as surfaced by the live score feed. Fields are
// optional to match the loosely-typed scraper output.
interface CurrentBatsman {
  name?: string;
  profileId?: string;
  runs?: string;
  balls?: string;
  strikeRate?: string;
  fours?: string;
  sixes?: string;
  onStrike?: boolean;
}

interface Dist {
  dots: number;
  ones: number;
  twos: number;
  threes: number;
  fours: number;
  sixes: number;
}

// Every scoring bucket we can derive from the ball-by-ball labels, in bar order.
const BUCKETS: { key: keyof Dist; label: string; bar: string; dot: string }[] = [
  { key: 'dots', label: 'Dots', bar: 'bg-muted-foreground/35', dot: 'bg-muted-foreground/50' },
  { key: 'ones', label: '1s', bar: 'bg-emerald-500/45', dot: 'bg-emerald-500/60' },
  { key: 'twos', label: '2s', bar: 'bg-emerald-500/65', dot: 'bg-emerald-500/75' },
  { key: 'threes', label: '3s', bar: 'bg-emerald-500/85', dot: 'bg-emerald-500/90' },
  { key: 'fours', label: '4s', bar: 'bg-blue-500', dot: 'bg-blue-500' },
  { key: 'sixes', label: '6s', bar: 'bg-violet-500', dot: 'bg-violet-500' },
];

// Tally a batter's deliveries by outcome. Boundaries come from the authoritative
// scorecard totals so the counts always match the table; dots/1s/2s/3s are read
// off the per-ball labels (extras and wickets don't carry a scoring bucket).
function distributionFor(data: BallMapData, id: number, fours: number, sixes: number): Dist {
  const d: Dist = { dots: 0, ones: 0, twos: 0, threes: 0, fours, sixes };
  for (const b of data.balls) {
    if (b.batsmanId !== id) continue;
    switch (b.ballLabel) {
      case '•': case '0': d.dots++; break;
      case '1': d.ones++; break;
      case '2': d.twos++; break;
      case '3': d.threes++; break;
    }
  }
  return d;
}

function BatterPanel({ batsman, dist }: { batsman: CurrentBatsman; dist: Dist }) {
  const runs = Number(batsman.runs) || 0;
  const balls = Number(batsman.balls) || 0;
  const sr = parseFloat(batsman.strikeRate) || 0;
  const fours = Number(batsman.fours) || 0;
  const sixes = Number(batsman.sixes) || 0;
  const boundaryRuns = fours * 4 + sixes * 6;
  const dotPct = balls > 0 ? Math.round((dist.dots / balls) * 100) : 0;
  const boundaryPct = runs > 0 ? Math.round((boundaryRuns / runs) * 100) : 0;
  const barTotal = BUCKETS.reduce((s, b) => s + dist[b.key], 0) || 1;

  return (
    <div className="rounded-xl border border-border/50 bg-[hsl(var(--elevated))] p-3.5 md:p-4">
      {/* Name + score */}
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <span className="font-semibold text-sm md:text-base text-foreground truncate">
          {batsman.name}
          {batsman.onStrike && <span className="text-primary"> *</span>}
        </span>
        <span className="flex items-baseline gap-1.5 shrink-0 tabular-nums">
          <span className="font-display text-lg md:text-xl text-foreground">{runs}</span>
          <span className="text-xs text-muted-foreground">({balls})</span>
          <span className="text-[11px] text-muted-foreground">SR {sr.toFixed(1)}</span>
        </span>
      </div>

      {/* Stacked distribution bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden bg-muted/40 mb-3">
        {BUCKETS.map((b) => {
          const v = dist[b.key];
          if (v <= 0) return null;
          return (
            <div
              key={b.key}
              className={b.bar}
              style={{ width: `${(v / barTotal) * 100}%` }}
              title={`${b.label}: ${v}`}
            />
          );
        })}
      </div>

      {/* Counts — six buckets spread across the full width */}
      <div className="grid grid-cols-6 gap-1.5">
        {BUCKETS.map((b) => (
          <div key={b.key} className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-[2px] ${b.dot}`} />
              {b.label}
            </span>
            <span className="text-sm font-bold tabular-nums text-foreground">{dist[b.key]}</span>
          </div>
        ))}
      </div>

      {/* Derived rates */}
      <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-border/40 text-[11px]">
        <span className="text-muted-foreground">
          Dot <span className="font-bold text-foreground tabular-nums">{dotPct}%</span>
        </span>
        <span className="text-muted-foreground">
          Boundary runs <span className="font-bold text-foreground tabular-nums">{boundaryRuns}</span>
          <span className="text-muted-foreground/70"> ({boundaryPct}%)</span>
        </span>
      </div>
    </div>
  );
}

// Per-batter scoring breakdown for the two batters currently at the crease,
// built from ball-by-ball data (dot %, run distribution, boundary share).
export default function BatterBreakdown({
  matchId,
  inningsId,
  batsmen,
}: {
  matchId: string;
  inningsId: number;
  batsmen: CurrentBatsman[];
}) {
  const [ballMap, setBallMap] = useState<BallMapData | null>(null);

  // Refetch whenever a batter's line changes (i.e. a new ball has landed) so the
  // breakdown tracks the live feed without its own polling timer.
  const sig = batsmen.map((b) => `${b.profileId}:${b.runs}:${b.balls}`).join('|');
  useEffect(() => {
    let cancelled = false;
    getBallMapData(matchId, inningsId)
      .then((res) => {
        if (!cancelled && res.success && res.data) setBallMap(res.data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [matchId, inningsId, sig]);

  const withId = batsmen.filter((b) => b.profileId);
  if (withId.length === 0) return null;

  // First load: show a skeleton shaped like the panels while the ball map fetches.
  if (!ballMap) {
    return (
      <div className="surface-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 section-header-gradient">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Batter Breakdown</h3>
        </div>
        <div className="p-3 md:p-4 space-y-3">
          {withId.map((b) => (
            <div key={b.profileId} className="rounded-xl border border-border/50 p-3.5 md:p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="skeleton h-4 w-28 rounded" />
                <span className="skeleton h-4 w-20 rounded" />
              </div>
              <div className="skeleton h-2.5 w-full rounded-full mb-3" />
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className="skeleton h-8 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 section-header-gradient">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Batter Breakdown</h3>
      </div>
      <div className="p-3 md:p-4 space-y-3">
        {withId.map((b) => (
          <BatterPanel
            key={b.profileId}
            batsman={b}
            dist={distributionFor(ballMap, Number(b.profileId), Number(b.fours) || 0, Number(b.sixes) || 0)}
          />
        ))}
      </div>
    </div>
  );
}
