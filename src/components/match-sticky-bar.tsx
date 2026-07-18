'use client';

import { useEffect, useRef, useState } from 'react';
import AnimatedScore from './animated-score';

interface MatchStickyBarProps<V extends string> {
  views: V[];
  view: V;
  onSelect: (v: V) => void;
  labels: Record<V, string>;
  score?: string;
  currentRunRate?: string;
  requiredRunRate?: string;
  /** Live status / chase equation, e.g. "Somerset need 87 runs in 78 balls". */
  status?: string;
  live?: boolean;
  hasHero: boolean;
  heroRef: React.RefObject<HTMLDivElement | null>;
}

// Sticky Match header: pinned tabs + a non-dismissible compact scoreboard. The score reveals
// once the hero scrolls behind the bar, and stays visible on non-Live tabs.
export default function MatchStickyBar<V extends string>({
  views,
  view,
  onSelect,
  labels,
  score,
  currentRunRate,
  requiredRunRate,
  status,
  live,
  hasHero,
  heroRef,
}: MatchStickyBarProps<V>) {
  const [showScore, setShowScore] = useState(!hasHero);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasHero) {
      setShowScore(true);
      return;
    }
    const update = () => {
      rafRef.current = null;
      const el = heroRef.current;
      if (!el) {
        setShowScore(true);
        return;
      }
      setShowScore(el.getBoundingClientRect().bottom < 52);
    };
    const onScroll = () => {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [hasHero, heroRef, view]);

  return (
    <div className="md:hidden sticky top-0 z-40 -mx-2 px-2 glass-header border-b border-border/60">
      {showScore && score && (
        <div className="pt-2 pb-1.5 animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none">
          <div className="flex items-center justify-between gap-2">
            <AnimatedScore
              value={score}
              className="text-sm font-display font-bold stat-amber tabular-nums truncate min-w-0"
            />
            <div className="flex items-center gap-2 shrink-0">
              {currentRunRate && (
                <span className="text-[11px] font-mono font-semibold text-cyan-400 tracking-wide">
                  CRR {currentRunRate}
                </span>
              )}
              {requiredRunRate && (
                <span className="text-[11px] font-mono font-semibold text-orange-400 tracking-wide">
                  REQ {requiredRunRate}
                </span>
              )}
            </div>
          </div>
          {live && status && (
            <p className="text-[11px] font-medium text-foreground/80 truncate mt-1">{status}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-0.5 tab-container my-2">
        {views.map((v) => (
          <button
            key={v}
            onClick={() => onSelect(v)}
            aria-current={view === v ? 'page' : undefined}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 text-center ${
              view === v
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {labels[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
