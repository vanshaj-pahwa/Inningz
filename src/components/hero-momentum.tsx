'use client';

import { useState } from 'react';

export interface OverPoint {
  overNumber: number;
  runs: number;
  wickets: number;
  wicketFell: boolean;
}

// A compact runs-per-over sparkline for the live score hero. Controlled: the
// parent (scraper) owns the over data so the same data feeds the share card.
// `overs === null` means still loading (show a skeleton); a short array renders
// nothing until there are enough points to draw a line.
export default function HeroMomentum({ overs, accent }: { overs: OverPoint[] | null; accent?: string }) {
  if (overs === null) {
    return (
      <div className="flex flex-col justify-end gap-2 min-w-0 w-full lg:flex-1 lg:max-w-sm">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Runs per over</span>
        <div className="skeleton h-14 w-full rounded-md" />
      </div>
    );
  }
  if (overs.length < 2) return null;
  return <MomentumSparkline overs={overs} accent={accent} />;
}

function MomentumSparkline({ overs, accent }: { overs: OverPoint[]; accent?: string }) {
  const [hover, setHover] = useState<number | null>(null);

  const recent = overs.slice(-18);
  const max = Math.max(...recent.map((o) => o.runs), 6);

  // Sparkline geometry in viewBox units; the SVG scales to the container width.
  const W = 260;
  const H = 56;
  const padY = 5;
  const x = (i: number) => (recent.length === 1 ? W : (i / (recent.length - 1)) * W);
  const y = (v: number) => H - padY - (v / max) * (H - padY * 2);

  const linePath = recent.map((o, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(o.runs).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const hv = hover !== null ? recent[hover] : null;

  return (
    <div className="flex flex-col justify-end gap-2 min-w-0 w-full lg:flex-1 lg:max-w-sm">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Runs per over</span>
      <div className="relative w-full h-14">
        {hv && (() => {
          const leftPct = (x(hover!) / W) * 100;
          const tx = leftPct > 72 ? 'translateX(-100%)' : leftPct < 28 ? 'translateX(0)' : 'translateX(-50%)';
          return (
            <div
              className="absolute z-10 pointer-events-none"
              style={{ left: `${leftPct}%`, top: `${(y(hv.runs) / H) * 100}%`, transform: `${tx} translateY(-100%)` }}
            >
              <div className="mb-1.5 rounded-lg bg-card border border-border/80 shadow-lg px-2 py-1 text-[11px] whitespace-nowrap">
                <span className="text-muted-foreground">Over {hv.overNumber}</span>
                {' · '}
                <span className="font-semibold text-foreground tabular-nums">{hv.runs} run{hv.runs === 1 ? '' : 's'}</span>
                {hv.wicketFell && <span className="text-red-400 font-semibold"> · W</span>}
              </div>
            </div>
          );
        })()}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <path d={areaPath} className={accent ? '' : 'fill-amber-400/15'} style={accent ? { fill: `${accent}26` } : undefined} />
          <path
            d={linePath}
            className={accent ? 'fill-none' : 'fill-none stroke-amber-400'}
            style={accent ? { stroke: accent } : undefined}
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {recent.map((o, i) =>
            o.wicketFell ? (
              <circle key={`w-${o.overNumber}`} cx={x(i)} cy={y(o.runs)} r={2.6} className="fill-red-500 stroke-background pointer-events-none" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ) : null
          )}
          {hv && (
            <circle cx={x(hover!)} cy={y(hv.runs)} r={3} className={accent ? 'stroke-background pointer-events-none' : 'fill-amber-300 stroke-background pointer-events-none'} style={accent ? { fill: accent } : undefined} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          )}
          {recent.map((o, i) => {
            const left = i === 0 ? 0 : (x(i - 1) + x(i)) / 2;
            const right = i === recent.length - 1 ? W : (x(i) + x(i + 1)) / 2;
            return (
              <rect
                key={`h-${o.overNumber}`}
                x={left}
                y={0}
                width={Math.max(0, right - left)}
                height={H}
                className="fill-transparent cursor-pointer"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
