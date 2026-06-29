'use client';

import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { X, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimatedScore from './animated-score';

interface QuickScoreWidgetProps {
  score: string;
  status: string;
  previousInnings?: Array<{
    teamName?: string;
    teamShortName?: string;
    score?: string;
  }>;
  targetRef: React.RefObject<HTMLDivElement | null>;
}

export default function QuickScoreWidget({
  score,
  status,
  previousInnings,
  targetRef,
}: QuickScoreWidgetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (isDismissed) return;

      const target = targetRef.current;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      // Show widget when the score hero is out of view
      setIsVisible(rect.bottom < 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, [targetRef, isDismissed]);

  // GSAP entry: slide + fade up with a soft spring-like ease on mount.
  useEffect(() => {
    if (!isVisible || !widgetRef.current) return;
    const tween = gsap.fromTo(
      widgetRef.current,
      { y: 30, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' }
    );
    return () => { tween.kill(); };
  }, [isVisible]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDismiss = () => {
    if (!widgetRef.current) {
      setIsDismissed(true);
      return;
    }
    gsap.to(widgetRef.current, {
      y: 24,
      opacity: 0,
      scale: 0.96,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => setIsDismissed(true),
    });
  };

  if (!isVisible || isDismissed) return null;

  // Parse score to extract team and runs
  const scoreMatch = score?.match(/^([A-Za-z\s]+?)[\s]+(\d+\/\d+)/);
  const teamName = scoreMatch ? scoreMatch[1].trim() : '';
  const teamScore = scoreMatch ? scoreMatch[2] : score;
  const oversMatch = score?.match(/\(([^)]+)\s*[Oo]v\)/);
  const overs = oversMatch ? oversMatch[1] : '';

  return (
    <div
      ref={widgetRef}
      className={cn('fixed bottom-4 left-4 right-4 z-50 flex justify-center')}
      style={{ opacity: 0 }}
    >
      <div className="flex flex-col gap-1 px-4 py-2.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl shadow-black/40 max-w-md w-full">
        {/* Row 1: Scores and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Previous innings */}
            {previousInnings && previousInnings.length > 0 && (
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-muted-foreground">{previousInnings[0].teamShortName || previousInnings[0].teamName}</span>
                <AnimatedScore
                  value={previousInnings[0].score?.split('(')[0].trim()}
                  className="text-sm font-display font-bold text-muted-foreground"
                />
              </div>
            )}

            {previousInnings && previousInnings.length > 0 && (
              <span className="text-muted-foreground/50">|</span>
            )}

            {/* Current score */}
            <div className="flex items-baseline gap-1">
              {teamName && <span className="text-xs font-semibold text-muted-foreground">{teamName}</span>}
              <AnimatedScore
                value={teamScore}
                className="text-lg font-display font-black text-amber-400 tabular-nums"
              />
              {overs && <span className="text-xs text-muted-foreground tabular-nums">({overs})</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={scrollToTop}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Scroll to top"
            >
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Row 2: Status */}
        {status && (
          <p className="text-[11px] text-muted-foreground truncate">{status}</p>
        )}
      </div>
    </div>
  );
}
