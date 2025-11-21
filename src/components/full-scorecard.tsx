'use client';

import { useEffect, useState } from 'react';
import { getScorecardData, getPlayerProfile } from '@/app/actions';
import type { FullScorecard, PlayerProfile } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import PlayerProfileDisplay from './player-profile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

export default function FullScorecardDisplay({ matchId }: { matchId: string }) {
    const [scorecard, setScorecard] = useState<FullScorecard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);

    useEffect(() => {
        const fetchScorecard = async () => {
            setLoading(true);
            setError(null);
            const result = await getScorecardData(matchId);
            if (result.success && result.data) {
                setScorecard(result.data);
            } else {
                setError(result.error ?? 'Failed to fetch scorecard data.');
            }
            setLoading(false);
        };

        fetchScorecard();
        const interval = setInterval(fetchScorecard, 30000);
        return () => clearInterval(interval);
    }, [matchId]);

    useEffect(() => {
        if (scorecard?.innings.length > 0) {
            setOpenAccordion(scorecard.innings[scorecard.innings.length - 1].name);
        }
    }, [scorecard]);

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


    if (loading && !scorecard) {
        return (
            <div className="flex justify-center items-center p-8">
                <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading scorecard...</p>
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

    if (!scorecard) {
        return <p>No scorecard data available.</p>;
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

    return (
        <div className="max-w-7xl mx-auto space-y-3 md:space-y-8">
            {/* Match Header */}
            <div className="text-center space-y-2 md:space-y-4 py-3 md:py-6 border-b dark:border-gray-800 px-2 md:px-4">
                <h1 className="text-lg md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {scorecard.title}
                </h1>
                <p className="text-xs md:text-lg font-medium px-2 md:px-4 py-1 md:py-2 rounded-full bg-destructive/10 text-destructive inline-block">
                    {scorecard.status}
                </p>
            </div>

            <Accordion
                type="single"
                collapsible
                value={openAccordion}
                onValueChange={setOpenAccordion}
                className="w-full px-2 md:px-4"
            >
                {scorecard.innings.map((inning, index) => (
                    <AccordionItem value={inning.name} key={index} className="border rounded-lg mb-2 md:mb-4 shadow-sm hover:shadow-md transition-shadow">
                        <AccordionTrigger className="px-2 md:px-6 py-2.5 md:py-4 hover:no-underline">
                            <div className="flex items-center justify-between w-full gap-2 md:gap-4">
                                <div className="flex-1 text-left">
                                    <h2 className="text-sm md:text-2xl font-bold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
                                        {inning.name}
                                    </h2>
                                    <p className="text-xs md:text-xl font-semibold mt-0.5 md:mt-1">{inning.score}</p>
                                </div>
                                <div className="hidden md:block text-sm text-muted-foreground">
                                    Click to {openAccordion === inning.name ? 'hide' : 'show'} details
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="px-0 md:px-6 pb-3 md:pb-6">
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 md:gap-8">
                                    <div className="lg:col-span-3 space-y-3 md:space-y-8">
                                        <Card className="backdrop-blur-sm bg-white/50 dark:bg-gray-950/50">
                                            <CardHeader className="border-b dark:border-gray-800 p-2 md:p-6">
                                                <CardTitle className="flex items-center gap-2 text-xs md:text-base">
                                                    {inning.battingTeamName} Batting
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="hover:bg-transparent">
                                                                <TableHead className="min-w-[120px] md:w-[200px] font-bold text-xs md:text-sm">Batter</TableHead>
                                                                <TableHead className="font-bold text-xs md:text-sm min-w-[100px]">Dismissal</TableHead>
                                                                <TableHead className="text-right font-bold text-xs md:text-sm">R</TableHead>
                                                                <TableHead className="text-right font-bold text-xs md:text-sm">B</TableHead>
                                                                <TableHead className="text-right font-bold text-xs md:text-sm">4s</TableHead>
                                                                <TableHead className="text-right font-bold text-xs md:text-sm">6s</TableHead>
                                                                <TableHead className="text-right font-bold text-xs md:text-sm">SR</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {inning.batsmen.map((batsman, i) => (
                                                                <TableRow key={i}
                                                                    className={`
                                                        transition-colors
                                                        ${Number(batsman.runs) >= 50 ? 'bg-green-50/50 dark:bg-green-950/20' :
                                                                            Number(batsman.runs) >= 30 ? 'bg-emerald-50/30 dark:bg-emerald-950/10' :
                                                                                'even:bg-gray-50/50 dark:even:bg-gray-800/20'}
                                                        hover:bg-gray-100/50 dark:hover:bg-gray-800/40
                                                    `}
                                                                >
                                                                    <TableCell className="font-medium text-xs md:text-sm py-2 md:py-3">
                                                                        <span
                                                                            className={`
                                                            ${batsman.profileId ?
                                                                                    "cursor-pointer hover:text-primary transition-colors" : ""}
                                                            ${Number(batsman.runs) >= 50 ? 'text-green-600 dark:text-green-400' : ''}
                                                        `}
                                                                            onClick={() => handleProfileClick(batsman.profileId, batsman.name)}
                                                                        >
                                                                            {batsman.name}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="text-xs md:text-sm text-muted-foreground">{batsman.dismissal}</TableCell>
                                                                    <TableCell className="text-right font-bold text-xs md:text-sm">{batsman.runs}</TableCell>
                                                                    <TableCell className="text-right text-xs md:text-sm">{batsman.balls}</TableCell>
                                                                    <TableCell className="text-right text-xs md:text-sm">{batsman.fours}</TableCell>
                                                                    <TableCell className="text-right text-xs md:text-sm">{batsman.sixes}</TableCell>
                                                                    <TableCell className="text-right text-xs md:text-sm">
                                                                        <span className={`${parseFloat(batsman.strikeRate) >= 150 ? 'text-green-600 dark:text-green-400' :
                                                                            parseFloat(batsman.strikeRate) >= 100 ? 'text-emerald-600 dark:text-emerald-400' :
                                                                                ''
                                                                            }`}>
                                                                            {batsman.strikeRate}
                                                                        </span>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                                <Separator className="my-2 md:my-4" />
                                                <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm px-2 md:px-6 pb-2 md:pb-4">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-semibold">Extras</span>
                                                        <span>{inning.extras}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center font-bold text-sm md:text-base">
                                                        <span>Total</span>
                                                        <span>{inning.total}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="backdrop-blur-sm bg-white/50 dark:bg-gray-950/50">
                                            <CardHeader className="border-b dark:border-gray-800 p-2 md:p-6">
                                                <CardTitle className="flex items-center gap-2 text-xs md:text-base">
                                                    {inning.bowlingTeamName} Bowling
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="hover:bg-transparent">
                                                                <TableHead className="min-w-[120px] md:w-[200px] font-bold text-xs md:text-sm">Bowler</TableHead>
                                                                <TableHead className="text-right font-bold text-xs md:text-sm">O</TableHead>
                                                                <TableHead className="text-right font-bold text-xs md:text-sm">M</TableHead>
                                                                <TableHead className="text-right font-bold text-xs md:text-sm">R</TableHead>
                                                                <TableHead className="text-right font-bold text-xs md:text-sm">W</TableHead>
                                                                <TableHead className="text-right font-bold text-xs md:text-sm">NB</TableHead>
                                                                <TableHead className="text-right font-bold text-xs md:text-sm">WD</TableHead>
                                                                <TableHead className="text-right font-bold text-xs md:text-sm">ECO</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {inning.bowlers.map((bowler, i) => (
                                                                <TableRow key={i}
                                                                    className={`
                                                        transition-colors
                                                        ${Number(bowler.wickets) >= 3 ? 'bg-orange-50/50 dark:bg-orange-950/20' :
                                                                            Number(bowler.wickets) >= 2 ? 'bg-amber-50/30 dark:bg-amber-950/10' :
                                                                                'even:bg-gray-50/50 dark:even:bg-gray-800/20'}
                                                        hover:bg-gray-100/50 dark:hover:bg-gray-800/40
                                                    `}
                                                                >
                                                                    <TableCell className="font-medium text-xs md:text-sm py-2 md:py-3">
                                                                        <span
                                                                            className={`
                                                            ${bowler.profileId ?
                                                                                    "cursor-pointer hover:text-primary transition-colors" : ""}
                                                            ${Number(bowler.wickets) >= 3 ? 'text-orange-600 dark:text-orange-400' : ''}
                                                        `}
                                                                            onClick={() => handleProfileClick(bowler.profileId, bowler.name)}
                                                                        >
                                                                            {bowler.name}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-xs md:text-sm">{bowler.overs}</TableCell>
                                                                    <TableCell className="text-right text-xs md:text-sm">{bowler.maidens}</TableCell>
                                                                    <TableCell className="text-right text-xs md:text-sm">{bowler.runs}</TableCell>
                                                                    <TableCell className="text-right text-xs md:text-sm">
                                                                        <span className={`font-bold ${Number(bowler.wickets) >= 5 ? 'text-orange-600 dark:text-orange-400' :
                                                                            Number(bowler.wickets) >= 3 ? 'text-amber-600 dark:text-amber-400' :
                                                                                ''
                                                                            }`}>
                                                                            {bowler.wickets}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-xs md:text-sm">{bowler.noBalls}</TableCell>
                                                                    <TableCell className="text-right text-xs md:text-sm">{bowler.wides}</TableCell>
                                                                    <TableCell className="text-right text-xs md:text-sm">
                                                                        <span className={`${parseFloat(bowler.economy) <= 4 ? 'text-green-600 dark:text-green-400' :
                                                                            parseFloat(bowler.economy) <= 6 ? 'text-emerald-600 dark:text-emerald-400' :
                                                                                parseFloat(bowler.economy) >= 10 ? 'text-red-600 dark:text-red-400' :
                                                                                    ''
                                                                            }`}>
                                                                            {bowler.economy}
                                                                        </span>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className="lg:col-span-2 space-y-3 md:space-y-6">
                                        {inning.partnerships && inning.partnerships.length > 0 && (
                                            <Card className="backdrop-blur-sm bg-white/50 dark:bg-gray-950/50">
                                                <CardHeader className="border-b dark:border-gray-800 p-2 md:p-6">
                                                    <CardTitle className="flex items-center gap-2 text-xs md:text-base">
                                                        Partnerships
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="grid gap-2 md:gap-3 p-2 md:p-4">
                                                    {inning.partnerships.map((partnership, i) => (
                                                        <div key={i}
                                                            className="p-2 md:p-4 rounded-lg bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-100 dark:border-purple-900/30 hover:shadow-md transition-all"
                                                        >
                                                            <div className="flex justify-between items-start mb-2 md:mb-3 gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-purple-700 dark:text-purple-300 text-xs md:text-sm truncate">
                                                                        {partnership.bat1Name}
                                                                    </p>
                                                                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
                                                                        {partnership.bat1Runs} ({partnership.bat1Balls})
                                                                    </p>
                                                                </div>
                                                                <div className="text-center px-2 md:px-3 flex-shrink-0">
                                                                    <p className="text-[10px] md:text-xs text-muted-foreground">Partnership</p>
                                                                    <p className="font-bold text-base md:text-lg text-purple-600 dark:text-purple-400">
                                                                        {partnership.totalRuns}
                                                                    </p>
                                                                    <p className="text-[10px] md:text-xs text-muted-foreground">
                                                                        ({partnership.totalBalls}b)
                                                                    </p>
                                                                </div>
                                                                <div className="flex-1 text-right min-w-0">
                                                                    <p className="font-semibold text-blue-700 dark:text-blue-300 text-xs md:text-sm truncate">
                                                                        {partnership.bat2Name}
                                                                    </p>
                                                                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
                                                                        {partnership.bat2Runs} ({partnership.bat2Balls})
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>
                                        )}
                                        {inning.fallOfWickets.length > 0 && (
                                            <Card className="backdrop-blur-sm bg-white/50 dark:bg-gray-950/50 rounded-none md:rounded-lg">
                                                <CardHeader className="border-b dark:border-gray-800 p-2 md:p-6">
                                                    <CardTitle className="flex items-center gap-2 text-xs md:text-base">
                                                        Fall of Wickets
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="grid gap-2 md:gap-3 p-2 md:p-4">
                                                    {inning.fallOfWickets.map((fow, i) => (
                                                        <div key={i}
                                                            className="flex justify-between items-center gap-2 md:gap-4 p-2 md:p-3 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition-colors"
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-primary text-xs md:text-sm truncate">{fow.player.replace(/,/g, '')}</p>
                                                                <div className="flex items-center gap-1 md:gap-2 mt-0.5 md:mt-1">
                                                                    <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full bg-gray-200/50 dark:bg-gray-800/50 text-muted-foreground">
                                                                        {fow.over.replace(/,/g, '')} ov
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <p className="font-bold text-sm md:text-lg bg-primary/10 text-primary px-2 md:px-3 py-0.5 md:py-1 rounded-full flex-shrink-0">
                                                                {fow.score}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>
                                        )}
                                        {inning.yetToBat.length > 0 && (
                                            <Card className="backdrop-blur-sm bg-white/50 dark:bg-gray-950/50">
                                                <CardHeader className="border-b dark:border-gray-800 p-2 md:p-6">
                                                    <CardTitle className="flex items-center gap-2 text-xs md:text-base">
                                                        Yet to Bat
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-2 md:p-4">
                                                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                                                        {inning.yetToBat.map((player, i) => (
                                                            <span key={i} className="px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-blue-50/50 dark:bg-blue-950/20 text-xs md:text-sm text-blue-700 dark:text-blue-300">
                                                                {player}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>

            {/* Match Information - Detailed */}
            <div className="px-2 md:px-4">
                {scorecard.matchInfo && (
                    <Card className="backdrop-blur-sm bg-white/50 dark:bg-gray-950/50">
                        <CardHeader className="border-b dark:border-gray-800 p-2 md:p-6">
                            <CardTitle className="text-sm md:text-2xl">Match Information</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 md:p-6">
                        <div className="space-y-4 md:space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 pb-3 md:pb-4 border-b dark:border-gray-800">
                                <div className="flex flex-col gap-0.5 md:gap-1">
                                    <span className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Match</span>
                                    <span className="font-medium text-sm md:text-lg">{scorecard.title}</span>
                                    {scorecard.matchInfo.matchFormat && (
                                        <span className="text-xs md:text-sm text-muted-foreground">{scorecard.matchInfo.matchFormat}</span>
                                    )}
                                </div>
                                {scorecard.matchInfo.seriesName && (
                                    <div className="flex flex-col gap-0.5 md:gap-1">
                                        <span className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Series</span>
                                        <span className="font-medium text-sm md:text-base">{scorecard.matchInfo.seriesName}</span>
                                    </div>
                                )}
                                {scorecard.matchInfo.venue && (
                                    <div className="flex flex-col gap-0.5 md:gap-1">
                                        <span className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Venue</span>
                                        <span className="font-medium text-sm md:text-base">{scorecard.matchInfo.venue}</span>
                                    </div>
                                )}
                            </div>

                            {/* Toss & Officials */}
                            <div>
                                {scorecard.matchInfo.tossResults && (
                                    <div className="flex flex-col gap-1.5 md:gap-2">
                                        <span className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">Toss</span>
                                        <div className="p-2 md:p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                                            <span className="font-medium text-xs md:text-sm">{scorecard.matchInfo.tossResults}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                )}
            </div>

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
