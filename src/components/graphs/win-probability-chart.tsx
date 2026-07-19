'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import type { WinProbHistory } from '@/app/actions';
import { cn } from '@/lib/utils';
import ChartZoomModal from './chart-zoom-modal';

interface WinProbabilityChartProps {
  data: WinProbHistory;
}

const DRAW_COLOR = '#9CA3AF'; // neutral grey for draw/tie

export default function WinProbabilityChart({ data }: WinProbabilityChartProps) {
  const TEAM1_COLOR = data.team1Color || '#E6A937';
  const TEAM2_COLOR = data.team2Color || '#0588F0';
  const [filter, setFilter] = useState<'both' | 'team1' | 'team2'>('both');
  const [chartType, setChartType] = useState<'area' | 'line'>('area');

  // Need at least two points to draw a meaningful line — a single (or empty) series
  // renders as bare axes, which reads as broken.
  if (data.points.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 px-4">
        <p className="text-sm font-medium text-foreground mb-1">Win probability isn&apos;t available yet</p>
        <p className="text-xs text-muted-foreground max-w-xs">It builds up as the match progresses. Check back once a few overs have been bowled.</p>
      </div>
    );
  }

  // Test matches: the source emits a non-zero `drawProb` on at least some points.
  // Show the draw series only when we actually see meaningful draw probability.
  const hasDrawSeries = data.points.some(p => (p.drawProb ?? 0) > 0);

  // Detect innings break via the `innings` field (backend sends continuous over numbers)
  const firstInn2Idx = data.points.findIndex(p => p.innings === 2);
  const inningsBreakIndex = firstInn2Idx > 0 ? firstInn2Idx : -1;
  // Overs in innings 2 are continuous (21, 22, …) — rebase them to 1-based per-innings
  const inn1LastOver = firstInn2Idx > 0 ? data.points[firstInn2Idx - 1].over : 0;

  const chartData = data.points.map(p => {
    const displayOver = p.innings === 2 ? p.over - inn1LastOver : p.over;
    return {
      over: p.over,
      displayOver,
      innings: p.innings,
      team1: p.team1Prob,
      team2: p.team2Prob,
      draw: p.drawProb ?? 0,
      isTeam1Wicket: p.isTeam1Wicket,
      isTeam2Wicket: p.isTeam2Wicket,
      wicketCommentary: p.wicketCommentary,
    };
  });

  const indexedData = chartData.map((d, i) => ({ ...d, idx: i, overLabel: `${d.displayOver}` }));

  const filters = [
    { key: 'both' as const, label: 'Both' },
    { key: 'team1' as const, label: data.team1Name },
    { key: 'team2' as const, label: data.team2Name },
  ];

  // Grid / reference lines / axes / tooltip are identical for the line and area
  // views, so share them across both charts.
  const axisChildren = [
    <CartesianGrid key="grid" strokeDasharray="4 4" stroke="hsl(var(--border) / 0.5)" />,
    <ReferenceLine key="ref50" y={50} stroke="hsl(var(--border))" strokeDasharray="2 2" />,
    inningsBreakIndex > 0 ? (
      <ReferenceLine key="brk" x={inningsBreakIndex} stroke="hsl(var(--border))" strokeWidth={1} />
    ) : null,
    <XAxis
      key="x"
      dataKey="idx"
      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
      tickFormatter={(idx: number) => indexedData[idx]?.overLabel || ''}
      interval="preserveStartEnd"
      axisLine={{ stroke: 'hsl(var(--border) / 0.5)' }}
      tickLine={false}
    />,
    <YAxis
      key="y"
      domain={[0, 100]}
      ticks={[0, 25, 50, 75, 100]}
      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
      axisLine={false}
      tickLine={false}
      width={35}
    />,
    <Tooltip
      key="tt"
      content={<WinProbTooltip team1={data.team1Name} team2={data.team2Name} hasDrawSeries={hasDrawSeries} />}
      allowEscapeViewBox={{ x: true, y: false }}
      wrapperStyle={{ zIndex: 20, pointerEvents: 'none' }}
    />,
  ];

  // Wicket markers sit on each team's win-prob line (the boundary of its area).
  const wicketDot = (color: string, key: 'isTeam1Wicket' | 'isTeam2Wicket', prefix: string) => (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload[key]) return <circle key={`${prefix}-${payload.over}`} r={0} />;
    return <circle key={`${prefix}w-${payload.over}`} cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={1.5} />;
  };

  return (
    <div className="space-y-4">
      {/* Filter + chart-type toggles */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
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
        <div className="flex gap-0.5 p-0.5 bg-muted/40 rounded-lg w-fit">
          {([{ key: 'area', label: 'Area' }, { key: 'line', label: 'Line' }] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setChartType(t.key)}
              className={cn(
                'px-3.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
                chartType === t.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ChartZoomModal title="Win Probability" renderChart={(height) => (
        <>
          <ResponsiveContainer width="100%" height={height}>
            {chartType === 'area' ? (
              <AreaChart data={indexedData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                {axisChildren}
                {(filter === 'both' || filter === 'team1') && (
                  <Area
                    type="monotone"
                    dataKey="team1"
                    stackId="wp"
                    stroke={TEAM1_COLOR}
                    strokeWidth={2}
                    fill={TEAM1_COLOR}
                    fillOpacity={0.5}
                    dot={wicketDot(TEAM1_COLOR, 'isTeam1Wicket', 't1')}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: TEAM1_COLOR, fill: 'hsl(var(--card))' }}
                  />
                )}
                {hasDrawSeries && filter === 'both' && (
                  <Area
                    type="monotone"
                    dataKey="draw"
                    stackId="wp"
                    stroke={DRAW_COLOR}
                    strokeWidth={1.5}
                    fill={DRAW_COLOR}
                    fillOpacity={0.45}
                    dot={false}
                  />
                )}
                {(filter === 'both' || filter === 'team2') && (
                  <Area
                    type="monotone"
                    dataKey="team2"
                    stackId="wp"
                    stroke={TEAM2_COLOR}
                    strokeWidth={2}
                    fill={TEAM2_COLOR}
                    fillOpacity={0.5}
                    dot={wicketDot(TEAM2_COLOR, 'isTeam2Wicket', 't2')}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: TEAM2_COLOR, fill: 'hsl(var(--card))' }}
                  />
                )}
              </AreaChart>
            ) : (
              <LineChart data={indexedData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                {axisChildren}
                {(filter === 'both' || filter === 'team1') && (
                  <Line
                    type="monotone"
                    dataKey="team1"
                    stroke={TEAM1_COLOR}
                    strokeWidth={2.5}
                    dot={wicketDot(TEAM1_COLOR, 'isTeam1Wicket', 't1')}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: TEAM1_COLOR, fill: 'hsl(var(--card))' }}
                  />
                )}
                {(filter === 'both' || filter === 'team2') && (
                  <Line
                    type="monotone"
                    dataKey="team2"
                    stroke={TEAM2_COLOR}
                    strokeWidth={2.5}
                    dot={wicketDot(TEAM2_COLOR, 'isTeam2Wicket', 't2')}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: TEAM2_COLOR, fill: 'hsl(var(--card))' }}
                  />
                )}
                {hasDrawSeries && filter === 'both' && (
                  <Line
                    type="monotone"
                    dataKey="draw"
                    stroke={DRAW_COLOR}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: DRAW_COLOR, fill: 'hsl(var(--card))' }}
                  />
                )}
              </LineChart>
            )}
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
        </>
      )} />

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 items-center text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: TEAM1_COLOR }} />
          {data.team1Name}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: TEAM2_COLOR }} />
          {data.team2Name}
        </span>
        {hasDrawSeries && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: DRAW_COLOR }} />
            Draw / Tie
          </span>
        )}
      </div>

      {/* Over-by-over bars */}
      <OverByOverBars data={data} inningsBreakIndex={inningsBreakIndex} team1Color={TEAM1_COLOR} team2Color={TEAM2_COLOR} hasDrawSeries={hasDrawSeries} />
    </div>
  );
}

