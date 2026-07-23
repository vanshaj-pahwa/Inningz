'use client';

import { useEffect, useState } from 'react';
import { getLiveMatches } from '@/app/actions';
import type { LiveMatch } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import SeriesDivider from "./series-divider";
import MatchCarousel from "./match-carousel";
import MatchFilterBar, { getMatchCategory, countByCategory, type MatchFilter } from "./match-filter-bar";

interface GroupedMatches {
  [seriesName: string]: LiveMatch[];
}

export default function LiveMatches() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<MatchFilter>('all');
  const [reloadKey, setReloadKey] = useState(0);

  const filterMatches = (matches: LiveMatch[]): LiveMatch[] => {
    if (activeFilter === 'all') return matches;
    return matches.filter(match => getMatchCategory(match) === activeFilter);
  };

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      setError(null);
      const result = await getLiveMatches();
      if (result.success && result.matches) {
        setMatches(result.matches);
      } else {
        setError(result.error ?? "Failed to fetch live matches.");
      }
      setLoading(false);
    };
    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, [reloadKey]);

  const filteredMatches = filterMatches(matches);
  const groupedMatches: GroupedMatches = filteredMatches.reduce((acc, match) => {
    const seriesName = match.seriesName || 'Other Matches';
    if (!acc[seriesName]) acc[seriesName] = [];
    acc[seriesName].push(match);
    return acc;
  }, {} as GroupedMatches);

  const counts = countByCategory(matches);

  if (loading) {
    return (
      <div className="space-y-6">
        <MatchFilterBar activeFilter={activeFilter} setActiveFilter={setActiveFilter} counts={counts} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-xl rounded-2xl">
          <AlertTitle className="text-lg">Unable to fetch matches</AlertTitle>
          <AlertDescription className="mt-2">{error}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-3 rounded-xl" onClick={() => setReloadKey(k => k + 1)}>
            Try again
          </Button>
        </Alert>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="p-5 rounded-full bg-primary/10 mb-5">
          <Calendar className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-display mb-2">No live matches at the moment</h3>
        <p className="text-muted-foreground text-center max-w-sm text-sm">
          Check back later for live cricket action or explore recent matches
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <MatchFilterBar activeFilter={activeFilter} setActiveFilter={setActiveFilter} counts={counts} />

      {Object.keys(groupedMatches).length === 0 && (
        <div className="w-full flex flex-col items-center justify-center min-h-[40vh] p-8">
          <div className="p-5 rounded-full bg-primary/10 mb-5">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-display mb-2">No matches found</h3>
          <p className="text-muted-foreground text-center max-w-sm text-sm">
            Try selecting a different filter
          </p>
        </div>
      )}

      {Object.entries(groupedMatches).map(([seriesName, seriesMatches]) => (
        <section key={seriesName}>
          <SeriesDivider name={seriesName} seriesUrl={seriesMatches[0]?.seriesUrl} />
          {/* Horizontal carousel keeps card density high — a 1-match series takes
              a single card width instead of a full 3-col grid row; multi-match
              series scroll horizontally. */}
          <MatchCarousel matches={seriesMatches} header={activeFilter === 'all' ? 'category' : 'none'} />
        </section>
      ))}
    </div>
  );
}

