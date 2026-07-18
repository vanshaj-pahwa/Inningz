'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Flame, History, Calendar, Trophy, Home as HomeIcon } from 'lucide-react';

const items = [
  { label: 'Home', icon: HomeIcon, tab: null as string | null },
  { label: 'Live', icon: Flame, tab: 'live' },
  { label: 'Recent', icon: History, tab: 'recent' },
  { label: 'Upcoming', icon: Calendar, tab: 'upcoming' },
  { label: 'Series', icon: Trophy, tab: 'series' },
];

// Persistent, thumb-reachable primary nav — visible on every route on mobile.
export default function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const onHome = pathname === '/';

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-nav pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex max-w-md mx-auto">
        {items.map((it) => {
          const active = onHome && (it.tab ? tab === it.tab : !tab);
          const href = it.tab ? `/?tab=${it.tab}` : '/';
          const Icon = it.icon;
          return (
            <Link
              key={it.label}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