function OverByOverBars({ data, inningsBreakIndex, team1Color, team2Color, hasDrawSeries }: { data: WinProbHistory; inningsBreakIndex: number; team1Color: string; team2Color: string; hasDrawSeries: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const inn1Points = inningsBreakIndex > 0
    ? data.points.slice(0, inningsBreakIndex)
    : data.points;
  const inn2Points = inningsBreakIndex > 0
    ? data.points.slice(inningsBreakIndex)
    : [];

  // Rebase 2nd-innings overs to 1-based per-innings numbering
  const inn1LastOver = inn1Points.length > 0 ? inn1Points[inn1Points.length - 1].over : 0;
  const inn1WithDisplay = inn1Points.map(p => ({ ...p, displayOver: p.over }));
  const inn2WithDisplay = inn2Points.map(p => ({ ...p, displayOver: p.over - inn1LastOver }));

  const inn1Sorted = [...inn1WithDisplay].sort((a, b) => b.displayOver - a.displayOver);
  const inn2Sorted = [...inn2WithDisplay].sort((a, b) => b.displayOver - a.displayOver);

  return (
    <div data-hide-in-share className="rounded-xl border border-border/60 overflow-hidden">
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
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team1Color }} />
              {data.team1Name}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team2Color }} />
              {data.team2Name}
            </span>
            {hasDrawSeries && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DRAW_COLOR }} />
                Draw / Tie
              </span>
            )}
          </div>

          {inn1Sorted.length > 0 && (
            <InningsSection
              title={`${data.team1Name} (1st Innings)`}
              points={inn1Sorted}
              team1Color={team1Color}
              team2Color={team2Color}
              hasDrawSeries={hasDrawSeries}
            />
          )}
          {inn2Sorted.length > 0 && (
            <InningsSection
              title={`${data.team2Name} (2nd Innings)`}
              points={inn2Sorted}
              team1Color={team1Color}
              team2Color={team2Color}
              hasDrawSeries={hasDrawSeries}
            />
          )}
        </div>
      )}
    </div>
  );
}

