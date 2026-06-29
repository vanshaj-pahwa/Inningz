'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  getLiveMatches,
  getRecentMatches,
  getUpcomingMatches,
  getICCRankings,
  getSeriesSchedule,
} from '@/app/actions';
import type { LiveMatch, RankingsData, RankingEntry, CricketSeries } from '@/app/actions';
import { useDashboardPreferences } from '@/contexts/dashboard-preferences-context';
import RecentHistory from '@/components/recent-history';
import FavoritesSection from '@/components/favorites-section';
import { SeriesCard } from '@/components/series-schedule';
import { usePlayerProfile } from '@/contexts/player-profile-context';
import { ArrowRight, Tv } from 'lucide-react';

type RankingCategory = 'batting' | 'bowling' | 'all-rounder';
type RankingFormat = 'test' | 'odi' | 't20';

const rankingCategoryConfig: Record<RankingCategory, { noun: string; accent: string; ring: string }> = {
  batting: { noun: 'Batters', accent: 'text-amber-400', ring: 'bg-amber-500/10' },
  bowling: { noun: 'Bowlers', accent: 'text-cyan-400', ring: 'bg-cyan-500/10' },
  'all-rounder': { noun: 'All-Rounders', accent: 'text-purple-400', ring: 'bg-purple-500/10' },
};

const rankingFormats: { value: RankingFormat; label: string }[] = [
  { value: 'test', label: 'Test' },
  { value: 'odi', label: 'ODI' },
  { value: 't20', label: 'T20' },
];

