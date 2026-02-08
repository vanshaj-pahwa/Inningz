'use client';

import { useRouter } from 'next/navigation';
import { useMatches } from '@/contexts/matches-context';
import { useSwipe } from '@/hooks/use-swipe';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeNavIndicatorProps {
  currentMatchId: string;
}

export default function SwipeNavIndicator({ currentMatchId }: SwipeNavIndicatorProps) {
  const router = useRouter();
  const { getAdjacentMatches, liveMatches } = useMatches();
  const { prev, next } = getAdjacentMatches(currentMatchId);

  const { swiping, swipeDirection, swipeProgress } = useSwipe({
    onSwipeLeft: () => {
      if (next) {
        router.push(`/match/${next.matchId}`);
      }
    },
    onSwipeRight: () => {
      if (prev) {
        router.push(`/match/${prev.matchId}`);
      }
    },
    threshold: 80,
    enabled: liveMatches.length > 1,
  });

  // Find current position
  const currentIndex = liveMatches.findIndex((m) => m.matchId === currentMatchId);
  const totalMatches = liveMatches.length;

  if (totalMatches <= 1) return null;

  return (
    <>
      {/* Match position indicator */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border">
          {liveMatches.map((match, idx) => (
            <button
              key={match.matchId}
              onClick={() => router.push(`/match/${match.matchId}`)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                idx === currentIndex
                  ? 'w-6 bg-primary'
                  : 'bg-muted-foreground/50 hover:bg-muted-foreground/70'
              )}
              aria-label={`Go to ${match.title}`}
            />
          ))}
        </div>
      </div>

      {/* Swipe indicators on edges */}
      {swiping && swipeDirection === 'right' && prev && (
        <div
          className="fixed left-0 top-0 bottom-0 w-16 z-50 flex items-center justify-center pointer-events-none"
          style={{ opacity: swipeProgress }}
        >
          <div className="bg-primary/20 backdrop-blur-sm rounded-r-2xl h-32 w-12 flex items-center justify-center">
            <ChevronLeft className="w-6 h-6 text-primary" />
          </div>
        </div>
      )}

      {swiping && swipeDirection === 'left' && next && (
        <div
          className="fixed right-0 top-0 bottom-0 w-16 z-50 flex items-center justify-center pointer-events-none"
          style={{ opacity: swipeProgress }}
        >
          <div className="bg-primary/20 backdrop-blur-sm rounded-l-2xl h-32 w-12 flex items-center justify-center">
            <ChevronRight className="w-6 h-6 text-primary" />
          </div>
        </div>
      )}

      {/* Navigation hints at bottom */}
      <div className="fixed bottom-4 left-4 right-4 z-40 flex justify-between pointer-events-none">
        {prev && (
          <button
            onClick={() => router.push(`/match/${prev.matchId}`)}
            className="pointer-events-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-card/80 backdrop-blur-sm border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            <span className="max-w-[80px] truncate">{prev.teams[0]?.name?.split(' ')[0]}</span>
          </button>
        )}
        <div className="flex-1" />
        {next && (
          <button
            onClick={() => router.push(`/match/${next.matchId}`)}
            className="pointer-events-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-card/80 backdrop-blur-sm border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="max-w-[80px] truncate">{next.teams[0]?.name?.split(' ')[0]}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </>
  );
}
