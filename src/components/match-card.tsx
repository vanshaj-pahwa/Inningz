'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { formatScore, formatStartTime, buildVenueHref, buildSeriesHref, buildMatchHref, deriveMatchFormat, displayMatchFormat } from '@/lib/utils';
import { rememberMatchFlags } from '@/lib/team-flags';
import type { LiveMatch } from '@/app/actions';

// Process-wide cache of a flag's two accent colours, keyed by flag URL.
const flagColorCache = new Map<string, string[]>();
// Concurrent-callers dedupe: N cards mounting at once for the same flag share
// a single in-flight fetch instead of firing N identical requests.
const flagColorInFlight = new Map<string, Promise<string[] | null>>();

function fetchFlagColors(url: string): Promise<string[] | null> {
  const cached = flagColorCache.get(url);
  if (cached) return Promise.resolve(cached);
  const inflight = flagColorInFlight.get(url);
  if (inflight) return inflight;
  const p = fetch(`/api/flag-colors?url=${encodeURIComponent(url)}`)
    .then((r) => r.json())
    .then((d: { colors?: string[] }) => {
      const colors = d.colors?.length ? d.colors : null;
      if (colors) flagColorCache.set(url, colors);
      return colors;
    })
    .catch(() => null)
    .finally(() => { flagColorInFlight.delete(url); });
  flagColorInFlight.set(url, p);
  return p;
}

