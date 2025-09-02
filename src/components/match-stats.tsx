'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Trophy, Users, CloudSun, Grass } from 'lucide-react';
import { getMatchStats, type MatchStats } from '@/app/actions';

interface MatchStatsProps {
  matchId: string;
}

export default function MatchStatsComponent({ matchId }: MatchStatsProps) {
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!matchId) return;
      
      try {
        setLoading(true);
        const result = await getMatchStats(matchId);
        if (result.success && result.stats) {
          setStats(result.stats);
        } else {
          setError(result.error || 'Failed to fetch match statistics');
        }
      } catch (err) {
        setError('Failed to fetch match statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [matchId]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
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

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No match statistics available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Match Information
        </h2>
      </div>

      <Card className="bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{stats.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Basic Match Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.venue && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Venue</p>
                  <p className="font-medium">{stats.venue}</p>
                </div>
              </div>
            )}

            {stats.date && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{stats.date}</p>
                </div>
              </div>
            )}
          </div>

          {/* Toss & Result */}
          <div className="space-y-3">
            {stats.toss && (
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Toss</p>
                  <p className="font-medium">{stats.toss}</p>
                </div>
              </div>
            )}

            {stats.result && (
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Result</p>
                  <p className="font-medium text-primary">{stats.result}</p>
                </div>
              </div>
            )}
          </div>

          {/* Player of the Match */}
          {stats.playerOfTheMatch && (
            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Player of the Match</p>
                <p className="font-semibold text-primary">{stats.playerOfTheMatch}</p>
              </div>
            </div>
          )}

          {/* Officials */}
          {stats.umpires.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Officials</h4>
              <div className="space-y-1">
                {stats.umpires.map((umpire, index) => (
                  <Badge key={index} variant="outline" className="mr-2 mb-1">
                    Umpire: {umpire}
                  </Badge>
                ))}
                {stats.referee && (
                  <Badge variant="outline" className="mr-2 mb-1">
                    Referee: {stats.referee}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.weather && (
              <div className="flex items-center gap-3">
                <CloudSun className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Weather</p>
                  <p className="font-medium">{stats.weather}</p>
                </div>
              </div>
            )}

            {stats.pitchReport && (
              <div className="flex items-center gap-3">
                <Grass className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Pitch Report</p>
                  <p className="font-medium">{stats.pitchReport}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}