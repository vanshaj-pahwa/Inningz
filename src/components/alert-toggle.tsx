'use client';

import { Bell, BellOff } from 'lucide-react';
import { useMatchAlerts } from '@/contexts/match-alerts-context';
import { cn } from '@/lib/utils';

export function AlertToggle({ className }: { className?: string }) {
  const { enabled, toggleAlerts } = useMatchAlerts();

  return (
    <button
      onClick={toggleAlerts}
      className={cn(
        'relative flex items-center justify-center h-9 w-9 rounded-xl border border-border transition-colors',
        enabled
          ? 'bg-primary/15 text-primary border-primary/40'
          : 'bg-muted/50 hover:bg-muted text-muted-foreground',
        className
      )}
      aria-label={enabled ? 'Disable match alerts' : 'Enable match alerts'}
      title={enabled ? 'Match alerts on' : 'Match alerts off'}
    >
      {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
      {enabled && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500" />
      )}
    </button>
  );
}
