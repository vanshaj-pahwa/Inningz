'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  href?: string;
}

// Ancestor trail for deep screens (match / series). The current page stays the <h1>;
// these are the tappable parents so a deep-linked user can climb back up.
export default function Breadcrumbs({ items, className = '' }: { items: Crumb[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1 text-[11px] md:text-xs text-muted-foreground min-w-0 ${className}`}>
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1 min-w-0">
          {i > 0 && <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />}
          {c.href ? (
            <Link href={c.href} className="hover:text-foreground transition-colors truncate">
              {c.label}
            </Link>
          ) : (
            <span className="text-foreground/80 truncate" aria-current="page">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