function InningsSection({ title, points, team1Color, team2Color, hasDrawSeries }: {
  title: string; points: any[]; team1Color: string; team2Color: string; hasDrawSeries: boolean;
}) {
  return (
    <div>
      <div className="bg-muted/20 text-muted-foreground px-4 py-1.5 text-[11px] font-medium tracking-wide">
        {title}
      </div>
      <div className="px-4 py-2 space-y-0.5">
        {points.map(p => {
          const drawProb = (p.drawProb ?? 0);
          const showDraw = hasDrawSeries && drawProb > 0;
          // Leader picked from the three series so the color stays meaningful for Tests too.
          const maxProb = Math.max(p.team1Prob, p.team2Prob, drawProb);
          const leader: 'team1' | 'team2' | 'draw' =
            maxProb === drawProb && showDraw ? 'draw' :
              p.team1Prob >= p.team2Prob ? 'team1' : 'team2';

          return (
            <div
              key={`${p.innings}-${p.over}`}
              className="flex items-center gap-2 py-1 group hover:bg-muted/10 rounded -mx-1 px-1 transition-colors"
            >
              <span className="w-6 text-[11px] text-muted-foreground tabular-nums text-right shrink-0 font-medium">
                {p.displayOver}
              </span>

              {/* Team 1 percentage */}
              <span
                className="w-8 text-[11px] tabular-nums text-right shrink-0 font-semibold"
                style={{ color: leader === 'team1' ? team1Color : 'hsl(var(--muted-foreground))' }}
              >
                {p.team1Prob}%
              </span>

              {/* Bar (3 segments when draw probability is present) */}
              <div className="flex-1 flex items-center h-2 gap-px">
                <div
                  className="h-full rounded-l-sm transition-all"
                  style={{ width: `${p.team1Prob}%`, backgroundColor: team1Color, opacity: leader === 'team1' ? 1 : 0.4 }}
                />
                {showDraw && (
                  <div
                    className="h-full transition-all"
                    style={{ width: `${drawProb}%`, backgroundColor: DRAW_COLOR, opacity: leader === 'draw' ? 1 : 0.4 }}
                  />
                )}
                <div
                  className="h-full rounded-r-sm transition-all"
                  style={{ width: `${p.team2Prob}%`, backgroundColor: team2Color, opacity: leader === 'team2' ? 1 : 0.4 }}
                />
              </div>

              {/* Draw % (only when relevant) */}
              {showDraw && (
                <span
                  className="w-8 text-[11px] tabular-nums text-center shrink-0 font-semibold"
                  style={{ color: leader === 'draw' ? DRAW_COLOR : 'hsl(var(--muted-foreground))' }}
                  title="Draw / Tie probability"
                >
                  {drawProb}%
                </span>
              )}

              {/* Team 2 percentage */}
              <span
                className="w-8 text-[11px] tabular-nums shrink-0 font-semibold"
                style={{ color: leader === 'team2' ? team2Color : 'hsl(var(--muted-foreground))' }}
              >
                {p.team2Prob}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WinProbTooltip({ active, payload, team1, team2, hasDrawSeries, coordinate }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const showDraw = hasDrawSeries && (d.draw ?? 0) > 0;

  // Flip tooltip to the left of the cursor when it's hovering near the right
  // half of the viewport so the card never clips off the right edge on mobile.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const flipLeft = coordinate && coordinate.x > vw / 2;
  const flipStyle = flipLeft ? { transform: 'translateX(calc(-100% + 8px))' } : undefined;

  return (
    <div
      style={flipStyle}
      className="bg-card text-card-foreground rounded-xl text-xs shadow-2xl border border-border/80 overflow-hidden w-[min(calc(100vw-3rem),260px)] break-words"
    >
      {/* Header */}
      <div className="px-3 py-2 bg-muted/30 border-b border-border/30">
        <p className="font-semibold text-foreground text-[11px]">
          {d.innings === 2 ? '2nd Inn' : '1st Inn'} · Over {d.displayOver ?? d.over} | {team1}: {d.team1}% {'\u2022'} {team2}: {d.team2}%
          {showDraw && <> {'•'} Draw: {d.draw}%</>}
        </p>
      </div>
      {/* Wicket commentary */}
      {d.wicketCommentary && (() => {
        const text = d.wicketCommentary as string;
        // Split: "Over X.YBowler to Batter, out Description. Batter c Fielder b Bowler score"
        const overMatch = text.match(/^(Over \d+\.\d+)/);
        const overBall = overMatch ? overMatch[1] : '';
        const rest = overMatch ? text.substring(overMatch[0].length) : text;
        // Find dismissal scorecard line at the end (e.g., "Mitchell Marsh c Shubman Gill b Kagiso Rabada 11(4) [4s-1 6s-1]")
        const scorecardMatch = rest.match(/([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s+[clbr]\w?\s.+\d+\(\d+\)\s*\[.*\])\s*$/);
        const scorecard = scorecardMatch ? scorecardMatch[1].trim() : '';
        const description = scorecardMatch ? rest.substring(0, rest.indexOf(scorecard)).trim() : rest.trim();

        return (
          <div className="px-3 py-2 space-y-1.5">
            {overBall && (
              <p className="text-[11px] font-bold text-foreground">{overBall}</p>
            )}
            {description && (
              <p className="text-[10px] text-foreground/60 leading-relaxed">
                {(() => {
                  // Extract bowler and batsman from "Bowler to Batsman, ..." pattern
                  const nameMatch = description.match(/^([A-Z][a-zA-Z\s'-]+?)\s+to\s+([A-Z][a-zA-Z\s'-]+?),/);
                  if (!nameMatch) return description;
                  const bowler = nameMatch[1].trim();
                  const batsman = nameMatch[2].trim();
                  // Split text by player names and bold them
                  const parts: (string | JSX.Element)[] = [];
                  let key = 0;
                  const regex = new RegExp(`(${bowler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${batsman.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
                  let match: RegExpExecArray | null;
                  let lastIndex = 0;
                  while ((match = regex.exec(description)) !== null) {
                    if (match.index > lastIndex) {
                      parts.push(description.slice(lastIndex, match.index));
                    }
                    parts.push(<strong key={key++} className="text-foreground font-semibold">{match[1]}</strong>);
                    lastIndex = regex.lastIndex;
                  }
                  if (lastIndex < description.length) {
                    parts.push(description.slice(lastIndex));
                  }
                  return parts;
                })()}
              </p>
            )}
            {scorecard && (
              <p className="text-[10px] font-semibold text-foreground pt-1 border-t border-border/20">{scorecard}</p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
