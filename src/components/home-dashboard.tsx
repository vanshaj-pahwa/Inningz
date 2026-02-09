'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLiveMatches, getUpcomingMatches } from '@/app/actions';
import type { LiveMatch } from '@/app/actions';
import { useDashboardPreferences } from '@/contexts/dashboard-preferences-context';
import RecentHistory from '@/components/recent-history';
import FavoritesSection from '@/components/favorites-section';
import { Flame, Calendar, Tv } from 'lucide-react';

export default function HomeDashboard() {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const { preferences } = useDashboardPreferences();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [liveResult, upcomingResult] = await Promise.all([
        getLiveMatches(),
        getUpcomingMatches(),
      ]);

      if (liveResult.success && liveResult.matches) {
        setLiveMatches(liveResult.matches.slice(0, 3));
      }
      if (upcomingResult.success && upcomingResult.matches) {
        // Show first 3 upcoming matches
        setUpcomingMatches(upcomingResult.matches.slice(0, 3));
      }
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const isLive = (status: string) => {
    const s = status.toLowerCase();
    return s.includes('live') || s.includes('need') || s.includes('session') ||
      s.includes('innings') || s.includes('lead') || s.includes('rain') ||
      s.includes('weather') || s.includes('delay') || s.includes('stops play');
  };

  return (
    <div className="space-y-6 md:space-y-8 pt-4 md:pt-6 overflow-hidden">
      {/* Favorites Section */}
      {preferences.favorites.length > 0 && (
        <FavoritesSection />
      )}

      {/* Live Now Section */}
      {liveMatches.length > 0 && (
        <section className="overflow-hidden">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <div className="p-1 md:p-1.5 rounded-lg bg-red-500/10">
              <Flame className="w-3.5 md:w-4 h-3.5 md:h-4 text-red-500" />
            </div>
            <h3 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Live Now
            </h3>
          </div>
          <div className="grid gap-2 md:gap-3 overflow-hidden">
            {liveMatches.map((match) => (
              <LiveMatchCard key={match.matchId} match={match} isLive={isLive(match.status)} />
            ))}
          </div>
          {liveMatches.length > 0 && (
            <Link
              href="/?tab=live"
              className="inline-flex items-center gap-1 mt-2 md:mt-3 text-xs md:text-sm text-primary hover:underline"
            >
              View all live matches
            </Link>
          )}
        </section>
      )}

      {/* Recent History */}
      <section>
        <RecentHistory />
      </section>

      {/* Upcoming Section */}
      {upcomingMatches.length > 0 && (
        <section className="overflow-hidden">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <div className="p-1 md:p-1.5 rounded-lg bg-blue-500/10">
              <Calendar className="w-3.5 md:w-4 h-3.5 md:h-4 text-blue-500" />
            </div>
            <h3 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Upcoming
            </h3>
          </div>
          <div className="grid gap-2 md:gap-3 overflow-hidden">
            {upcomingMatches.map((match) => (
              <UpcomingMatchCard key={match.matchId} match={match} />
            ))}
          </div>
          <Link
            href="/?tab=upcoming"
            className="inline-flex items-center gap-1 mt-2 md:mt-3 text-xs md:text-sm text-primary hover:underline"
          >
            View all upcoming matches
          </Link>
        </section>
      )}

      {/* Empty State */}
      {!loading && liveMatches.length === 0 && upcomingMatches.length === 0 && preferences.favorites.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[35vh] md:min-h-[40vh] text-center px-4">
          <div className="p-4 md:p-5 rounded-full bg-primary/10 mb-4 md:mb-5">
            <Tv className="w-6 md:w-8 h-6 md:h-8 text-primary" />
          </div>
          <h3 className="text-lg md:text-xl font-display mb-1.5 md:mb-2">Welcome to Inningz</h3>
          <p className="text-muted-foreground text-xs md:text-sm max-w-[280px] md:max-w-sm">
            No live matches right now. Check out the Series tab to find upcoming tournaments and add them to your favorites!
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2 md:space-y-3">
            <div className="skeleton h-5 md:h-6 w-28 md:w-32 rounded" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-20 md:h-24 rounded-xl md:rounded-2xl" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LiveMatchCard({ match, isLive }: { match: LiveMatch; isLive: boolean }) {
  const isComplete = match.status.toLowerCase().includes('won');

  return (
    <Link href={`/match/${match.matchId}`} className="block">
      <div className={`glass-card card-hover p-3 md:p-4 overflow-hidden ${isLive ? 'ring-1 ring-red-500/20' : ''}`}>
        {/* Top row: Series + Live badge */}
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

        {/* Teams and Scores */}
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

        {/* Status */}
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

function UpcomingMatchCard({ match }: { match: LiveMatch }) {
  return (
    <Link href={`/match/${match.matchId}`} className="block">
      <div className="glass-card card-hover p-3 md:p-4 overflow-hidden">
        {/* Top row: Series name */}
        <p className="text-[10px] md:text-xs text-muted-foreground truncate mb-2 md:mb-3">
          {match.seriesName || match.title}
        </p>

        {/* Teams */}
        <div className="space-y-1.5 md:space-y-2">
          {match.teams.map((team, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[13px] md:text-sm font-semibold text-foreground truncate">
                {team.name}
              </span>
            </div>
          ))}
        </div>

        {/* Status/Time + Venue */}
        <div className="mt-2 md:mt-3 pt-2 md:pt-2.5 border-t border-border/50 space-y-1">
          {match.status && match.status.toLowerCase() !== 'status not available' && (
            <p className="text-[10px] md:text-xs font-medium text-amber-400 truncate">
              {match.status}
            </p>
          )}
          {match.venue && match.venue !== 'N/A' && (
            <p className="text-[10px] md:text-xs text-muted-foreground truncate">
              {match.venue}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
