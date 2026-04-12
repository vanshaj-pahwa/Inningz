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

interface RunRateChartProps {
  allInnings: { inningsId: number; data: InningsOverData }[];
}

const COLORS = ['#E6A937', '#0588F0', '#22c55e', '#ef4444'];

export default function RunRateChart({ allInnings }: RunRateChartProps) {
  if (!allInnings.length) return null;

  const maxOvers = Math.max(...allInnings.map(i => i.data.overs.length));
  const chartData = [];

  for (let i = 0; i < maxOvers; i++) {
    const point: any = { over: i + 1 };
    for (const inn of allInnings) {
      const o = inn.data.overs[i];
      if (o) {
        point[`inn${inn.inningsId}`] = +(o.cumulativeScore / o.overNumber).toFixed(2);
      }
    }
    chartData.push(point);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-muted/20 p-2 pt-4">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
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
              width={30}
            />
            <Tooltip content={<RRTooltip innings={allInnings} />} />
            {allInnings.map((inn, idx) => (
              <Line
                key={inn.inningsId}
                type="monotone"
                dataKey={`inn${inn.inningsId}`}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3.5, strokeWidth: 0, fill: COLORS[idx % COLORS.length] }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-5 justify-center flex-wrap">
        {allInnings.map((inn, idx) => (
          <span key={inn.inningsId} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
            {inn.data.teamName}
          </span>
        ))}
      </div>
    </div>
  );
}

function RRTooltip({ active, payload, innings }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-card text-card-foreground px-3 py-2 rounded-lg text-xs shadow-xl border border-border/80 space-y-0.5">
      <p className="font-semibold text-foreground">Over {d.over}</p>
      {innings.map((inn: any, idx: number) => {
        const val = d[`inn${inn.inningsId}`];
        if (val === undefined) return null;
        return (
          <p key={inn.inningsId} className="tabular-nums">
            <span className="font-medium" style={{ color: COLORS[idx % COLORS.length] }}>{inn.data.teamName}</span>: {val}
          </p>
        );
      })}
    </div>
  );
}
