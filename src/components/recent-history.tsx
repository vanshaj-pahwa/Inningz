'use client';

import { useRecentHistoryContext } from '@/contexts/recent-history-context';
import type { RecentItem } from '@/hooks/use-recent-history';
import { useRouter } from 'next/navigation';
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
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-foreground">
          Recent
        </h3>
        <button
          onClick={clearHistory}
          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Horizontal scroll list */}
      <div className="flex gap-2 overflow-x-auto pt-1 pb-1 scrollbar-hide -mx-4 px-4">
        {history.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="group flex-shrink-0 relative"
          >
            <button
              onClick={() => handleItemClick(item)}
              title={item.subtitle ? `${item.title} - ${item.subtitle}` : item.title}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all',
                'bg-card/60 border-border hover:border-primary/30 hover:bg-muted/80',
                'min-w-[150px] max-w-[260px]'
              )}
            >
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {item.subtitle}
                  </p>
                )}
              </div>
            </button>

            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeItem(item.id, item.type);
              }}
              className={cn(
                'absolute -top-1.5 -right-1.5 p-0.5 rounded-full z-10',
                'bg-muted border border-border',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                'hover:bg-destructive hover:border-destructive'
              )}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
