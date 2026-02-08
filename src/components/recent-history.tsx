'use client';

import { useRecentHistoryContext } from '@/contexts/recent-history-context';
import type { RecentItem } from '@/hooks/use-recent-history';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, X, Trash2, ChevronRight, Tv, Trophy, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RecentHistoryProps {
  onPlayerClick?: (profileId: string, playerName: string) => void;
  className?: string;
}

const typeIcons = {
  match: Tv,
  series: Trophy,
  player: User,
};

const typeColors = {
  match: 'text-red-400',
  series: 'text-amber-400',
  player: 'text-blue-400',
};

const typeBgColors = {
  match: 'bg-red-500/10',
  series: 'bg-amber-500/10',
  player: 'bg-blue-500/10',
};

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

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className={cn('', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recent
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>

      {/* Horizontal scroll list */}
      <div className="flex gap-3 overflow-x-auto pt-2 pb-2 scrollbar-hide -mx-4 px-4">
        {history.map((item) => {
          const Icon = typeIcons[item.type];

          return (
            <div
              key={`${item.type}-${item.id}`}
              className="group flex-shrink-0 relative"
            >
              <button
                onClick={() => handleItemClick(item)}
                title={item.subtitle ? `${item.title} - ${item.subtitle}` : item.title}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all',
                  'bg-card/60 border-border hover:border-border hover:bg-muted/80',
                  'min-w-[160px] max-w-[260px]'
                )}
              >
                <div className={cn('p-1.5 rounded-lg shrink-0', typeBgColors[item.type])}>
                  <Icon className={cn('w-3.5 h-3.5', typeColors[item.type])} />
                </div>
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
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(item.id, item.type);
                }}
                className={cn(
                  'absolute -top-2 -right-2 p-1 rounded-full z-10',
                  'bg-muted border border-border',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  'hover:bg-destructive hover:border-destructive'
                )}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