export default function HomeDashboard() {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [recentMatches, setRecentMatches] = useState<LiveMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<LiveMatch[]>([]);
  const [rankings, setRankings] = useState<Partial<Record<RankingCategory, RankingsData>>>({});
  const [rankingFormat, setRankingFormat] = useState<RankingFormat>('odi');
  const [series, setSeries] = useState<CricketSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankingsLoading, setRankingsLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const { preferences } = useDashboardPreferences();

  // Fetch matches (refreshes every 30s)
  useEffect(() => {
    const fetchData = async () => {
      const [liveResult, recentResult, upcomingResult] = await Promise.all([
        getLiveMatches(),
        getRecentMatches(),
        getUpcomingMatches(),
      ]);

      if (liveResult.success && liveResult.matches) {
        setLiveMatches(liveResult.matches.slice(0, 3));
      }
      if (recentResult.success && recentResult.matches) {
        setRecentMatches(recentResult.matches.slice(0, 4));
      }
      if (upcomingResult.success && upcomingResult.matches) {
        setUpcomingMatches(upcomingResult.matches.slice(0, 4));
      }
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch rankings when format changes — they don't refresh per second so no polling
  useEffect(() => {
    let cancelled = false;
    setRankingsLoading(true);
    const fetchRankings = async () => {
      const [batting, bowling, allRounder] = await Promise.all([
        getICCRankings(rankingFormat, 'batting'),
        getICCRankings(rankingFormat, 'bowling'),
        getICCRankings(rankingFormat, 'all-rounder'),
      ]);
      if (cancelled) return;
      const next: Partial<Record<RankingCategory, RankingsData>> = {};
      if (batting.success && batting.data) next.batting = batting.data;
      if (bowling.success && bowling.data) next.bowling = bowling.data;
      if (allRounder.success && allRounder.data) next['all-rounder'] = allRounder.data;
      setRankings(next);
      setRankingsLoading(false);
    };
    fetchRankings();
    return () => { cancelled = true; };
  }, [rankingFormat]);

  // Series: fetch once on mount; flatten and surface the current month's first 3.
  useEffect(() => {
    let cancelled = false;
    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    (async () => {
      const res = await getSeriesSchedule();
      if (cancelled) return;
      if (res.success && res.data) {
        const now = new Date();
        const currentMonthKey = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
        const currentMonth = res.data.months.find(m => m.name === currentMonthKey);
        const fallback = res.data.months[0];
        const list = (currentMonth ?? fallback)?.series ?? [];
        setSeries(list.slice(0, 3));
      }
      setSeriesLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const isComplete = (status: string) => {
    const s = status.toLowerCase();
    return s.includes('won') || s.includes('no result') || s.includes('drawn') ||
      s.includes('tied') || s.includes('complete') || s.includes('abandoned');
  };

  const isLive = (status: string) => {
    if (isComplete(status)) return false;
    const s = status.toLowerCase();
    if (s.includes('match scheduled') || s === 'status not available' || s.includes('preview')) return false;
    return true;
  };

  return (
    <div className="space-y-6 md:space-y-8 pt-4 md:pt-6 overflow-hidden">
      {/* Favorites (chips strip) */}
      {preferences.favorites.length > 0 && <FavoritesSection />}

      {/* Recently Viewed (chips strip, mirrors Favorites) */}
      <RecentHistory />

      {/* === LIVE === */}
      {loading ? (
        <SectionSkeleton title="Live" rows={3} />
      ) : liveMatches.length > 0 ? (
        <section className="overflow-hidden">
          <SectionHeader title="Live" liveDot href="/?tab=live" hrefLabel="View all" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
            {liveMatches.map((m) => (
              <LiveMatchCard key={m.matchId} match={m} isLive={isLive(m.status)} />
            ))}
          </div>
        </section>
      ) : null}

      {/* === SERIES === */}
      {seriesLoading ? (
        <SectionSkeleton title="Series" rows={3} />
      ) : series.length > 0 ? (
        <section className="overflow-hidden">
          <SectionHeader title="Series" href="/?tab=series" hrefLabel="See all" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
            {series.map((s, i) => (
              <SeriesCard key={s.seriesId} series={s} index={i} />
            ))}
          </div>
        </section>
      ) : null}

      {/* === 2-COL: RECENT | UPCOMING === */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent matches */}
        <div className="overflow-hidden">
          {loading ? (
            <SectionSkeleton title="Recent" rows={3} compact />
          ) : recentMatches.length > 0 ? (
            <>
              <SectionHeader title="Recent" href="/?tab=recent" hrefLabel="See all" />
              <div className="space-y-2">
                {recentMatches.map((m) => (
                  <CompactMatchRow key={m.matchId} match={m} variant="recent" />
                ))}
              </div>
            </>
          ) : (
            <EmptyCell title="Recent" message="No recent matches" />
          )}
        </div>

        {/* Upcoming matches */}
        <div className="overflow-hidden">
          {loading ? (
            <SectionSkeleton title="Upcoming" rows={3} compact />
          ) : upcomingMatches.length > 0 ? (
            <>
              <SectionHeader title="Upcoming" href="/?tab=upcoming" hrefLabel="See all" />
              <div className="space-y-2">
                {upcomingMatches.map((m) => (
                  <CompactMatchRow key={m.matchId} match={m} variant="upcoming" />
                ))}
              </div>
            </>
          ) : (
            <EmptyCell title="Upcoming" message="No upcoming matches" />
          )}
        </div>
      </section>

      {/* === RANKINGS STRIP === */}
      <section className="overflow-hidden">
        <SectionHeader
          title="ICC Rankings"
          href="/rankings"
          hrefLabel="All rankings"
          rightSlot={
            <FormatSwitcher value={rankingFormat} onChange={setRankingFormat} />
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
          {(['batting', 'bowling', 'all-rounder'] as RankingCategory[]).map((cat) => (
            <RankingsWidget
              key={cat}
              category={cat}
              format={rankingFormat}
              data={rankings[cat]}
              loading={rankingsLoading}
            />
          ))}
        </div>
      </section>

      {/* Welcome state — only if we have literally nothing */}
      {!loading && liveMatches.length === 0 && recentMatches.length === 0 && upcomingMatches.length === 0 && preferences.favorites.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center px-4 pt-2">
          <div className="p-4 md:p-5 rounded-full bg-primary/10 mb-4 md:mb-5">
            <Tv className="w-6 md:w-8 h-6 md:h-8 text-primary" />
          </div>
          <h3 className="text-lg md:text-xl font-display mb-1.5 md:mb-2">Welcome to Inningz</h3>
          <p className="text-muted-foreground text-xs md:text-sm max-w-[280px] md:max-w-sm">
            No matches right now. Browse the Series tab and add some to favorites.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Section header
// ============================================================================

function SectionHeader({
  title,
  href,
  hrefLabel,
  liveDot,
  icon,
  rightSlot,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  liveDot?: boolean;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3 md:mb-4 flex-wrap">
      <div className="flex items-center gap-2">
        {liveDot && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
        {icon}
        <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-foreground">
          {title}
        </h3>
      </div>
      <div className="flex items-center gap-3">
        {rightSlot}
        {href && hrefLabel && (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-[11px] md:text-xs text-primary hover:text-primary/80 transition-colors"
          >
            {hrefLabel}
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Format switcher pills (Test / ODI / T20)
// ============================================================================

function FormatSwitcher({
  value,
  onChange,
}: {
  value: RankingFormat;
  onChange: (v: RankingFormat) => void;
}) {
  return (
    <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/50">
      {rankingFormats.map((f) => {
        const active = value === f.value;
        return (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={`px-2.5 py-1 rounded-md text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Rankings widget — top 3 in a category
// ============================================================================

function RankingsWidget({
  category,
  format,
  data,
  loading,
}: {
  category: RankingCategory;
  format: RankingFormat;
  data?: RankingsData;
  loading: boolean;
}) {
  const cfg = rankingCategoryConfig[category];
  const formatLabel = format === 't20' ? 'T20' : format.toUpperCase();
  const entries = data?.entries?.slice(0, 3) ?? [];

  return (
    <div className="glass-card p-3 md:p-4">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] md:text-[11px] font-bold uppercase tracking-widest ${cfg.accent}`}>
          {formatLabel} {cfg.noun}
        </span>
        <Link
          href={`/rankings?format=${format}&category=${category}`}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Top 100
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton w-6 h-4 rounded" />
              <div className="skeleton w-8 h-8 rounded-full" />
              <div className="skeleton flex-1 h-4 rounded" />
              <div className="skeleton w-10 h-4 rounded" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">Rankings unavailable</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((p) => (
            <RankingRow key={p.rank + p.playerName} entry={p} accentBg={cfg.ring} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RankingRow({ entry, accentBg }: { entry: RankingEntry; accentBg: string }) {
  const rank = entry.rank.replace(/[^0-9]/g, '') || entry.rank;
  const { openPlayer } = usePlayerProfile();
  return (
    <li>
      <button
        type="button"
        onClick={() => entry.profileId && openPlayer(entry.profileId, entry.playerName)}
        disabled={!entry.profileId}
        className="w-full flex items-center gap-2.5 py-1 px-1 rounded-lg hover:bg-muted/40 transition-colors -mx-1 text-left disabled:cursor-default disabled:hover:bg-transparent"
      >
        <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-mono font-bold ${accentBg}`}>
          {rank}
        </span>
        {entry.imageUrl ? (
          <Image
            src={entry.imageUrl}
            alt={entry.playerName}
            width={28}
            height={28}
            className="w-7 h-7 rounded-full object-cover shrink-0 border border-border/50"
            unoptimized
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] md:text-[13px] font-semibold text-foreground truncate leading-tight">
            {entry.playerName}
          </p>
          <p className="text-[10px] text-muted-foreground truncate leading-tight">
            {entry.country}
          </p>
        </div>
        <span className="font-mono tabular-nums text-xs md:text-sm font-bold text-foreground shrink-0">
          {entry.rating}
        </span>
      </button>
    </li>
  );
}

// ============================================================================
// Compact match row (used in 3-col area for recent + upcoming)
// ============================================================================

function formatStartTime(startDate?: number): string | null {
  if (!startDate) return null;
  const ms = startDate < 10_000_000_000 ? startDate * 1000 : startDate;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (sameDay) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return `${dateStr}, ${time}`;
}

function CompactMatchRow({ match, variant }: { match: LiveMatch; variant: 'recent' | 'upcoming' }) {
  const status = match.status?.toLowerCase() ?? '';
  const isUpcoming = variant === 'upcoming';
  const statusColor = isUpcoming
    ? 'text-amber-400'
    : (status.includes('won') || status.includes('drawn') || status.includes('tied') ? 'text-amber-400' : 'text-muted-foreground');

  const startsAt = isUpcoming ? formatStartTime(match.startDate) : null;
  const upcomingFooter = startsAt || (match.venue && match.venue !== 'N/A' ? match.venue : null);

  return (
    <Link href={`/match/${match.matchId}`} className="block">
      <div className="glass-card card-hover p-3 overflow-hidden h-full">
        <p className="text-[10px] text-muted-foreground/80 truncate mb-1.5">
          {match.seriesName || match.title}
        </p>
        <div className="space-y-1">
          {match.teams.map((t, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-foreground truncate flex-1">
                {t.name}
              </span>
              {t.score && (
                <span className="font-mono text-[12px] tabular-nums text-foreground shrink-0">
                  {t.score}
                </span>
              )}
            </div>
          ))}
        </div>
        {isUpcoming ? (
          upcomingFooter && (
            <p className={`mt-2 pt-1.5 border-t border-border/40 text-[10px] font-medium truncate ${statusColor}`}>
              {startsAt ? `Starts at ${startsAt}` : upcomingFooter}
            </p>
          )
        ) : (
          match.status && match.status.toLowerCase() !== 'status not available' && (
            <p className={`mt-2 pt-1.5 border-t border-border/40 text-[10px] font-medium truncate ${statusColor}`}>
              {match.status}
            </p>
          )
        )}
      </div>
    </Link>
  );
}

// ============================================================================
// Original Live card (kept — full-size for the hero row)
// ============================================================================

function LiveMatchCard({ match, isLive }: { match: LiveMatch; isLive: boolean }) {
  const isComplete = match.status.toLowerCase().includes('won');

  return (
    <Link href={`/match/${match.matchId}`} className="block">
      <div className={`glass-card card-hover p-3 md:p-4 overflow-hidden ${isLive ? 'ring-1 ring-red-500/20' : ''}`}>
        <div className="flex items-center justify-between gap-2 mb-2 md:mb-3">
          <p className="text-[10px] md:text-xs text-muted-foreground truncate flex-1">
            {match.seriesName || match.title}
          </p>
          {isLive && (
            <span className="text-[10px] md:text-xs font-bold text-red-500 shrink-0">
              LIVE
            </span>
          )}
        </div>

        <div className="space-y-1.5 md:space-y-2">
          {match.teams.map((team, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2">
              <span className="text-[13px] md:text-sm font-semibold truncate text-foreground flex-1">
                {team.name}
              </span>
              {team.score && (
                <span className="font-display text-sm md:text-base tabular-nums shrink-0 text-foreground">
                  {team.score}
                </span>
              )}
            </div>
          ))}
        </div>

        {match.status && match.status.toLowerCase() !== 'status not available' && (
          <div className="mt-2 md:mt-3 pt-2 md:pt-2.5 border-t border-border/50">
            <p className={`text-[10px] md:text-xs font-medium truncate ${
              isLive ? 'text-red-400' : isComplete ? 'text-amber-400' : 'text-muted-foreground'
            }`}>
              {match.status}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

// ============================================================================
// Skeletons + empty
// ============================================================================

function SectionSkeleton({ title, rows, compact }: { title: string; rows: number; compact?: boolean }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-foreground">
          {title}
        </h3>
      </div>
      <div className={compact ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4'}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={`skeleton rounded-xl md:rounded-2xl ${compact ? 'h-16' : 'h-24 md:h-28'}`}
          />
        ))}
      </div>
    </section>
  );
}

function EmptyCell({ title, message }: { title: string; message: string }) {
  return (
    <>
      <SectionHeader title={title} />
      <div className="rounded-xl border border-dashed border-border/50 p-4 text-center">
        <p className="text-xs text-muted-foreground italic">{message}</p>
      </div>
    </>
  );
}
