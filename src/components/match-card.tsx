'use client';

import Link from 'next/link';
import { formatScore } from '@/lib/utils';
import type { LiveMatch } from '@/app/actions';

const CATEGORY_DOT: Record<string, string> = {
  international: 'bg-blue-500',
  league: 'bg-purple-500',
  domestic: 'bg-orange-500',
  women: 'bg-pink-500',
};
const CATEGORY_TEXT: Record<string, string> = {
  international: 'text-blue-400',
  league: 'text-purple-400',
  domestic: 'text-orange-400',
  women: 'text-pink-400',
};

function getCategory(match: LiveMatch): string {
  if (match.matchType) return match.matchType.toLowerCase();
  const s = `${match.title} ${match.seriesName || ''}`.toLowerCase();
  if (s.includes('women')) return 'women';
  if (/ipl|bbl|psl|cpl|league/.test(s)) return 'league';
  if (/test|odi|t20i|international|world cup|icc/.test(s)) return 'international';
  return 'domestic';
}

function isCompleteStatus(status: string) {
  return /won|drawn|tied|no result|abandoned|complete/.test(status);
}
function isLiveStatus(status: string) {
  if (!status || isCompleteStatus(status)) return false;
  return !/scheduled|preview|status not available|starts/.test(status);
}

// Single match card used on both the Home dashboard and the Live/Recent tabs.
// `header` chooses the top label: 'category' (when the list is grouped by series)
// or 'series' (when it isn't).
export default function MatchCard({
  match,
  header = 'series',
}: {
  match: LiveMatch;
  header?: 'series' | 'category' | 'none';
}) {
  const status = match.status?.toLowerCase() ?? '';
  const live = isLiveStatus(status);
  const complete = isCompleteStatus(status);
  const category = getCategory(match);
  const showLabel = header !== 'none';

  return (
    <Link href={`/match/${match.matchId}`} className="block h-full">
      <div className={`surface-card card-hover p-4 md:p-5 h-full ${live ? 'ring-1 ring-red-500/20' : ''}`}>
        {(showLabel || live) && (
          <div className="flex items-center justify-between gap-2 mb-3 md:mb-4">
            {header === 'category' ? (
              <span className="flex items-center gap-1.5 text-xs font-medium min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${CATEGORY_DOT[category] ?? ''}`} />
                <span className={`truncate ${CATEGORY_TEXT[category] ?? 'text-muted-foreground'}`}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </span>
              </span>
            ) : header === 'series' ? (
              <p className="text-[10px] md:text-xs text-muted-foreground truncate min-w-0">
                {match.seriesName || match.title}
              </p>
            ) : (
              <span />
            )}
            {live && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 shrink-0">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
        )}

        <div className="space-y-2 md:space-y-3">
          {match.teams.map((team, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold truncate text-foreground flex-1">{team.name}</span>
              {team.score && (
                <span className="font-display text-base md:text-lg tabular-nums shrink-0 text-foreground">
                  {formatScore(team.score)}
                </span>
              )}
            </div>
          ))}
        </div>

        {match.status && status !== 'status not available' && (
          <div className="mt-3 md:mt-4 pt-2.5 md:pt-3 border-t border-border/50">
            <p className={`text-xs font-medium truncate ${live ? 'text-red-400' : complete ? 'text-amber-400' : 'text-muted-foreground'}`}>
              {match.status}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
