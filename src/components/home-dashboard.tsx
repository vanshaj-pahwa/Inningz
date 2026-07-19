'use client';

import { useEffect, useRef, useState } from 'react';
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
import { formatScore } from '@/lib/utils';
import MatchCard from '@/components/match-card';
import { useDashboardPreferences } from '@/contexts/dashboard-preferences-context';
import RecentHistory from '@/components/recent-history';
import FavoritesSection from '@/components/favorites-section';
import { SeriesCard } from '@/components/series-schedule';
import { usePlayerProfile } from '@/contexts/player-profile-context';
import { motion } from 'framer-motion';
import { ArrowRight, Tv, ChevronLeft, ChevronRight } from 'lucide-react';

type RankingCategory = 'batting' | 'bowling' | 'all-rounder';
type RankingFormat = 'test' | 'odi' | 't20';

// Harmonized to the design tokens (was amber/cyan/purple): gold = runs/batting,
// blue = bowling, violet = all-rounders. One cohesive triad, no stray cyan.
const rankingCategoryConfig: Record<RankingCategory, { noun: string; accent: string; ring: string }> = {
  batting: { noun: 'Batters', accent: 'text-[hsl(var(--brand))]', ring: 'bg-[hsl(var(--brand)/0.12)]' },
  bowling: { noun: 'Bowlers', accent: 'text-[hsl(var(--info))]', ring: 'bg-[hsl(var(--info)/0.12)]' },
  'all-rounder': { noun: 'All-Rounders', accent: 'text-[hsl(var(--six))]', ring: 'bg-[hsl(var(--six)/0.12)]' },
};

const rankingFormats: { value: RankingFormat; label: string }[] = [
  { value: 'test', label: 'Test' },
  { value: 'odi', label: 'ODI' },
  { value: 't20', label: 'T20' },
];

// Horizontal, snap-scrolling row of match cards with edge arrows that appear
// only when there's more to scroll in that direction (desktop).
function MatchCarousel({ matches }: { matches: LiveMatch[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setCanLeft(el.scrollLeft > 8);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [matches.length]);

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  const arrowClass =
    'flex absolute top-1/2 -translate-y-1/2 z-20 w-6 h-6 md:w-9 md:h-9 items-center justify-center rounded-full surface-card shadow-lg text-foreground hover:bg-muted transition-colors';

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex items-start gap-3 md:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory"
      >
        {matches.map((m) => (
          <div key={m.matchId} className="snap-start shrink-0 w-[280px] sm:w-[300px] md:w-[320px]">
            <MatchCard match={m} header="series" />
          </div>
        ))}
      </div>
      {canLeft && (
        <button type="button" onClick={() => scroll(-1)} aria-label="Scroll left" className={`${arrowClass} left-1`}>
          <ChevronLeft className="w-3.5 h-3.5 md:w-5 md:h-5" />
        </button>
      )}
      {canRight && (
        <button type="button" onClick={() => scroll(1)} aria-label="Scroll right" className={`${arrowClass} right-1`}>
          <ChevronRight className="w-3.5 h-3.5 md:w-5 md:h-5" />
        </button>
      )}
    </div>
  );
}

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
        setRecentMatches(recentResult.matches.slice(0, 12));
      }
      if (upcomingResult.success && upcomingResult.matches) {
        setUpcomingMatches(upcomingResult.matches.slice(0, 12));
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

  // Surface today's matches at the top instead of making the user scroll to
  // the Upcoming column to see what's on today.
  const isToday = (sd?: number) => {
    if (!sd) return false;
    const ms = sd < 10_000_000_000 ? sd * 1000 : sd;
    const d = new Date(ms);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  };
  const liveIds = new Set(liveMatches.map((m) => m.matchId));
  const todayUpcoming = upcomingMatches.filter((m) => isToday(m.startDate) && !liveIds.has(m.matchId));

  // Order today's row by relevance: live → about-to-start (soonest) → a Test day
  // that's been stumped → finished results. A live match always outranks an
  // upcoming one; the only live state that drops down is a Test at stumps
  // (there's no more play today). Breaks like rain/lunch/innings-break stay live.
  const matchTier = (m: LiveMatch) => {
    const s = (m.status || '').toLowerCase();
    if (/won|drawn|\btied\b|abandon|no result|complete/.test(s)) return 3; // finished
    const stumped = /stumps|close of play|end of day/.test(s);
    if (liveIds.has(m.matchId)) return stumped ? 2 : 0; // live (Test-at-stumps demoted)
    return 1; // upcoming today
  };
  const topMatches = [...liveMatches, ...todayUpcoming].sort((a, b) => {
    const ta = matchTier(a), tb = matchTier(b);
    if (ta !== tb) return ta - tb;
    return (a.startDate ?? Infinity) - (b.startDate ?? Infinity);
  });
  const laterUpcoming = upcomingMatches.filter((m) => !isToday(m.startDate));

  return (
    <div className="space-y-6 md:space-y-8 pt-4 md:pt-6 overflow-hidden">
      {/* Favorites (chips strip) */}
      {preferences.favorites.length > 0 && <FavoritesSection />}

      {/* Recently Viewed (chips strip, mirrors Favorites) */}
      <RecentHistory />

      {/* === LIVE & TODAY === */}
      {loading ? (
        <CarouselSkeleton />
      ) : topMatches.length > 0 ? (
        <section className="overflow-hidden">
          <MatchCarousel matches={topMatches} />
        </section>
      ) : null}

      {/* === RECENT (carousel) === */}
      {loading ? (
        <CarouselSkeleton title="Recent" />
      ) : recentMatches.length > 0 ? (
        <section className="overflow-hidden">
          <SectionHeader title="Recent" href="/?tab=recent" hrefLabel="See all" />
          <MatchCarousel matches={recentMatches} />
        </section>
      ) : null}

      {/* === UPCOMING (carousel) === */}
      {!loading && laterUpcoming.length > 0 ? (
        <section className="overflow-hidden">
          <SectionHeader title="Upcoming" href="/?tab=upcoming" hrefLabel="See all" />
          <MatchCarousel matches={laterUpcoming} />
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
        {/* Mobile: horizontal scroll; Desktop: 3-col grid */}
        <div className="md:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar">
          {(['batting', 'bowling', 'all-rounder'] as RankingCategory[]).map((cat) => (
            <div key={cat} className="snap-start shrink-0 w-[85%] xs:w-[80%]">
              <RankingsWidget
                category={cat}
                format={rankingFormat}
                data={rankings[cat]}
                loading={rankingsLoading}
              />
            </div>
          ))}
          <div className="shrink-0 w-1" />
        </div>
        <div className="hidden md:grid grid-cols-3 gap-4">
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
            className={`px-3 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${
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
    <div className="surface-card p-3 md:p-4">
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
// Skeletons + empty
// ============================================================================

// Loading placeholder that mirrors MatchCarousel: an optional section title
// followed by a horizontal row of wide card skeletons (same widths as the real
// cards). Used for the Live/Today and Recent rows, which are carousels.
function CarouselSkeleton({ title, cards = 3 }: { title?: string; cards?: number }) {
  return (
    <section className="overflow-hidden">
      {title && (
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <div className="skeleton h-3.5 md:h-4 w-24 rounded" />
        </div>
      )}
      <div className="flex items-start gap-3 md:gap-4 overflow-hidden">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="skeleton shrink-0 w-[280px] sm:w-[300px] md:w-[320px] h-52 rounded-2xl"
          />
        ))}
      </div>
    </section>
  );
}

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
