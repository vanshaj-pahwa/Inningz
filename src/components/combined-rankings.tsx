'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Target, Users, User } from 'lucide-react';
import { getPlayerRankings, getTeamRankings, type PlayerRankings, type TeamRankings } from '@/app/actions';

const formats = ['test', 'odi', 't20'] as const;
const categories = ['batting', 'bowling', 'allRounder', 'teams'] as const;
const genders = ['men', 'women'] as const;

export default function CombinedRankings() {
    const [playerRankings, setPlayerRankings] = useState<PlayerRankings | null>(null);
    const [teamRankings, setTeamRankings] = useState<TeamRankings | null>(null);
    const [activeFormat, setActiveFormat] = useState<typeof formats[number]>('test');
    const [activeCategory, setActiveCategory] = useState<typeof categories[number]>('batting');
    const [activeGender, setActiveGender] = useState<typeof genders[number]>('men');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                setLoading(true);
                const [playerResult, teamResult] = await Promise.all([
                    getPlayerRankings(),
                    getTeamRankings()
                ]);


                if (playerResult.success && playerResult.rankings) {
                    setPlayerRankings(playerResult.rankings);
                }

                if (teamResult.success && teamResult.rankings) {
                    setTeamRankings(teamResult.rankings);
                }

                if (!playerResult.success && !teamResult.success) {
                    setError('Failed to fetch rankings');
                }
            } catch (err) {
                console.error('Error fetching rankings:', err);
                setError('Failed to fetch rankings');
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
            case 'teams': return <Users className="w-4 h-4" />;
            default: return <Trophy className="w-4 h-4" />;
        }
    };

    const getCategoryTitle = (category: string) => {
        switch (category) {
            case 'batting': return 'Batting';
            case 'bowling': return 'Bowling';
            case 'allRounder': return 'All-rounders';
            case 'teams': return 'Teams';
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
                                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
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

    const getCurrentRankings = () => {

        if (activeCategory === 'teams') {
            const result = teamRankings?.[activeGender]?.[activeFormat] || [];
            return result;
        } else {
            const result = playerRankings?.[activeGender]?.[activeCategory]?.[activeFormat] || [];
            return result;
        }
    };

    const currentRankings = getCurrentRankings();

    return (
        <div className="space-y-4 md:space-y-6">

            {/* Gender Filter */}
            <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
                <div className="flex gap-1 bg-gray-100/50 dark:bg-gray-800/30 p-1 rounded-lg backdrop-blur-sm min-w-max">
                    {genders.map(gender => (
                        <Button
                            key={gender}
                            variant={activeGender === gender ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveGender(gender)}
                            className="text-xs px-3 py-1 whitespace-nowrap flex-shrink-0 h-8 capitalize"
                        >
                            {gender}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Format Filter */}
            <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
                <div className="flex gap-1 bg-gray-100/50 dark:bg-gray-800/30 p-1 rounded-lg backdrop-blur-sm min-w-max">
                    {formats.map(format => (
                        <Button
                            key={format}
                            variant={activeFormat === format ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveFormat(format)}
                            className="text-xs px-3 py-1 whitespace-nowrap flex-shrink-0 h-8 uppercase"
                        >
                            {format}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Category Filter */}
            <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
                <div className="flex gap-1 bg-gray-100/50 dark:bg-gray-800/30 p-1 rounded-lg backdrop-blur-sm min-w-max">
                    {categories.map(category => (
                        <Button
                            key={category}
                            variant={activeCategory === category ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveCategory(category)}
                            className="text-xs px-2 py-1 whitespace-nowrap flex-shrink-0 h-8 flex items-center gap-1"
                        >
                            {getCategoryIcon(category)}
                            {getCategoryTitle(category)}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Rankings List */}
            <Card className="bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm border-primary/10">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        {getCategoryIcon(activeCategory)}
                        {getCategoryTitle(activeCategory)} Rankings - {activeGender.toUpperCase()} {activeFormat.toUpperCase()}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-3">
                        {activeCategory === 'teams' ? (
                            // Team Rankings
                            currentRankings.map((team: any, index: number) => (
                                <div key={`${team.team}-${team.rank}-${index}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-colors">
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
                            ))
                        ) : (
                            // Player Rankings
                            currentRankings.map((player: any, index: number) => (
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
                            ))
                        )}
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