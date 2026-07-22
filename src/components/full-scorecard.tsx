'use client';

import { useEffect, useState } from 'react';
import { getScorecardData, getPlayerProfile } from '@/app/actions';
import type { FullScorecard, PlayerProfile } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle, Table as TableIcon } from 'lucide-react';
import { ScorecardSkeleton } from './match-skeletons';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import PlayerProfileDisplay from './player-profile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import Image from 'next/image';

type DismissalKind =
    | 'not-out' | 'bowled' | 'lbw' | 'caught' | 'caught-and-bowled'
    | 'stumped' | 'run-out' | 'hit-wicket' | 'retired' | 'other';

interface ParsedDismissal {
    kind: DismissalKind;
    fielders?: string[];
    bowler?: string;
    raw: string;
}

// Break a scorecard dismissal string ("c Buttler b Rashid", "lbw b Curran",
// "run out (Brook/Buttler)") into structured parts so the renderer can give
// each role its own typographic weight and colour.
function parseDismissal(text: string): ParsedDismissal {
    const t = (text || '').trim();
    const lower = t.toLowerCase();
    if (!t || lower === 'not out' || lower === 'batting' || lower === '-') {
        return { kind: 'not-out', raw: t };
    }
    let m: RegExpMatchArray | null;
    if ((m = t.match(/^c\s*(?:and|&)\s*b\s+(.+)$/i))) return { kind: 'caught-and-bowled', bowler: m[1].trim(), raw: t };
    if ((m = t.match(/^c\s+(.+?)\s+b\s+(.+)$/i)))     return { kind: 'caught', fielders: [m[1].trim()], bowler: m[2].trim(), raw: t };
    if ((m = t.match(/^lbw\s+b\s+(.+)$/i)))            return { kind: 'lbw', bowler: m[1].trim(), raw: t };
    if ((m = t.match(/^st\s+(.+?)\s+b\s+(.+)$/i)))     return { kind: 'stumped', fielders: [m[1].trim()], bowler: m[2].trim(), raw: t };
    if ((m = t.match(/^hit\s*wicket\s+b\s+(.+)$/i)))   return { kind: 'hit-wicket', bowler: m[1].trim(), raw: t };
    if ((m = t.match(/^b\s+(.+)$/i)))                  return { kind: 'bowled', bowler: m[1].trim(), raw: t };
    if ((m = t.match(/^run\s*out\s*(?:\((.+)\))?$/i))) return { kind: 'run-out', fielders: m[1] ? m[1].split(/[\/,]/).map(s => s.trim()).filter(Boolean) : [], raw: t };
    if (/^retired/i.test(t))                            return { kind: 'retired', raw: t };
    return { kind: 'other', raw: t };
}

