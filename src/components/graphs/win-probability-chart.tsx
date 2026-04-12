'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import type { WinProbHistory } from '@/app/actions';
import { cn } from '@/lib/utils';

interface WinProbabilityChartProps {
  data: WinProbHistory;
}

const TEAM1_COLOR = '#E6A937';
const TEAM2_COLOR = '#0588F0';

export default function WinProbabilityChart({ data }: WinProbabilityChartProps) {
  const [filter, setFilter] = useState<'both' | 'team1' | 'team2'>('both');

  if (!data.points.length) {
    return <p className="text-xs text-muted-foreground">No win probability data available</p>;
  }

  const chartData = data.points.map(p => ({
    over: p.over,
    team1: p.team1Prob,
    team2: p.team2Prob,
  }));

  let inningsBreakIndex = -1;
  for (let i = 1; i < data.points.length; i++) {
    if (data.points[i].over < data.points[i - 1].over) {
      inningsBreakIndex = i;
      break;
    }
  }

  const indexedData = chartData.map((d, i) => ({ ...d, idx: i }));

  const filters = [
    { key: 'both' as const, label: 'Both' },
    { key: 'team1' as const, label: data.team1Name },
    { key: 'team2' as const, label: data.team2Name },
  ];

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-0.5 p-0.5 bg-muted/40 rounded-lg w-fit">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
              filter === f.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl bg-muted/20 p-2 pt-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={indexedData} margin={{ top: 5, right: 10, left: -10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border) / 0.5)" />
            <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="2 2" />
            {inningsBreakIndex > 0 && (
              <ReferenceLine x={inningsBreakIndex} stroke="hsl(var(--border))" strokeWidth={1} />
            )}
            <XAxis
              dataKey="idx"
              tick={false}
              axisLine={{ stroke: 'hsl(var(--border) / 0.5)' }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={28}
              label={{ value: '%', position: 'insideTopLeft', offset: -5, fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <Tooltip content={<WinProbTooltip team1={data.team1Name} team2={data.team2Name} />} />
            {(filter === 'both' || filter === 'team1') && (
              <Line
                type="monotone"
                dataKey="team1"
                stroke={TEAM1_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: TEAM1_COLOR }}
              />
            )}
            {(filter === 'both' || filter === 'team2') && (
              <Line
                type="monotone"
                dataKey="team2"
                stroke={TEAM2_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: TEAM2_COLOR }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* Innings labels */}
        <div className="flex justify-around text-[10px] text-muted-foreground -mt-4 pb-1">
          {inningsBreakIndex > 0 ? (
            <>
              <span>1st Inn ({data.team1Name})</span>
              <span>2nd Inn ({data.team2Name})</span>
            </>
          ) : (
            <span>Overs</span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-5 items-center text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: TEAM1_COLOR }} />
          {data.team1Name}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: TEAM2_COLOR }} />
          {data.team2Name}
        </span>
      </div>

      {/* Over-by-over bars */}
      <OverByOverBars data={data} inningsBreakIndex={inningsBreakIndex} />
    </div>
  );
}

function OverByOverBars({ data, inningsBreakIndex }: { data: WinProbHistory; inningsBreakIndex: number }) {
  const [expanded, setExpanded] = useState(false);

  const inn1Points = inningsBreakIndex > 0
    ? data.points.slice(0, inningsBreakIndex)
    : data.points;
  const inn2Points = inningsBreakIndex > 0
    ? data.points.slice(inningsBreakIndex)
    : [];

  const inn1Sorted = [...inn1Points].sort((a, b) => b.over - a.over);
  const inn2Sorted = [...inn2Points].sort((a, b) => b.over - a.over);

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors"
      >
        <span className="text-sm font-semibold">Over-by-over</span>
        <svg
          className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', expanded && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-border/40">
          {inn1Sorted.length > 0 && (
            <InningsSection
              title={`${data.team1Name} (1st Innings)`}
              points={inn1Sorted}
              team1Name={data.team1Name}
              team2Name={data.team2Name}
            />
          )}
          {inn2Sorted.length > 0 && (
            <InningsSection
              title={`${data.team2Name} (2nd Innings)`}
              points={inn2Sorted}
              team1Name={data.team1Name}
              team2Name={data.team2Name}
            />
          )}
        </div>
      )}
    </div>
  );
}

function InningsSection({ title, points, team1Name, team2Name }: {
  title: string; points: any[]; team1Name: string; team2Name: string;
}) {
  return (
    <div>
      <div className="bg-muted/20 text-muted-foreground px-4 py-1.5 text-[11px] font-medium tracking-wide">
        {title}
      </div>
      <div className="px-4 py-2.5 space-y-1.5">
        {points.map(p => (
          <div
            key={`${p.innings}-${p.over}`}
            className="flex items-center gap-2.5"
            title={`Over ${p.over} | ${team1Name}: ${p.team1Prob}%${p.team2Prob > 0 ? ` \u2022 ${team2Name}: ${p.team2Prob}%` : ''}`}
          >
            <span className="w-5 text-[10px] text-muted-foreground/70 tabular-nums text-right shrink-0">
              {p.over}
            </span>
            <div className="flex-1 relative h-[6px] rounded-full bg-muted/30 overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full"
                style={{ width: `${p.team1Prob}%`, backgroundColor: TEAM1_COLOR }}
              />
              {p.team2Prob > 0 && (
                <div
                  className="absolute top-0 h-full"
                  style={{ width: `${p.team2Prob}%`, left: `calc(${p.team1Prob}% + 3px)`, backgroundColor: TEAM2_COLOR }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WinProbTooltip({ active, payload, team1, team2 }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="bg-card text-card-foreground px-3 py-2 rounded-lg text-xs shadow-xl border border-border/80 space-y-0.5">
      <p className="font-semibold text-foreground">Over {d.over}</p>
      {d.team1 !== undefined && (
        <p className="tabular-nums">
          <span className="font-medium" style={{ color: TEAM1_COLOR }}>{team1}</span>: {d.team1}%
        </p>
      )}
      {d.team2 !== undefined && (
        <p className="tabular-nums">
          <span className="font-medium" style={{ color: TEAM2_COLOR }}>{team2}</span>: {d.team2}%
        </p>
      )}
    </div>
  );
}
