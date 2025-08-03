
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUpcomingMatches } from '@/app/actions';
import type { LiveMatch } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoaderCircle, Calendar } from "lucide-react";
import { Button } from './ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type FilterType = 'All' | 'International' | 'League' | 'Domestic' | 'Women';

const filters: FilterType[] = ['All', 'International', 'League', 'Domestic', 'Women'];

export default function UpcomingMatches() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      setError(null);
      const result = await getUpcomingMatches();
      if (result.success && result.matches) {
        setMatches(result.matches);
      } else {
        setError(result.error ?? "Failed to fetch upcoming matches.");
      }
      setLoading(false);
    };

    fetchMatches();
  }, []);

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[60vh] p-8">
        <LoaderCircle className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium text-primary">Finding upcoming matches...</p>
        <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-xl">
            <AlertTitle className="text-lg">Unable to fetch matches</AlertTitle>
            <AlertDescription className="mt-2">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const filteredMatches = activeFilter === 'All'
    ? matches
    : matches.filter(match => match.matchType === activeFilter);
  
  if (filteredMatches.length === 0 && !loading) {
    return (
        <div className="w-full flex flex-col items-center justify-center min-h-[60vh] p-8">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No upcoming {activeFilter !== 'All' ? activeFilter.toLowerCase() : ''} matches found</h3>
            <p className="text-muted-foreground text-center max-w-sm">
                Try selecting a different category or check back later
            </p>
        </div>
    )
  }

  return (
    <div>
        <div className="flex items-center justify-center gap-2 mb-6 overflow-x-auto">
            <div className="flex gap-2 bg-gray-100/50 dark:bg-gray-800/30 p-1 rounded-lg backdrop-blur-sm">
                {filters.map(filter => (
                    <Button 
                        key={filter} 
                        variant={activeFilter === filter ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveFilter(filter)}
                        className="rounded-md"
                    >
                        {filter}
                    </Button>
                ))}
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map(match => (
                <Link key={match.matchId} href={`/match/${match.matchId}`} passHref>
                    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex flex-col bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm border-primary/10 hover:border-primary/30">
                        <CardContent className="p-5 flex flex-col flex-grow relative overflow-hidden">
                            <div className="mb-4">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold tracking-tight bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/90 transition-all flex-1">
                                        {match.title}
                                    </h3>
                                    <Badge 
                                        className={cn(
                                            "text-[10px] px-2 py-0 font-medium shrink-0",
                                            match.matchType === 'International' && "bg-blue-100 hover:bg-blue-100/80 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
                                            match.matchType === 'League' && "bg-purple-100 hover:bg-purple-100/80 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
                                            match.matchType === 'Domestic' && "bg-amber-100 hover:bg-amber-100/80 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
                                            match.matchType === 'Women' && "bg-pink-100 hover:bg-pink-100/80 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400"
                                        )}
                                    >
                                        {match.matchType}
                                    </Badge>
                                </div>
                            </div>
                            
                            <div className="space-y-3 flex-grow">
                               {match.teams.map((team, index) => (
                                    <div key={index} 
                                        className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition-colors"
                                    >
                                        <div className="flex justify-between items-center gap-4">
                                            <span className="font-semibold text-primary/90">{team.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-3 border-t dark:border-gray-800">
                                <p className="text-sm font-medium text-center text-muted-foreground">
                                    {match.status}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    </div>
  );
}
