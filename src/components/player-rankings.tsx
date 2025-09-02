'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Target } from 'lucide-react';
import { getPlayerRankings, type PlayerRankings } from '@/app/actions';

const formats = ['test', 'odi', 't20'] as const;
const categories = ['batting', 'bowling', 'allRounder'] as const;

export default function PlayerRankingsComponent() {
  const [rankings, setRankings] = useState<PlayerRankings | null>(null);
  const [activeFormat, setActiveFormat] = useState<typeof formats[number]>('test');
  const [activeCategory, setActiveCategory] = useState<typeof categories[number]>('batting');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true);
        const result = await getPlayerRankings();
        if (result.success && result.rankings) {
          setRankings(result.rankings);
        } else {
          setError(result.error || 'Failed to fetch rankings');
        }
      } catch (err) {
        setError('Failed to fetch player rankings');
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'batting': return <Target className="w-4 h-4" />;
      case 'bowling': return <Trophy className="w-4 h-4" />;
      case 'allRounder': return <TrendingUp className="w-4 h-4" />;
      default: return <Trophy className="w-4 h-4" />;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'batting': return 'Batting Rankings';
      case 'bowling': return 'Bowling Rankings';
      case 'allRounder': return 'All-Rounder Rankings';
      default: return 'Rankings';
    }
  };

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
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
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

  const currentRankings = rankings?.[activeCategory]?.[activeFormat] || [];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          ICC Player Rankings
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

      {/* Category Filter */}
      <div className="flex gap-1 md:gap-2 overflow-x-auto pb-2">
        <div className="flex gap-1 md:gap-2 bg-gray-100/50 dark:bg-gray-800/30 p-1 rounded-lg backdrop-blur-sm min-w-fit">
          {categories.map(category => (
            <Button
              key={category}
              variant={activeCategory === category ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveCategory(category)}
              className="text-xs md:text-sm px-2 md:px-3 whitespace-nowrap flex items-center gap-1"
            >
              {getCategoryIcon(category)}
              {category === 'allRounder' ? 'All-Rounder' : category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Rankings List */}
      <Card className="bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {getCategoryIcon(activeCategory)}
            {getCategoryTitle(activeCategory)} - {activeFormat.toUpperCase()}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {currentRankings.map((player, index) => (
              <div key={`${activeFormat}-${activeCategory}-${player.name}-${player.rank}-${index}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {player.rank}
                </div>
                
                {/* Player Image */}
                {player.imageUrl && (
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src={player.imageUrl} 
                      alt={player.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm md:text-base truncate">{player.name}</h4>
                  <p className="text-xs md:text-sm text-muted-foreground">{player.country}</p>
                </div>
                <Badge variant="secondary" className="text-xs font-mono">
                  {player.rating}
                </Badge>
              </div>
            ))}
          </div>

          {currentRankings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No rankings available for this category.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}