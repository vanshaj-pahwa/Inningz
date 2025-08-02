'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLiveMatches } from '@/app/actions';
import type { LiveMatch } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoaderCircle } from "lucide-react";
import { Badge } from '@/components/ui/badge';

export default function LiveMatches() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const interval = setInterval(fetchMatches, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center p-8 mt-8">
        <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Finding live matches...</p>
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
  
  if (matches.length === 0) {
    return (
        <div className="text-center mt-8">
            <p className="text-lg font-semibold">No live matches found.</p>
            <p className="text-muted-foreground">Please check back later.</p>
        </div>
    )
  }
  
  const isLive = (status: string) => {
    const lowerCaseStatus = status.toLowerCase();
    return lowerCaseStatus.includes('live') || lowerCaseStatus.includes('session') || lowerCaseStatus.includes('innings break') || lowerCaseStatus.includes('tea') || lowerCaseStatus.includes('stumps') || lowerCaseStatus.includes('lunch');
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map(match => (
            <Link key={match.matchId} href={`/match/${match.matchId}`} passHref>
                <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full flex flex-col bg-card">
                    <CardContent className="p-4 flex flex-col flex-grow">
                        <div className="flex justify-between items-start mb-2">
                           <p className="text-sm font-semibold text-card-foreground pr-2 flex-1">{match.title}</p>
                           {isLive(match.status) && <Badge 
                                variant='destructive'
                                className="text-xs whitespace-nowrap"
                            >
                               LIVE
                           </Badge>}
                        </div>
                        
                        <div className="space-y-1.5 mt-auto">
                           {match.teams.map((team, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-card-foreground/80">{team.name}</span>
                                    <span className="font-bold text-card-foreground">{team.score}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-primary font-semibold text-center mt-3">{match.status}</p>
                    </CardContent>
                </Card>
            </Link>
        ))}
    </div>
  );
}
