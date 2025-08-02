
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUpcomingMatches } from '@/app/actions';
import type { LiveMatch } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoaderCircle } from "lucide-react";
import { Button } from './ui/button';
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
      <div className="w-full flex items-center justify-center p-8 mt-8">
        <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Finding upcoming matches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-8">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const filteredMatches = activeFilter === 'All'
    ? matches
    : matches.filter(match => match.matchType === activeFilter);
  
  if (filteredMatches.length === 0 && !loading) {
    return (
        <div className="text-center mt-8">
            <p className="text-lg font-semibold">No upcoming matches found for {activeFilter}.</p>
            <p className="text-muted-foreground">Please check another category or try again later.</p>
        </div>
    )
  }

  return (
    <div>
        <div className="flex items-center justify-center gap-2 mb-4 overflow-x-auto pb-2">
            {filters.map(filter => (
                <Button 
                    key={filter} 
                    variant={activeFilter === filter ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter(filter)}
                    className={cn("whitespace-nowrap", {
                        "bg-primary text-primary-foreground": activeFilter === filter,
                    })}
                >
                    {filter}
                </Button>
            ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMatches.map(match => (
                <Link key={match.matchId} href={`/match/${match.matchId}`} passHref>
                    <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full flex flex-col bg-card">
                        <CardContent className="p-4 flex flex-col flex-grow">
                            <div className="flex justify-between items-start mb-2">
                               <p className="text-sm font-semibold text-card-foreground pr-2 flex-1">{match.title}</p>
                            </div>
                            
                            <div className="space-y-1.5 mt-auto">
                               {match.teams.map((team, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-card-foreground/80">{team.name}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-primary font-semibold text-center mt-3">{match.status}</p>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    </div>
  );
}
