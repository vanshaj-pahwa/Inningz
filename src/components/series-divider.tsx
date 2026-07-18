'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { buildSeriesHref } from '@/lib/utils';

// The series-name divider above a group of match cards. Links to the series page
// when we can resolve its id, otherwise renders as plain text.
export default function SeriesDivider({ name, seriesUrl }: { name: string; seriesUrl?: string }) {
  const href = buildSeriesHref(name, seriesUrl);

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1 bg-border" />
      {href ? (
        <Link
          href={href}
          className="group flex items-center gap-1 px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {name}
          <ChevronRight className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
        </Link>
      ) : (
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">{name}</h3>
      )}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
