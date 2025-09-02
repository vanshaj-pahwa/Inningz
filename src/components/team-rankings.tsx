'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Users } from 'lucide-react';
import { getTeamRankings, type TeamRankings } from '@/app/actions';

const formats = ['test', 'odi', 't20'] as const;

export default function TeamRankingsComponent() {
  const [rankings, setRankings] = useState<TeamRankings | null>(null);
  const [activeFormat, setActiveFormat] = useState<typeof formats[number]>('test');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true);
        const result = await getTeamRankings();
        if (result.success && result.rankings) {
          setRankings(result.rankings);
        } else {
          setError(result.error || 'Failed to fetch team rankings');
        }
      } catch (err) {
        setError('Failed to fetch team rankings');
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, []);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                </div>
                <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const currentRankings = rankings?.[activeFormat] || [];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          ICC Team Rankings
        </h2>
      </div>

      {/* Format Filter */}
      <div className="flex gap-1 md:gap-2 overflow-x-auto pb-2">
        <div className="flex gap-1 md:gap-2 bg-gray-100/50 dark:bg-gray-800/30 p-1 rounded-lg backdrop-blur-sm min-w-fit">
          {formats.map(format => (
            <Button
              key={format}
              variant={activeFormat === format ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFormat(format)}
              className="text-xs md:text-sm px-2 md:px-3 whitespace-nowrap uppercase"
            >
              {format}
            </Button>
          ))}
        </div>
      </div>

      {/* Rankings List */}
      <Card className="bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Team Rankings - {activeFormat.toUpperCase()}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {currentRankings.map((team, index) => (
              <div key={`${activeFormat}-${team.team}-${team.rank}-${index}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {team.rank}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <h4 className="font-semibold text-sm md:text-base truncate">{team.team}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-mono">
                    {team.rating}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    {team.points} pts
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {currentRankings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No team rankings available for this format.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}