// Milestone tag shown beside a batter's name — the innings-defining moments
// (duck, fifty, hundred, double-hundred). Asterisk denotes "still batting".
function milestoneTag(runs: number, isNotOut: boolean): { label: string; className: string } | null {
    if (runs === 0 && !isNotOut) {
        return { label: '🦆', className: '' };
    }
    // The batter name already carries the not-out asterisk — the milestone tag
    // just states the milestone reached.
    if (runs >= 200) return { label: `${Math.floor(runs / 100) * 100}`, className: 'bg-purple-500/15 text-purple-600 dark:text-purple-300' };
    if (runs >= 100) return { label: '100', className: 'bg-green-500/15 text-green-700 dark:text-green-400' };
    if (runs >= 50)  return { label: '50', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' };
    return null;
}

function DismissalCell({ text }: { text: string }) {
    const d = parseDismissal(text);

    if (d.kind === 'not-out') {
        return <span className="text-emerald-600 dark:text-emerald-400 font-semibold">not out</span>;
    }

    const Bowler = ({ name }: { name?: string }) => <span className="font-semibold text-foreground">{name}</span>;
    const Fielder = ({ name }: { name?: string }) => <span className="italic text-foreground">{name}</span>;

    return (
        <span className="text-muted-foreground">
            {d.kind === 'bowled' && (<>b <Bowler name={d.bowler} /></>)}
            {d.kind === 'lbw' && (<>lbw b <Bowler name={d.bowler} /></>)}
            {d.kind === 'caught' && (<>c <Fielder name={d.fielders?.[0]} /> b <Bowler name={d.bowler} /></>)}
            {d.kind === 'caught-and-bowled' && (<>c &amp; b <Bowler name={d.bowler} /></>)}
            {d.kind === 'stumped' && (<>st <Fielder name={d.fielders?.[0]} /> b <Bowler name={d.bowler} /></>)}
            {d.kind === 'hit-wicket' && (<>hit wicket b <Bowler name={d.bowler} /></>)}
            {d.kind === 'run-out' && (
                <>
                    run out
                    {d.fielders && d.fielders.length > 0 && (
                        <> (<Fielder name={d.fielders.join(' / ')} />)</>
                    )}
                </>
            )}
            {(d.kind === 'retired' || d.kind === 'other') && d.raw}
        </span>
    );
}

// Module-scoped cache so switching away from the Scorecard tab and back doesn't
// re-flash the skeleton — every remount reads the last-known payload as the
// initial state.
const scorecardCache = new Map<string, FullScorecard>();
const scorecardInFlight = new Map<string, Promise<void>>();

// Fire from the parent match page so the scorecard payload is warm by the time
// the user clicks the tab. Cheap no-op if already cached or already in-flight.
export function prefetchScorecard(matchId: string): Promise<void> {
    if (scorecardCache.has(matchId)) return Promise.resolve();
    const existing = scorecardInFlight.get(matchId);
    if (existing) return existing;
    const p = getScorecardData(matchId)
        .then((res) => {
            if (res.success && res.data) scorecardCache.set(matchId, res.data);
        })
        .catch(() => {})
        .finally(() => { scorecardInFlight.delete(matchId); });
    scorecardInFlight.set(matchId, p);
    return p;
}

export default function FullScorecardDisplay({ matchId }: { matchId: string }) {
    const [scorecard, setScorecard] = useState<FullScorecard | null>(() => scorecardCache.get(matchId) ?? null);
    const [loading, setLoading] = useState(() => !scorecardCache.has(matchId));
    const [error, setError] = useState<string | null>(null);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
    // Mobile "expand table" modal — which inning's batting/bowling table is open.
    const [tableModal, setTableModal] = useState<{ inningIdx: number; kind: 'batting' | 'bowling' } | null>(null);
    useEffect(() => {
        let cancelled = false;
        const fetchScorecard = async (isBackgroundPoll: boolean) => {
            if (!isBackgroundPoll) setError(null);
            const result = await getScorecardData(matchId);
            if (cancelled) return;
            if (result.success && result.data) {
                scorecardCache.set(matchId, result.data);
                setScorecard(result.data);
                setError(null);
            } else if (!isBackgroundPoll && !scorecardCache.has(matchId)) {
                setError(result.error ?? 'Failed to fetch scorecard data.');
            }
            if (!isBackgroundPoll) setLoading(false);
        };

        // If a prefetch is already in-flight, await it — no duplicate fetch.
        const inflight = scorecardInFlight.get(matchId);
        if (inflight) {
            inflight.then(() => {
                if (cancelled) return;
                const cached = scorecardCache.get(matchId);
                if (cached) { setScorecard(cached); setError(null); }
                setLoading(false);
            });
        } else {
            fetchScorecard(false);
        }
        const interval = setInterval(() => fetchScorecard(true), 30000);
        return () => { cancelled = true; clearInterval(interval); };
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
        return <ScorecardSkeleton />;
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
                className="w-full px-0 md:px-4"
            >
                {scorecard.innings.map((inning, index) => (
                    <AccordionItem value={inning.name} key={index} className="border border-border/50 rounded-none md:rounded-2xl mb-2 md:mb-4 shadow-sm hover:shadow-md transition-shadow">
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
                                        <Card className="surface-card rounded-none md:rounded-lg">
                                            <CardHeader className="border-b border-border/50 p-2 md:p-6">
                                                <div className="flex items-center justify-between gap-2">
                                                    <CardTitle className="flex items-center gap-2 text-xs md:text-base">
                                                        {inning.battingTeamName} Batting
                                                    </CardTitle>
                                                    {/* Mobile-only: expand to the full desktop-style table in a modal. */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setTableModal({ inningIdx: index, kind: 'batting' })}
                                                        aria-label="Open full table"
                                                        className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                                    >
                                                        <TableIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                {/* Mobile: compact 2-line row per batter — name+tag+score on top, dismissal+4s/6s/SR beneath.
                                                    Desktop keeps the full table. */}
                                                <div className="md:hidden">
                                                    {inning.batsmen.map((batsman, i) => {
                                                        const isNotOut = parseDismissal(batsman.dismissal).kind === 'not-out';
                                                        const runs = Number(batsman.runs);
                                                        const tag = milestoneTag(runs, isNotOut);
                                                        const sr = parseFloat(batsman.strikeRate);
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`flex items-start gap-3 px-3 py-2.5 border-b border-border/40 last:border-b-0 ${
                                                                    isNotOut ? 'bg-emerald-500/[0.05] dark:bg-emerald-500/[0.06]' :
                                                                    runs >= 50 ? 'bg-green-50/50 dark:bg-green-950/20' : ''
                                                                }`}
                                                            >
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span
                                                                            className={`text-sm font-semibold ${batsman.profileId ? 'active:text-primary' : ''} ${
                                                                                isNotOut ? 'text-emerald-600 dark:text-emerald-400' :
                                                                                runs >= 50 ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                                                                            }`}
                                                                            onClick={() => handleProfileClick(batsman.profileId, batsman.name)}
                                                                        >
                                                                            {batsman.name}{isNotOut && <span className="ml-0.5">*</span>}
                                                                        </span>
                                                                        {tag && (
                                                                            <span className={`inline-flex items-center rounded font-bold tracking-wide ${
                                                                                tag.label === '🦆'
                                                                                    ? 'text-base leading-none'
                                                                                    : 'h-4 px-1.5 text-[10px]'
                                                                            } ${tag.className}`}>
                                                                                {tag.label}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[11px] mt-0.5 leading-snug">
                                                                        <DismissalCell text={batsman.dismissal} />
                                                                    </div>
                                                                </div>
                                                                <div className="text-right tabular-nums shrink-0">
                                                                    <div className="text-base font-bold text-foreground">
                                                                        {batsman.runs}
                                                                        <span className="text-muted-foreground font-normal text-[11px] ml-1">({batsman.balls})</span>
                                                                    </div>
                                                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                                                        {Number(batsman.fours) > 0 && (
                                                                            <span className="mr-1.5 text-blue-500 dark:text-blue-400 font-semibold">{batsman.fours}×4</span>
                                                                        )}
                                                                        {Number(batsman.sixes) > 0 && (
                                                                            <span className="mr-1.5 text-violet-500 dark:text-violet-400 font-semibold">{batsman.sixes}×6</span>
                                                                        )}
                                                                        <span className={
                                                                            sr >= 150 ? 'text-green-600 dark:text-green-400 font-semibold' :
                                                                            sr >= 100 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''
                                                                        }>
                                                                            SR {batsman.strikeRate}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="hidden md:block overflow-x-auto">
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
                                                            {inning.batsmen.map((batsman, i) => {
                                                                const isNotOut = parseDismissal(batsman.dismissal).kind === 'not-out';
                                                                const runs = Number(batsman.runs);
                                                                const tag = milestoneTag(runs, isNotOut);
                                                                return (
                                                                <TableRow key={i}
                                                                    className={`
                                                        transition-colors
                                                        ${isNotOut ? 'bg-emerald-500/[0.05] dark:bg-emerald-500/[0.06]' :
                                                                            runs >= 50 ? 'bg-green-50/50 dark:bg-green-950/20' :
                                                                            runs >= 30 ? 'bg-emerald-50/30 dark:bg-emerald-950/10' :
                                                                                'even:bg-muted/30'}
                                                        hover:bg-muted/40
                                                    `}
                                                                >
                                                                    <TableCell className="font-medium py-2 md:py-3 px-1 md:px-3">
                                                                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                                                                            <span
                                                                                className={`
                                                            ${batsman.profileId ?
                                                                                    "cursor-pointer hover:text-primary transition-colors" : ""}
                                                            ${isNotOut ? 'text-emerald-600 dark:text-emerald-400 font-semibold' :
                                                                                runs >= 50 ? 'text-green-600 dark:text-green-400' : ''}
                                                        `}
                                                                                onClick={() => handleProfileClick(batsman.profileId, batsman.name)}
                                                                            >
                                                                                {batsman.name}{isNotOut && <span className="ml-0.5">*</span>}
                                                                            </span>
                                                                            {tag && (
                                                                                <span className={`inline-flex items-center h-4 px-1.5 rounded text-[10px] font-bold tracking-wide ${tag.className}`}>
                                                                                    {tag.label}
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="px-1 md:px-3"><DismissalCell text={batsman.dismissal} /></TableCell>
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
                                                                );
                                                            })}
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

                                        <Card className="surface-card rounded-none md:rounded-lg">
                                            <CardHeader className="border-b border-border/50 p-2 md:p-6">
                                                <div className="flex items-center justify-between gap-2">
                                                    <CardTitle className="flex items-center gap-2 text-xs md:text-base">
                                                        {inning.bowlingTeamName} Bowling
                                                    </CardTitle>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTableModal({ inningIdx: index, kind: 'bowling' })}
                                                        aria-label="Open full table"
                                                        className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                                    >
                                                        <TableIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                {/* Mobile: bowler row with O-M-R-W as the "figures" line, extras/econ beneath. */}
                                                <div className="md:hidden">
                                                    {inning.bowlers.map((bowler, i) => {
                                                        const wkts = Number(bowler.wickets);
                                                        const eco = parseFloat(bowler.economy);
                                                        const fiveFer = wkts >= 5;
                                                        const threeFer = wkts >= 3;
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`flex items-start gap-3 px-3 py-2.5 border-b border-border/40 last:border-b-0 ${
                                                                    fiveFer ? 'bg-orange-500/[0.08]' :
                                                                    threeFer ? 'bg-orange-500/[0.05]' : ''
                                                                }`}
                                                            >
                                                                <div className="flex-1 min-w-0">
                                                                    <div
                                                                        className={`text-sm font-semibold ${bowler.profileId ? 'active:text-primary' : ''} ${
                                                                            threeFer ? 'text-orange-600 dark:text-orange-400' : 'text-foreground'
                                                                        }`}
                                                                        onClick={() => handleProfileClick(bowler.profileId, bowler.name)}
                                                                    >
                                                                        {bowler.name}
                                                                    </div>
                                                                    <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                                                                        <span className="mr-1.5">M {bowler.maidens}</span>
                                                                        <span className="mr-1.5">NB {bowler.noBalls}</span>
                                                                        <span className="mr-1.5">WD {bowler.wides}</span>
                                                                        <span className={
                                                                            eco <= 4 ? 'text-green-600 dark:text-green-400 font-semibold' :
                                                                            eco <= 6 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' :
                                                                            eco >= 10 ? 'text-red-600 dark:text-red-400 font-semibold' : ''
                                                                        }>
                                                                            ECO {bowler.economy}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right tabular-nums shrink-0">
                                                                    <div className="text-base font-bold text-foreground">
                                                                        <span className={
                                                                            fiveFer ? 'text-orange-600 dark:text-orange-400' :
                                                                            threeFer ? 'text-amber-600 dark:text-amber-400' : ''
                                                                        }>{bowler.wickets}</span>
                                                                        <span className="text-muted-foreground font-normal">/</span>
                                                                        <span>{bowler.runs}</span>
                                                                    </div>
                                                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                                                        {bowler.overs} overs
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="hidden md:block overflow-x-auto">
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
                                                                                'even:bg-muted/30'}
                                                        hover:bg-muted/40
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
                                            <Card className="surface-card rounded-none md:rounded-lg">
                                                <CardHeader className="border-b border-border/50 p-2 md:p-6">
                                                    <CardTitle className="flex items-center gap-2 text-xs md:text-base">
                                                        Partnerships
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="grid gap-2 md:gap-3 p-2 md:p-4">
                                                    {inning.partnerships.map((partnership, i) => (
                                                        <div key={i}
                                                            className="p-2 md:p-4 rounded-lg bg-muted/40 border border-border hover:shadow-md transition-all"
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
                                            <Card className="surface-card rounded-none md:rounded-lg">
                                                <CardHeader className="border-b border-border/50 p-2 md:p-6">
                                                    <CardTitle className="flex items-center gap-2 text-xs md:text-base">
                                                        Fall of Wickets
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="grid gap-2 md:gap-3 p-2 md:p-4">
                                                    {inning.fallOfWickets.map((fow, i) => (
                                                        <div key={i}
                                                            className="flex justify-between items-center gap-2 md:gap-4 p-2 md:p-3 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors"
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-primary text-xs md:text-sm truncate">{fow.player.replace(/,/g, '')}</p>
                                                                <div className="flex items-center gap-1 md:gap-2 mt-0.5 md:mt-1">
                                                                    <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
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
                                            <Card className="surface-card rounded-none md:rounded-lg">
                                                <CardHeader className="border-b border-border/50 p-2 md:p-6">
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
            <div className="px-0 md:px-4">
                {scorecard.matchInfo && (
                    <Card className="surface-card rounded-none md:rounded-lg">
                        <CardHeader className="border-b border-border/50 p-2 md:p-6">
                            <CardTitle className="text-sm md:text-2xl">Match Information</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 md:p-6">
                        <div className="space-y-4 md:space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 pb-3 md:pb-4 border-b border-border/50">
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
                                {(scorecard.matchInfo.playerOfTheMatch || scorecard.matchInfo.playerOfTheSeries) && (
                                    <div className="flex flex-wrap gap-3 pt-3 md:pt-4 border-t border-border/50">
                                        {scorecard.matchInfo.playerOfTheMatch && (
                                            <button
                                                onClick={() => {
                                                    if (scorecard.matchInfo?.playerOfTheMatch?.profileId) {
                                                        setSelectedProfileId(scorecard.matchInfo.playerOfTheMatch.profileId);
                                                        setSelectedPlayerName(scorecard.matchInfo.playerOfTheMatch.name);
                                                    }
                                                }}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex-1 min-w-[200px]"
                                            >
                                                {scorecard.matchInfo.playerOfTheMatch.imageUrl && (
                                                    <Image src={scorecard.matchInfo.playerOfTheMatch.imageUrl} alt={scorecard.matchInfo.playerOfTheMatch.name} width={225} height={225} className="w-10 h-10 rounded-full object-cover" unoptimized />
                                                )}
                                                <div className="text-left">
                                                    <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">Player of the Match</p>
                                                    <p className="text-sm font-medium">{scorecard.matchInfo.playerOfTheMatch.name}</p>
                                                </div>
                                            </button>
                                        )}
                                        {scorecard.matchInfo.playerOfTheSeries && (
                                            <button
                                                onClick={() => {
                                                    if (scorecard.matchInfo?.playerOfTheSeries?.profileId) {
                                                        setSelectedProfileId(scorecard.matchInfo.playerOfTheSeries.profileId);
                                                        setSelectedPlayerName(scorecard.matchInfo.playerOfTheSeries.name);
                                                    }
                                                }}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors flex-1 min-w-[200px]"
                                            >
                                                {scorecard.matchInfo.playerOfTheSeries.imageUrl && (
                                                    <Image src={scorecard.matchInfo.playerOfTheSeries.imageUrl} alt={scorecard.matchInfo.playerOfTheSeries.name} width={225} height={225} className="w-10 h-10 rounded-full object-cover" unoptimized />
                                                )}
                                                <div className="text-left">
                                                    <p className="text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400 font-semibold">Player of the Series</p>
                                                    <p className="text-sm font-medium">{scorecard.matchInfo.playerOfTheSeries.name}</p>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                )}
            </div>

            {/* Full-table modal — mobile users tap the table icon on the batting
                or bowling card header to see the full desktop-style table. */}
            <Dialog open={tableModal !== null} onOpenChange={(open) => { if (!open) setTableModal(null); }}>
                <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl">
                    <DialogHeader className="p-4 md:p-6 border-b border-border/50">
                        <DialogTitle className="text-base md:text-xl font-display">
                            {tableModal && scorecard.innings[tableModal.inningIdx] && (
                                tableModal.kind === 'batting'
                                    ? `${scorecard.innings[tableModal.inningIdx].battingTeamName} Batting`
                                    : `${scorecard.innings[tableModal.inningIdx].bowlingTeamName} Bowling`
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    {tableModal && scorecard.innings[tableModal.inningIdx] && (() => {
                        const inning = scorecard.innings[tableModal.inningIdx];
                        if (tableModal.kind === 'batting') {
                            return (
                                <div className="overflow-x-auto p-2 md:p-4">
                                    <Table className="text-xs md:text-sm">
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-[120px] font-bold px-2">Batter</TableHead>
                                                <TableHead className="font-bold px-2">Dismissal</TableHead>
                                                <TableHead className="text-right font-bold w-10 px-2">R</TableHead>
                                                <TableHead className="text-right font-bold w-10 px-2">B</TableHead>
                                                <TableHead className="text-right font-bold w-10 px-2">4s</TableHead>
                                                <TableHead className="text-right font-bold w-10 px-2">6s</TableHead>
                                                <TableHead className="text-right font-bold w-12 px-2">SR</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {inning.batsmen.map((batsman, i) => {
                                                const isNotOut = parseDismissal(batsman.dismissal).kind === 'not-out';
                                                const runs = Number(batsman.runs);
                                                const tag = milestoneTag(runs, isNotOut);
                                                const sr = parseFloat(batsman.strikeRate);
                                                return (
                                                    <TableRow key={i} className={`transition-colors ${
                                                        isNotOut ? 'bg-emerald-500/[0.05] dark:bg-emerald-500/[0.06]' :
                                                        runs >= 50 ? 'bg-green-50/50 dark:bg-green-950/20' :
                                                        runs >= 30 ? 'bg-emerald-50/30 dark:bg-emerald-950/10' :
                                                        'even:bg-muted/30'
                                                    } hover:bg-muted/40`}>
                                                        <TableCell className="font-medium py-2 px-2">
                                                            <span className="inline-flex items-center gap-1.5 flex-wrap">
                                                                <span
                                                                    className={`${batsman.profileId ? 'cursor-pointer hover:text-primary transition-colors' : ''} ${
                                                                        isNotOut ? 'text-emerald-600 dark:text-emerald-400 font-semibold' :
                                                                        runs >= 50 ? 'text-green-600 dark:text-green-400' : ''
                                                                    }`}
                                                                    onClick={() => handleProfileClick(batsman.profileId, batsman.name)}
                                                                >
                                                                    {batsman.name}{isNotOut && <span className="ml-0.5">*</span>}
                                                                </span>
                                                                {tag && (
                                                                    <span className={`inline-flex items-center rounded font-bold tracking-wide ${
                                                                        tag.label === '🦆' ? 'text-base leading-none' : 'h-4 px-1.5 text-[10px]'
                                                                    } ${tag.className}`}>
                                                                        {tag.label}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="px-2"><DismissalCell text={batsman.dismissal} /></TableCell>
                                                        <TableCell className="text-right font-bold px-2 tabular-nums">{batsman.runs}</TableCell>
                                                        <TableCell className="text-right px-2 tabular-nums">{batsman.balls}</TableCell>
                                                        <TableCell className="text-right px-2 tabular-nums">{batsman.fours}</TableCell>
                                                        <TableCell className="text-right px-2 tabular-nums">{batsman.sixes}</TableCell>
                                                        <TableCell className="text-right px-2 tabular-nums">
                                                            <span className={
                                                                sr >= 150 ? 'text-green-600 dark:text-green-400' :
                                                                sr >= 100 ? 'text-emerald-600 dark:text-emerald-400' : ''
                                                            }>{batsman.strikeRate}</span>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                    <div className="mt-4 space-y-1.5 text-xs md:text-sm px-1">
                                        <div className="flex justify-between"><span className="font-semibold">Extras</span><span>{inning.extras}</span></div>
                                        <div className="flex justify-between font-bold text-sm md:text-base"><span>Total</span><span>{inning.total}</span></div>
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div className="overflow-x-auto p-2 md:p-4">
                                <Table className="text-xs md:text-sm">
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[120px] font-bold px-2">Bowler</TableHead>
                                            <TableHead className="text-right font-bold w-10 px-2">O</TableHead>
                                            <TableHead className="text-right font-bold w-10 px-2">M</TableHead>
                                            <TableHead className="text-right font-bold w-10 px-2">R</TableHead>
                                            <TableHead className="text-right font-bold w-10 px-2">W</TableHead>
                                            <TableHead className="text-right font-bold w-10 px-2">NB</TableHead>
                                            <TableHead className="text-right font-bold w-10 px-2">WD</TableHead>
                                            <TableHead className="text-right font-bold w-12 px-2">ECO</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {inning.bowlers.map((bowler, i) => {
                                            const wkts = Number(bowler.wickets);
                                            const eco = parseFloat(bowler.economy);
                                            return (
                                                <TableRow key={i} className={`transition-colors ${
                                                    wkts >= 3 ? 'bg-orange-50/50 dark:bg-orange-950/20' :
                                                    wkts >= 2 ? 'bg-amber-50/30 dark:bg-amber-950/10' :
                                                    'even:bg-muted/30'
                                                } hover:bg-muted/40`}>
                                                    <TableCell className="font-medium py-2 px-2">
                                                        <span
                                                            className={`${bowler.profileId ? 'cursor-pointer hover:text-primary transition-colors' : ''} ${
                                                                wkts >= 3 ? 'text-orange-600 dark:text-orange-400' : ''
                                                            }`}
                                                            onClick={() => handleProfileClick(bowler.profileId, bowler.name)}
                                                        >{bowler.name}</span>
                                                    </TableCell>
                                                    <TableCell className="text-right px-2 tabular-nums">{bowler.overs}</TableCell>
                                                    <TableCell className="text-right px-2 tabular-nums">{bowler.maidens}</TableCell>
                                                    <TableCell className="text-right px-2 tabular-nums">{bowler.runs}</TableCell>
                                                    <TableCell className="text-right px-2 tabular-nums">
                                                        <span className={`font-bold ${
                                                            wkts >= 5 ? 'text-orange-600 dark:text-orange-400' :
                                                            wkts >= 3 ? 'text-amber-600 dark:text-amber-400' : ''
                                                        }`}>{bowler.wickets}</span>
                                                    </TableCell>
                                                    <TableCell className="text-right px-2 tabular-nums">{bowler.noBalls}</TableCell>
                                                    <TableCell className="text-right px-2 tabular-nums">{bowler.wides}</TableCell>
                                                    <TableCell className="text-right px-2 tabular-nums">
                                                        <span className={
                                                            eco <= 4 ? 'text-green-600 dark:text-green-400' :
                                                            eco <= 6 ? 'text-emerald-600 dark:text-emerald-400' :
                                                            eco >= 10 ? 'text-red-600 dark:text-red-400' : ''
                                                        }>{bowler.economy}</span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Player Profile Dialog */}
            <Dialog open={!!selectedProfileId} onOpenChange={handleDialogOpenChange}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
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
