'use client';

import { useEffect, useState } from 'react';
import { getScorecardData, getPlayerProfile, getInningsOverData } from '@/app/actions';
import type { FullScorecard, PlayerProfile, InningsOverData } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import PlayerProfileDisplay from './player-profile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import OverByOverChart from './over-by-over-chart';

export default function FullScorecardDisplay({ matchId }: { matchId: string }) {
    const [scorecard, setScorecard] = useState<FullScorecard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
    const [overData, setOverData] = useState<Map<number, InningsOverData>>(new Map());

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
        // Fetch over data for up to 4 innings in parallel with scorecard (not dependent on it)
        const fetchOverData = async () => {
                const inningsIds = [1, 2, 3, 4];
                const results = await Promise.allSettled(
                    inningsIds.map(id => getInningsOverData(matchId, id))
                );
                const newMap = new Map<number, InningsOverData>();
                results.forEach((res, i) => {
                    if (res.status === 'fulfilled' && res.value.success && res.value.data && res.value.data.overs && res.value.data.overs.length > 0) {
                        newMap.set(inningsIds[i], res.value.data);
                    }
                });
                if (newMap.size > 0) setOverData(newMap);
        };
        fetchOverData();
    }, [matchId]);

    // Augment over data with partial over computed from scorecard total
    const getAugmentedOverData = (inningsIndex: number): InningsOverData | undefined => {
        const data = overData.get(inningsIndex);
        if (!data || !scorecard) return data;
        const inning = scorecard.innings[inningsIndex - 1];
        if (!inning) return data;
        // Parse total runs and overs from score like "165-10 (18.4 Ov)" or "201-4 (20 Ov)"
        const scoreMatch = inning.score.match(/(\d+)/);
        const oversMatch = inning.score.match(/\((\d+)\.(\d+)\s*[Oo]v/);
        if (!scoreMatch) return data;
        const totalRuns = parseInt(scoreMatch[1], 10);
        const lastOver = data.overs[data.overs.length - 1];
        if (!lastOver) return data;
        // Check if there's a partial over (e.g., 18.4 means the 19th over was partial)
        if (oversMatch) {
            const completedOvers = parseInt(oversMatch[1], 10);
            const partialBalls = parseInt(oversMatch[2], 10);
            const partialOverNum = completedOvers + 1;
            // Only add if we don't already have this over and there are partial balls
            if (partialBalls > 0 && !data.overs.some(o => o.overNumber === partialOverNum)) {
                const partialRuns = totalRuns - lastOver.cumulativeScore;
                if (partialRuns >= 0) {
                    return {
                        ...data,
                        overs: [
                            ...data.overs,
                            {
                                overNumber: partialOverNum,
                                runs: partialRuns,
                                wickets: 0,
                                cumulativeScore: totalRuns,
                                cumulativeWickets: lastOver.cumulativeWickets,
                                overSummary: `(${partialRuns} runs, ${partialBalls} balls)`,
                            },
                        ],
                    };
                }
            }
        }
        return data;
    };

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
            <div className="text-center space-y-2 md:space-y-4 py-3 md:py-6 gradient-border px-2 md:px-4">
                <h1 className="text-lg md:text-3xl font-display tracking-tight text-foreground">
                    {scorecard.title}
                </h1>
                <p className="text-xs md:text-lg font-medium px-2 md:px-4 py-1 md:py-2 rounded-full bg-red-500/10 text-red-400 inline-block">
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
                    <AccordionItem value={inning.name} key={index} className="border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl mb-2 md:mb-4 shadow-sm hover:shadow-md transition-shadow">
                        <AccordionTrigger className="px-2 md:px-6 py-2.5 md:py-4 hover:no-underline">
                            <div className="flex items-center justify-between w-full gap-2 md:gap-4">
                                <div className="flex-1 text-left">
                                    <h2 className="text-sm md:text-2xl font-display text-foreground">
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
                                        {getAugmentedOverData(index + 1) && (
                                            <Card className="glass-card">
                                                <CardContent className="p-2 md:p-4">
                                                    <OverByOverChart data={getAugmentedOverData(index + 1)!} />
                                                </CardContent>
                                            </Card>
                                        )}
                                        <Card className="glass-card">
                                            <CardHeader className="border-b dark:border-zinc-800/50 p-2 md:p-6">
                                                <CardTitle className="flex items-center gap-2 text-xs md:text-base">
                                                    {inning.battingTeamName} Batting
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto">
                                                    <Table className="text-xs md:text-sm">
                                                        <TableHeader>
                                                            <TableRow className="hover:bg-transparent">
                                                                <TableHead className="w-[80px] md:w-[200px] font-bold px-1 md:px-3">Batter</TableHead>
                                                                <TableHead className="font-bold px-1 md:px-3">Dismissal</TableHead>
                                                                <TableHead className="text-right font-bold w-8 md:w-12 px-1 md:px-3">R</TableHead>
                                                                <TableHead className="text-right font-bold w-8 md:w-12 px-1 md:px-3">B</TableHead>
                                                                <TableHead className="text-right font-bold w-8 md:w-12 px-1 md:px-3">4s</TableHead>
                                                                <TableHead className="text-right font-bold w-8 md:w-12 px-1 md:px-3">6s</TableHead>
                                                                <TableHead className="text-right font-bold w-8 md:w-12 px-1 md:px-3">SR</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {inning.batsmen.map((batsman, i) => (
                                                                <TableRow key={i}
                                                                    className={`
                                                        transition-colors
                                                        ${Number(batsman.runs) >= 50 ? 'bg-green-50/50 dark:bg-green-950/20' :
                                                                            Number(batsman.runs) >= 30 ? 'bg-emerald-50/30 dark:bg-emerald-950/10' :
                                                                                'even:bg-zinc-50/50 dark:even:bg-zinc-900/30'}
                                                        hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40
                                                    `}
                                                                >
                                                                    <TableCell className="font-medium py-2 md:py-3 px-1 md:px-3">
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
                                                                    <TableCell className="text-muted-foreground px-1 md:px-3">{batsman.dismissal}</TableCell>
                                                                    <TableCell className="text-right font-bold px-1 md:px-3">{batsman.runs}</TableCell>
                                                                    <TableCell className="text-right px-1 md:px-3">{batsman.balls}</TableCell>
                                                                    <TableCell className="text-right px-1 md:px-3">{batsman.fours}</TableCell>
                                                                    <TableCell className="text-right px-1 md:px-3">{batsman.sixes}</TableCell>
                                                                    <TableCell className="text-right px-1 md:px-3">
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

                                        <Card className="glass-card">
                                            <CardHeader className="border-b dark:border-zinc-800/50 p-2 md:p-6">
                                                <CardTitle className="flex items-center gap-2 text-xs md:text-base">
                                                    {inning.bowlingTeamName} Bowling
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto">
                                                    <Table className="text-xs md:text-sm">
                                                        <TableHeader>
                                                            <TableRow className="hover:bg-transparent">
                                                                <TableHead className="w-[80px] md:w-[200px] font-bold px-1 md:px-3">Bowler</TableHead>
                                                                <TableHead className="text-right font-bold w-7 md:w-12 px-1 md:px-3">O</TableHead>
                                                                <TableHead className="text-right font-bold w-7 md:w-12 px-1 md:px-3">M</TableHead>
                                                                <TableHead className="text-right font-bold w-7 md:w-12 px-1 md:px-3">R</TableHead>
                                                                <TableHead className="text-right font-bold w-7 md:w-12 px-1 md:px-3">W</TableHead>
                                                                <TableHead className="text-right font-bold w-7 md:w-12 px-1 md:px-3">NB</TableHead>
                                                                <TableHead className="text-right font-bold w-7 md:w-12 px-1 md:px-3">WD</TableHead>
                                                                <TableHead className="text-right font-bold w-8 md:w-12 px-1 md:px-3">ECO</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {inning.bowlers.map((bowler, i) => (
                                                                <TableRow key={i}
                                                                    className={`
                                                        transition-colors
                                                        ${Number(bowler.wickets) >= 3 ? 'bg-orange-50/50 dark:bg-orange-950/20' :
                                                                            Number(bowler.wickets) >= 2 ? 'bg-amber-50/30 dark:bg-amber-950/10' :
                                                                                'even:bg-zinc-50/50 dark:even:bg-zinc-900/30'}
                                                        hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40
                                                    `}
                                                                >
                                                                    <TableCell className="font-medium py-2 md:py-3 px-1 md:px-3">
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
                                                                    <TableCell className="text-right px-1 md:px-3">{bowler.overs}</TableCell>
                                                                    <TableCell className="text-right px-1 md:px-3">{bowler.maidens}</TableCell>
                                                                    <TableCell className="text-right px-1 md:px-3">{bowler.runs}</TableCell>
                                                                    <TableCell className="text-right px-1 md:px-3">
                                                                        <span className={`font-bold ${Number(bowler.wickets) >= 5 ? 'text-orange-600 dark:text-orange-400' :
                                                                            Number(bowler.wickets) >= 3 ? 'text-amber-600 dark:text-amber-400' :
                                                                                ''
                                                                            }`}>
                                                                            {bowler.wickets}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="text-right px-1 md:px-3">{bowler.noBalls}</TableCell>
                                                                    <TableCell className="text-right px-1 md:px-3">{bowler.wides}</TableCell>
                                                                    <TableCell className="text-right px-1 md:px-3">
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
                                            <Card className="glass-card">
                                                <CardHeader className="border-b dark:border-zinc-800/50 p-2 md:p-6">
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
                                            <Card className="glass-card rounded-none md:rounded-lg">
                                                <CardHeader className="border-b dark:border-zinc-800/50 p-2 md:p-6">
                                                    <CardTitle className="flex items-center gap-2 text-xs md:text-base">
                                                        Fall of Wickets
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="grid gap-2 md:gap-3 p-2 md:p-4">
                                                    {inning.fallOfWickets.map((fow, i) => (
                                                        <div key={i}
                                                            className="flex justify-between items-center gap-2 md:gap-4 p-2 md:p-3 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors"
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-primary text-xs md:text-sm truncate">{fow.player.replace(/,/g, '')}</p>
                                                                <div className="flex items-center gap-1 md:gap-2 mt-0.5 md:mt-1">
                                                                    <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 text-muted-foreground">
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
                                            <Card className="glass-card">
                                                <CardHeader className="border-b dark:border-zinc-800/50 p-2 md:p-6">
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
                    <Card className="glass-card">
                        <CardHeader className="border-b dark:border-zinc-800/50 p-2 md:p-6">
                            <CardTitle className="text-sm md:text-2xl">Match Information</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 md:p-6">
                        <div className="space-y-4 md:space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 pb-3 md:pb-4 border-b dark:border-zinc-800/50">
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
                <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-0 rounded-2xl">
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
