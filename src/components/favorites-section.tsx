'use client';

import { useDashboardPreferences } from '@/contexts/dashboard-preferences-context';
import type { FavoriteItem } from '@/types/dashboard-preferences';
import Link from 'next/link';
import { Star, X, ChevronRight, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FavoritesSectionProps {
  className?: string;
}

export default function FavoritesSection({ className }: FavoritesSectionProps) {
  const { preferences, removeFavorite } = useDashboardPreferences();
  const { favorites } = preferences;

  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className={cn('', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 md:mb-3">
        <div className="p-1 md:p-1.5 rounded-lg bg-amber-500/10">
          <Star className="w-3.5 md:w-4 h-3.5 md:h-4 text-amber-400 fill-amber-400" />
        </div>
        <h3 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Favorites
        </h3>
      </div>

      {/* Horizontal scroll list */}
      <div className="flex gap-2 md:gap-3 overflow-x-auto pt-2 pb-2 scrollbar-hide -mx-4 px-4">
        {favorites.map((item) => (
          <FavoriteCard key={item.id} item={item} onRemove={removeFavorite} />
        ))}
      </div>
    </div>
  );
}

function FavoriteCard({
  item,
  onRemove,
}: {
  item: FavoriteItem;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="group flex-shrink-0 relative">
      <Link
        href={`/series/${item.id}`}
        title={item.subtitle ? `${item.name} - ${item.subtitle}` : item.name}
        className={cn(
          'flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl border transition-all',
          'bg-card/60 border-border hover:border-amber-500/50 hover:bg-muted/80',
          'min-w-[140px] md:min-w-[160px] max-w-[220px] md:max-w-[260px]'
        )}
      >
        <div className="p-1 md:p-1.5 rounded-md md:rounded-lg bg-amber-500/10 shrink-0">
          <Trophy className="w-3 md:w-3.5 h-3 md:h-3.5 text-amber-400" />
        </div>
        <div className="flex-1 text-left overflow-hidden">
          <p className="text-[13px] md:text-sm font-medium text-foreground truncate">
            {item.name}
          </p>
          {item.subtitle && (
            <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">
              {item.subtitle}
            </p>
          )}
        </div>
        <ChevronRight className="w-3 md:w-3.5 h-3 md:h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
      </Link>

      {/* Remove button - always visible on mobile for touch */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(item.id);
        }}
        className={cn(
          'absolute -top-1.5 md:-top-2 -right-1.5 md:-right-2 p-0.5 md:p-1 rounded-full z-10',
          'bg-muted border border-border',
          'md:opacity-0 md:group-hover:opacity-100 transition-opacity',
          'hover:bg-destructive hover:border-destructive'
        )}
      >
        <X className="w-2 md:w-2.5 h-2 md:h-2.5" />
      </button>
    </div>
  );
}
