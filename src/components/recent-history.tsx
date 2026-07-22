'use client';

import { useRecentHistoryContext } from '@/contexts/recent-history-context';
import type { RecentItem } from '@/hooks/use-recent-history';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecentHistoryProps {
  onPlayerClick?: (profileId: string, playerName: string) => void;
  className?: string;
}

export default function RecentHistory({ onPlayerClick, className }: RecentHistoryProps) {
  const { history, removeItem, clearHistory } = useRecentHistoryContext();
  const router = useRouter();

  if (history.length === 0) {
    return null;
  }

  const handleItemClick = (item: RecentItem) => {
    if (item.type === 'player' && onPlayerClick) {
      onPlayerClick(item.id, item.title);
    } else if (item.type === 'match') {
      router.push(`/match/${item.id}`);
    } else if (item.type === 'series') {
      router.push(`/series/${item.id}`);
    }
  };

  return (
    <div className={cn('', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-foreground">
          Recently Viewed
        </h3>
        <button
          onClick={clearHistory}
          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Horizontal scroll list — mirrors FavoritesSection */}
      <div className="flex gap-2 md:gap-3 overflow-x-auto pt-2 pb-2 scrollbar-hide -mx-4 px-4">
        <AnimatePresence mode="popLayout" initial={false}>
        {history.map((item) => (
          <motion.div
            key={`${item.type}-${item.id}`}
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="group flex-shrink-0 relative"
          >
            <button
              onClick={() => handleItemClick(item)}
              title={item.subtitle ? `${item.title} - ${item.subtitle}` : item.title}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all',
                'bg-card/60 border-border hover:border-primary/30 hover:bg-muted/80',
                'w-[240px] h-[52px]'
              )}
            >
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate leading-tight">
                  {item.title}
                </p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                  {item.subtitle || (item.type === 'series' ? 'Series' : item.type === 'player' ? 'Player' : 'Match')}
                </p>
              </div>
            </button>

            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeItem(item.id, item.type);
              }}
              aria-label="Remove from recently viewed"
              className={cn(
                'absolute -top-1.5 md:-top-2 -right-1.5 md:-right-2 p-1 rounded-full z-10',
                'bg-muted border border-border',
                'md:opacity-0 md:group-hover:opacity-100 transition-opacity',
                'hover:bg-destructive hover:border-destructive',
                'before:absolute before:-inset-2 before:content-[""]'
              )}
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
