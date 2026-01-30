'use client';

import { useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { InningsOverData } from '@/app/actions';

interface OverByOverChartProps {
  data: InningsOverData;
}

export default function OverByOverChart({ data }: OverByOverChartProps) {
  const [showCumulative, setShowCumulative] = useState(false);

  if (!data.overs || data.overs.length === 0) return null;

  const chartData = data.overs.map(o => ({
    over: o.overNumber,
    runs: o.runs,
    wickets: o.wickets,
    cumulative: o.cumulativeScore,
    summary: o.overSummary,
  }));

  const maxWickets = Math.max(...chartData.map(d => d.wickets));
  const topMargin = maxWickets > 0 ? 5 + maxWickets * 8 : 5;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Runs per Over
        </h4>
        <button
          onClick={() => setShowCumulative(!showCumulative)}
          className={`
            text-[10px] md:text-xs px-2.5 py-1 rounded-full transition-colors
            ${showCumulative
              ? 'bg-green-500/20 text-green-400'
              : 'bg-zinc-200/50 dark:bg-zinc-800/50 text-muted-foreground hover:text-foreground'
            }
          `}
        >
          {showCumulative ? 'Cumulative On' : 'Show Cumulative'}
        </button>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: topMargin, right: 5, left: -10, bottom: 0 }}>
          <XAxis
            dataKey="over"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="runs"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          {showCumulative && (
            <YAxis
              yAxisId="cumulative"
              orientation="right"
              tick={{ fontSize: 10, fill: '#22c55e' }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
          )}
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
          <Bar
            dataKey="runs"
            yAxisId="runs"
            radius={[3, 3, 0, 0]}
            maxBarSize={20}
            label={({ x, y, width, index }: { x: number; y: number; width: number; index: number }) => {
              const w = chartData[index]?.wickets ?? 0;
              if (w === 0) return null;
              const ballSize = 6;
              const gap = 2;
              const cx = x + width / 2;
              return (
                <g>
                  {Array.from({ length: w }).map((_, i) => (
                    <circle
                      key={i}
                      cx={cx}
                      cy={y - ballSize / 2 - gap - i * (ballSize + gap)}
                      r={ballSize / 2}
                      fill="#ef4444"
                    />
                  ))}
                </g>
              );
            }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.wickets > 0 ? '#ef4444' : '#6366f1'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
          {showCumulative && (
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              yAxisId="cumulative"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 justify-center">
        <span className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
          Runs
        </span>
        <span className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          Wicket
        </span>
        {showCumulative && (
          <span className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground">
            <span className="w-4 h-0.5 bg-green-500 inline-block rounded" />
            Total
          </span>
        )}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900/95 text-white p-2.5 rounded-xl text-xs shadow-lg border border-zinc-700/50 space-y-0.5">
      <p className="font-semibold font-display">Over {d.over}</p>
      <p className="tabular-nums">
        {d.runs} run{d.runs !== 1 ? 's' : ''}
        {d.wickets > 0 && (
          <span className="text-red-400 ml-1.5">
            {d.wickets} wicket{d.wickets > 1 ? 's' : ''}
          </span>
        )}
      </p>
      {d.summary && (
        <p className="text-zinc-400 font-mono text-[10px]">{d.summary}</p>
      )}
      <p className="text-zinc-400 tabular-nums">Score: {d.cumulative}</p>
    </div>
  );
}