// Colored format badge (T20 / ODI / TEST …) for at-a-glance segregation.
const FORMAT_BADGE: Record<string, string> = {
  T20: 'bg-purple-500/15 text-purple-600 dark:text-purple-300',
  T20I: 'bg-purple-500/15 text-purple-600 dark:text-purple-300',
  T10: 'bg-teal-500/15 text-teal-600 dark:text-teal-300',
  ODI: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
  TEST: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  '100': 'bg-pink-500/15 text-pink-600 dark:text-pink-300',
  'List A': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
};

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

  // Footer line: upcoming matches show their localized start time, everything else
  // shows the scraped status (live state or result).
  const startsAt = formatStartTime(match.startDate);
  const upcoming = !live && !complete && !!startsAt;
  const footer =
    upcoming ? `Starts ${startsAt}`
    : (match.status && status !== 'status not available' ? match.status : null);
  const footerColor =
    live ? 'text-red-500 dark:text-red-400'
    : complete ? 'text-emerald-600 dark:text-emerald-400'
    : upcoming ? 'text-amber-600 dark:text-amber-400'
    : 'text-muted-foreground';
  const venue = match.venue && match.venue !== 'N/A' && match.venue.trim() ? match.venue : null;
  const venueHref = buildVenueHref(match.venueUrl);
  const format = displayMatchFormat(match.matchFormat) || deriveMatchFormat(match.title, match.seriesName);
  const seriesHref = buildSeriesHref(match.seriesName, match.seriesUrl);
  // Leagues/domestic competitions have a points table; bilateral series don't.
  const showTable = category === 'league' || category === 'domestic';

  // On a finished match, emphasise the winner and mute the losing side.
  const winnerName = complete ? match.status?.match(/^(.+?)\s+won\b/i)?.[1]?.trim() : null;
  const isWinner = (teamName: string) => {
    if (!winnerName) return true; // unknown winner -> don't mute either side
    const a = teamName.toLowerCase(), w = winnerName.toLowerCase();
    return a === w || w.includes(a) || a.includes(w);
  };
  const winnerFlag = winnerName
    ? match.teams.find((t) => isWinner(t.name))?.flagUrl ?? null
    : null;

  // Fetch the winner's flag colours (extracted server-side) for a crisp accent.
  const [accent, setAccent] = useState<string[] | null>(winnerFlag ? flagColorCache.get(winnerFlag) ?? null : null);
  useEffect(() => {
    if (!winnerFlag || flagColorCache.has(winnerFlag)) return;
    let cancelled = false;
    fetchFlagColors(winnerFlag).then((colors) => {
      if (cancelled || !colors) return;
      setAccent(colors);
    });
    return () => { cancelled = true; };
  }, [winnerFlag]);
  const hasAccent = !!accent && accent.length >= 2;

  return (
    <div className={`surface-card card-hover px-4 py-3 md:px-5 md:py-3.5 h-full relative ${live ? 'ring-1 ring-red-500/20' : ''}`}>
      {/* Stretched link makes the whole card go to the match, without wrapping the
          venue link (an <a> inside an <a> is invalid). Content is pointer-events-none
          so clicks fall through to this overlay; the venue link re-enables its own. */}
      <Link
        href={buildMatchHref(match.matchId, match.title)}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={match.title || 'Match details'}
        onClick={() => rememberMatchFlags(match.matchId, match.teams)}
      />
      <div className="relative z-[1] pointer-events-none">
        {(showLabel || live || format) && (
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
            <span className="flex items-center gap-1.5 shrink-0">
              {format && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md tracking-wide ${FORMAT_BADGE[format] ?? 'bg-muted text-muted-foreground'}`}>
                  {format}
                </span>
              )}
              {live && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </span>
              )}
            </span>
          </div>
        )}

        {/* min-h-7 keeps score-less (upcoming) rows the same height as
            rows that show scores (recent/live), so cards align. */}
        <div className="space-y-2 md:space-y-3">
          {match.teams.map((team, i) => {
            const winRow = complete && isWinner(team.name) && hasAccent;
            return (
            <div
              key={i}
              className={`flex items-center justify-between gap-3 min-h-7 ${winRow ? 'rounded-lg -mx-2 px-2 py-0.5 ring-1 ring-inset ring-white/5' : ''}`}
              style={winRow ? { background: `linear-gradient(90deg, ${accent![0]}40, ${accent![1]}1f 50%, transparent)` } : undefined}
            >
              <span className="flex items-center gap-2 min-w-0 flex-1">
                {team.flagUrl && (
                  <Image
                    src={team.flagUrl}
                    alt=""
                    width={24}
                    height={18}
                    unoptimized
                    className={`w-6 h-[18px] rounded-[2px] object-cover shrink-0 ring-1 ring-black/5 dark:ring-white/10 ${complete && !isWinner(team.name) ? 'opacity-60' : ''}`}
                  />
                )}
                <span className={`text-sm truncate ${complete && !isWinner(team.name) ? 'font-medium text-muted-foreground' : 'font-semibold text-foreground'}`}>
                  {team.name}
                </span>
              </span>
              {team.score && (
                <span className={`font-display text-base md:text-lg tabular-nums shrink-0 ${complete && !isWinner(team.name) ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {formatScore(team.score)}
                </span>
              )}
            </div>
            );
          })}
        </div>

        {(footer || venue || seriesHref) && (
          <div className="mt-3 md:mt-4 pt-2.5 md:pt-3 border-t border-border/50 space-y-1.5">
            {footer && (
              <p className={`text-sm font-semibold truncate ${footerColor}`}>{footer}</p>
            )}
            {venue && (
              venueHref ? (
                <Link
                  href={venueHref}
                  className="pointer-events-auto relative z-[2] inline-flex items-center gap-1 max-w-full text-[11px] text-muted-foreground hover:text-foreground hover:underline transition-colors"
                >
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{venue}</span>
                </Link>
              ) : (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{venue}</span>
                </p>
              )
            )}
            {seriesHref && (
              <div className="flex items-center gap-3 mt-1.5 pt-2.5 border-t border-border/50 text-[13px] font-semibold">
                <Link
                  href={seriesHref}
                  className="pointer-events-auto relative z-[2] text-primary hover:text-primary/70 transition-colors"
                >
                  Schedule
                </Link>
                {showTable && (
                  <>
                    <span className="w-px h-3 bg-border" aria-hidden />
                    <Link
                      href={`${seriesHref}?view=points`}
                      className="pointer-events-auto relative z-[2] text-primary hover:text-primary/70 transition-colors"
                    >
                      Points Table
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
