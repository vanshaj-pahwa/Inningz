'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { InningsOverData } from '@/app/actions';
import ChartZoomModal from './chart-zoom-modal';

interface WormChartProps {
  allInnings: { inningsId: number; data: InningsOverData }[];
  teamColorMap?: { name: string; color: string }[];
}

const DEFAULT_COLORS = ['#E6A937', '#0588F0', '#22c55e', '#ef4444'];

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function WormChart({ allInnings, teamColorMap }: WormChartProps) {
  const COLORS = allInnings.map((inn, idx) => {
    if (teamColorMap) {
      const match = teamColorMap.find(t => inn.data.teamName.toLowerCase().includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(inn.data.teamName.toLowerCase()));
      if (match) return match.color;
    }
    return DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
  });
  if (!allInnings.length) return null;

  // Per-team innings numbering (Tests have 2 innings per team — disambiguate with "(1st)" / "(2nd)").
  const teamCounts: Record<string, number> = {};
  for (const inn of allInnings) {
    teamCounts[inn.data.teamName] = (teamCounts[inn.data.teamName] ?? 0) + 1;
  }
  const teamSeenLabel: Record<string, number> = {};
  const inningsLabels = allInnings.map(inn => {
    const team = inn.data.teamName;
    teamSeenLabel[team] = (teamSeenLabel[team] ?? 0) + 1;
    return teamCounts[team] > 1 ? `${team} (${ordinal(teamSeenLabel[team])})` : team;
  });
  const teamSeenStroke: Record<string, number> = {};
  const inningsIsSecondPlus = allInnings.map(inn => {
    const team = inn.data.teamName;
    teamSeenStroke[team] = (teamSeenStroke[team] ?? 0) + 1;
    return teamCounts[team] > 1 && teamSeenStroke[team] >= 2;
  });

  const maxOvers = Math.max(...allInnings.map(i => i.data.overs.length));
  const chartData = [];

  for (let i = 0; i < maxOvers; i++) {
    const point: any = { over: i + 1 };
    for (const inn of allInnings) {
      const o = inn.data.overs[i];
      if (o) {
        point[`inn${inn.inningsId}`] = o.cumulativeScore;
        point[`inn${inn.inningsId}W`] = o.wickets || 0;
      }
    }
    chartData.push(point);
  }

  const WicketDot = (color: string, key: string) => (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || !payload || !payload[key]) return <g />;
    return (
      <g>
        <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={1.5} />
      </g>
    );
  };

  return (
    <div className="space-y-4">
      <ChartZoomModal title="Worm" renderChart={(height) => (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border) / 0.5)" />
            <XAxis
              dataKey="over"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border) / 0.5)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip content={<WormTooltip innings={allInnings} colors={COLORS} labels={inningsLabels} />} />
            {allInnings.map((inn, idx) => (
              <Line
                key={inn.inningsId}
                type="monotone"
                dataKey={`inn${inn.inningsId}`}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2.5}
                strokeDasharray={inningsIsSecondPlus[idx] ? '6 4' : undefined}
                dot={WicketDot(COLORS[idx % COLORS.length], `inn${inn.inningsId}W`)}
                activeDot={{ r: 4, strokeWidth: 0, fill: COLORS[idx % COLORS.length] }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )} />

      <div className="flex gap-x-5 gap-y-2 justify-center flex-wrap">
        {allInnings.map((inn, idx) => (
          <span key={inn.inningsId} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {inningsIsSecondPlus[idx] ? (
              <span className="inline-block w-4 h-[2px]" style={{
                backgroundImage: `repeating-linear-gradient(90deg, ${COLORS[idx % COLORS.length]} 0 4px, transparent 4px 6px)`,
              }} />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
            )}
            {inningsLabels[idx]}
          </span>
        ))}
      </div>
    </div>
  );
}

function WormTooltip({ active, payload, innings, colors, labels }: any) {
  if (!active || !payload?.length) return null;
  const c = colors || DEFAULT_COLORS;
  const d = payload[0]?.payload;
  return (
    <div className="bg-card text-card-foreground px-3 py-2 rounded-lg text-xs shadow-xl border border-border/80 space-y-0.5">
      <p className="font-semibold text-foreground">Over {d.over}</p>
      {innings.map((inn: any, idx: number) => {
        const val = d[`inn${inn.inningsId}`];
        if (val === undefined) return null;
        const wkts = d[`inn${inn.inningsId}W`] || 0;
        const label = labels?.[idx] ?? inn.data.teamName;
        return (
          <p key={inn.inningsId} className="tabular-nums">
            <span className="font-medium" style={{ color: c[idx % c.length] }}>{label}</span>: {val}
            {wkts > 0 && <span className="text-red-400 ml-1">· {wkts}W</span>}
          </p>
        );
      })}
    </div>
  );
}
