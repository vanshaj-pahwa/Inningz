'use client';

import type { BallMapData } from '@/app/actions';
import { cn } from '@/lib/utils';

interface BallMapProps {
  data: BallMapData;
}

function getBallStyle(label: string, event: string): { bg: string; text: string; glow?: string } {
  const e = event.toUpperCase();
  if (e.includes('WICKET')) return { bg: 'bg-red-500', text: 'text-white', glow: 'shadow-red-500/30 shadow-sm' };
  if (label === '6' || e.includes('SIX')) return { bg: 'bg-violet-500', text: 'text-white', glow: 'shadow-violet-500/30 shadow-sm' };
  if (label === '4' || e.includes('FOUR')) return { bg: 'bg-blue-500', text: 'text-white', glow: 'shadow-blue-500/25 shadow-sm' };
  if (label === 'Wd' || label === 'Nb') return { bg: 'bg-amber-500/90', text: 'text-white' };
  if (label === '0' || label === '\u2022') return { bg: 'bg-muted', text: 'text-muted-foreground/60' };
  if (/^\d+$/.test(label)) return { bg: 'bg-emerald-500/80', text: 'text-white' };
  return { bg: 'bg-muted', text: 'text-muted-foreground/60' };
}

export default function BallMap({ data }: BallMapProps) {
  const overs = new Map<number, typeof data.balls>();
  for (const ball of data.balls) {
    const overNum = Math.floor(ball.overNum);
    if (!overs.has(overNum)) overs.set(overNum, []);
    overs.get(overNum)!.push(ball);
  }

  const sortedOvers = Array.from(overs.entries()).sort(([a], [b]) => a - b);

  return (
    <div className="space-y-5">
      {/* Score header */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-display text-foreground tabular-nums">{data.scoreDetails.runs}-{data.scoreDetails.wickets}</span>
        <span className="text-sm text-muted-foreground">{data.scoreDetails.overs} overs</span>
      </div>

      {/* Ball grid */}
      <div className="space-y-1">
        {sortedOvers.map(([overNum, balls]) => (
          <div key={overNum} className="flex items-start gap-2 group min-w-0">
            <span className="w-6 md:w-7 text-[11px] text-muted-foreground/70 text-right shrink-0 tabular-nums font-medium group-hover:text-foreground transition-colors pt-1.5">
              {overNum + 1}
            </span>
            <div className="flex flex-wrap gap-1 min-w-0">
              {balls.map((ball, idx) => {
                const style = getBallStyle(ball.ballLabel, ball.event);
                return (
                  <div
                    key={idx}
                    className={cn(
                      'w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg text-[11px] font-bold flex items-center justify-center transition-transform hover:scale-110',
                      style.bg, style.text, style.glow
                    )}
                    title={`${ball.overNum} - ${ball.ballLabel} (${ball.event})`}
                  >
                    {ball.ballLabel === '\u2022' ? '\u2022' : ball.ballLabel}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground pt-3 border-t border-border/40">
        {[
          { label: 'Dot', cls: 'bg-muted' },
          { label: 'Runs', cls: 'bg-emerald-500/80' },
          { label: 'Four', cls: 'bg-blue-500' },
          { label: 'Six', cls: 'bg-violet-500' },
          { label: 'Wicket', cls: 'bg-red-500' },
          { label: 'Extra', cls: 'bg-amber-500/90' },
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-[3px] inline-block', item.cls)} />
            {item.label}
          </span>
        ))}
      </div>

      {/* Batters & Bowlers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {data.batters.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Batters</p>
            <div className="space-y-0.5">
              {data.batters.map(b => (
                <div key={b.batId} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                  <span className="text-foreground/90">{b.batName}</span>
                  <div className="flex items-center gap-2 tabular-nums text-muted-foreground">
                    <span className="font-semibold text-foreground">{b.runs}</span>
                    <span className="text-[10px]">({b.balls})</span>
                    <span className="text-[10px] text-muted-foreground/60">SR {b.strikeRate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.bowlers.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Bowlers</p>
            <div className="space-y-0.5">
              {data.bowlers.map(b => (
                <div key={b.bowlerId} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                  <span className="text-foreground/90">{b.bowlName}</span>
                  <div className="flex items-center gap-2 tabular-nums text-muted-foreground">
                    <span className="font-semibold text-foreground">{b.wickets}-{b.runs}</span>
                    <span className="text-[10px]">({b.overs} ov)</span>
                    <span className="text-[10px] text-muted-foreground/60">Eco {b.economy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
