'use client';

import { useDashboardPreferences } from '@/contexts/dashboard-preferences-context';
import type { FavoriteItem } from '@/types/dashboard-preferences';
import Link from 'next/link';
import { X } from 'lucide-react';
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
      <div className="mb-2 md:mb-3">
        <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-foreground">
          Following
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
          'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all',
          'bg-card/60 border-border hover:border-primary/30 hover:bg-muted/80',
          'min-w-[150px] max-w-[260px]'
        )}
      >
        <div className="flex-1 text-left overflow-hidden">
          <p className="text-sm font-medium text-foreground truncate">
            {item.name}
          </p>
          {item.subtitle && (
            <p className="text-[10px] text-muted-foreground truncate">
              {item.subtitle}
            </p>
          )}
        </div>
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
