'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLiveMatches } from '@/app/actions';
import type { LiveMatch } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoaderCircle, Calendar } from "lucide-react";
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
      <div className="w-full flex flex-col items-center justify-center min-h-[60vh] p-8">
        <LoaderCircle className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium text-primary">Finding live matches...</p>
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
  
  if (matches.length === 0) {
    return (
        <div className="w-full flex flex-col items-center justify-center min-h-[60vh] p-8">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No live matches at the moment</h3>
            <p className="text-muted-foreground text-center max-w-sm">
                Check back later for live cricket action or explore recent matches
            </p>
        </div>
    )
  }
  
  const isLive = (status: string) => {
    const lowerCaseStatus = status.toLowerCase();
    return lowerCaseStatus.includes('live') || lowerCaseStatus.includes('session') || lowerCaseStatus.includes('innings break') || lowerCaseStatus.includes('tea') || lowerCaseStatus.includes('stumps') || lowerCaseStatus.includes('lunch');
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.map(match => (
            <Link key={match.matchId} href={`/match/${match.matchId}`} passHref>
                <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex flex-col bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm border-primary/10 hover:border-primary/30">
                    <CardContent className="p-5 flex flex-col flex-grow relative overflow-hidden">
                        {isLive(match.status) && (
                            <Badge 
                                variant='destructive'
                                className="absolute top-2 right-2 text-xs font-semibold whitespace-nowrap animate-pulse"
                            >
                               LIVE
                            </Badge>
                        )}
                        <div className="mb-4">
                           <h3 className="text-base font-bold tracking-tight bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/90 transition-all">
                             {match.title}
                           </h3>
                        </div>
                        
                        <div className="space-y-3 flex-grow">
                           {match.teams.map((team, index) => (
                                <div key={index} 
                                     className="p-3 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition-colors"
                                >
                                    <div className="flex justify-between items-center gap-4">
                                        <span className="font-semibold text-primary/90">{team.name}</span>
                                        <span className="font-bold text-lg bg-primary/10 text-primary px-3 py-0.5 rounded-full">
                                            {team.score || '-'}
                                        </span>
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
  );
}
