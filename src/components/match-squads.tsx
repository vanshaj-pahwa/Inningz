'use client';

import { useEffect, useState } from 'react';
import { getMatchSquads, getPlayerProfile } from '@/app/actions';
import type { MatchSquads, PlayerProfile, SquadPlayer } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import PlayerProfileDisplay from './player-profile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import Image from 'next/image';

export default function MatchSquadsDisplay({ matchId }: { matchId: string }) {
    const [squads, setSquads] = useState<MatchSquads | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);

    useEffect(() => {
        const fetchSquads = async () => {
            setLoading(true);
            setError(null);
            const result = await getMatchSquads(matchId);
            if (result.success && result.squads) {
                setSquads(result.squads);
            } else {
                setError(result.error ?? 'Failed to fetch squads data.');
            }
            setLoading(false);
        };

        fetchSquads();
    }, [matchId]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!selectedProfileId) return;
            setProfileLoading(true);
            const result = await getPlayerProfile(selectedProfileId, selectedPlayerName || undefined);
            if (result.success && result.data) {
                setSelectedProfile(result.data);
            }
            setProfileLoading(false);
        };
        fetchProfile();
    }, [selectedProfileId, selectedPlayerName]);

    if (loading && !squads) {
        return (
            <div className="flex justify-center items-center p-8">
                <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading squads...</p>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!squads) {
        return <p>No squads data available.</p>;
    }

    const handleProfileClick = (profileId: string | undefined, playerName?: string) => {
        if (profileId) {
            setSelectedProfileId(profileId);
            setSelectedPlayerName(playerName || null);
            setSelectedProfile(null);
        }
    }

    const handleDialogOpenChange = (open: boolean) => {
        if (!open) {
            setSelectedProfileId(null);
            setSelectedPlayerName(null);
            setSelectedProfile(null);
        }
    }

    const renderPlayer = (player: SquadPlayer, isRightSide: boolean = false) => {
        const captainWKText = [
            player.isCaptain && 'C',
            player.isWicketKeeper && 'WK'
        ].filter(Boolean).join(' & ');

        return (
            <div
                key={player.name}
                className={`flex gap-2 p-2 md:p-3 border-b border-cbBorderGrey items-center h-[70px] md:h-[80px] hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer ${isRightSide ? 'justify-end text-right border-l-0' : 'border-r-2'}`}
                onClick={() => handleProfileClick(player.profileId, player.name)}
            >
                {!isRightSide && (
                    <div className="relative flex-shrink-0">
                        <div className="rounded-full overflow-hidden w-10 h-10 md:w-12 md:h-12 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            {player.imageUrl ? (
                                <Image
                                    src={player.imageUrl}
                                    alt={player.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-lg md:text-xl font-bold text-gray-400">
                                    {player.name.charAt(0)}
                                </span>
                            )}
                        </div>
                    </div>
                )}
                <div className={`flex justify-between items-center w-full ${isRightSide ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex flex-col gap-0.5 md:gap-1 ${isRightSide ? 'items-end' : ''}`}>
                        <div className="flex flex-row items-center">
                            <span className="text-xs md:text-sm font-medium">{player.name}</span>
                            {captainWKText && (
                                <span className="ml-1 text-xs md:text-sm">({captainWKText})</span>
                            )}
                        </div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">{player.role}</div>
                    </div>
                </div>
                {isRightSide && (
                    <div className="relative flex-shrink-0">
                        <div className="rounded-full overflow-hidden w-10 h-10 md:w-12 md:h-12 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            {player.imageUrl ? (
                                <Image
                                    src={player.imageUrl}
                                    alt={player.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-lg md:text-xl font-bold text-gray-400">
                                    {player.name.charAt(0)}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-3 md:space-y-6">
            {/* Team Headers */}
            <div className="flex justify-between bg-gray-100 dark:bg-gray-800 p-2 md:p-4 rounded-none md:rounded-md">
                <div className="flex items-center gap-2">
                    {squads.team1.teamFlagUrl && (
                        <div className="rounded overflow-hidden w-6 h-4 md:w-7 md:h-5 flex-shrink-0">
                            <Image
                                src={squads.team1.teamFlagUrl}
                                alt={squads.team1.teamShortName}
                                width={27}
                                height={20}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <h1 className="font-bold text-sm md:text-base">{squads.team1.teamShortName}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <h1 className="font-bold text-sm md:text-base">{squads.team2.teamShortName}</h1>
                    {squads.team2.teamFlagUrl && (
                        <div className="rounded overflow-hidden w-6 h-4 md:w-7 md:h-5 flex-shrink-0">
                            <Image
                                src={squads.team2.teamFlagUrl}
                                alt={squads.team2.teamShortName}
                                width={27}
                                height={20}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Playing XI / Squad */}
            <div className="pb-3 md:pb-5">
                <h1 className="capitalize p-2 font-bold text-sm md:text-lg text-center bg-gray-100 dark:bg-gray-800">
                    {squads.team1.playingXI.length > 11 || squads.team2.playingXI.length > 11 ? 'Squad' : 'Playing XI'}
                </h1>
                <div className="w-full flex">
                    <div className="w-1/2">
                        {squads.team1.playingXI.map((player) => renderPlayer(player, false))}
                    </div>
                    <div className="w-1/2">
                        {squads.team2.playingXI.map((player) => renderPlayer(player, true))}
                    </div>
                </div>
            </div>

            {/* Bench */}
            {(squads.team1.bench.length > 0 || squads.team2.bench.length > 0) && (
                <div className="pb-3 md:pb-5">
                    <h1 className="capitalize p-2 font-bold text-sm md:text-lg text-center bg-gray-100 dark:bg-gray-800">
                        Bench
                    </h1>
                    <div className="w-full flex">
                        <div className="w-1/2">
                            {squads.team1.bench.map((player) => renderPlayer(player, false))}
                        </div>
                        <div className="w-1/2">
                            {squads.team2.bench.map((player) => renderPlayer(player, true))}
                        </div>
                    </div>
                </div>
            )}

            {/* Player Profile Dialog */}
            <Dialog open={!!selectedProfileId} onOpenChange={handleDialogOpenChange}>
                <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-0">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Player Profile</DialogTitle>
                    </DialogHeader>
                    {profileLoading && (
                        <div className="flex justify-center items-center p-12">
                            <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
                            <p className="ml-4 text-muted-foreground">Loading player profile...</p>
                        </div>
                    )}
                    {selectedProfile && (
                        <PlayerProfileDisplay profile={selectedProfile} />
                    )}
                    {!profileLoading && !selectedProfile && selectedProfileId && (
                        <div className="p-8 text-center text-muted-foreground">
                            Failed to load player profile
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
