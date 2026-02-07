
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getScoreForMatchId, loadMoreCommentary as loadMoreCommentaryAction, getPlayerProfile, getPlayerHighlights } from '@/app/actions';
import type { ScrapeCricbuzzUrlOutput, Commentary, PlayerProfile, PlayerHighlights } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoaderCircle, User, ArrowLeft } from "lucide-react";
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import FullScorecard from './full-scorecard';
import PlayerProfileDisplay from './player-profile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import MatchSquadsDisplay from './match-squads';
import { ThemeToggle } from './theme-toggle';
import WinProbability from './win-probability';

export interface ScrapeState {
    success: boolean;
    data?: ScrapeCricbuzzUrlOutput | null;
    error?: string | null;
    matchId?: string | null;
}

type LastEventType = {
    text: string;
    key: number;
    variant: 'default' | 'destructive' | 'four' | 'six';
};

type View = 'live' | 'scorecard' | 'squads';


export default function ScoreDisplay({ matchId }: { matchId: string }) {
    const router = useRouter();
    const [scoreState, setScoreState] = useState<ScrapeState>({ success: false });
    const [lastEvent, setLastEvent] = useState<LastEventType | null>(null);
    const previousData = useRef<ScrapeCricbuzzUrlOutput | null>(null);
    const [view, setView] = useState<View>('live');
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastTimestamp, setLastTimestamp] = useState<number | null>(null);
    const lastTimestampRef = useRef<number | null>(null);
    const commentaryEndRef = useRef<HTMLDivElement>(null);
    const newCommentaryStartRef = useRef<HTMLDivElement>(null);
    const loadedExtraCommentaryRef = useRef<Commentary[]>([]);
    const [newCommentaryStartIndex, setNewCommentaryStartIndex] = useState<number | null>(null);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [highlightsData, setHighlightsData] = useState<PlayerHighlights | null>(null);
    const [highlightsLoading, setHighlightsLoading] = useState(false);
    const [highlightsUrl, setHighlightsUrl] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);


    const fetchScore = async () => {
        if (!matchId) return;
        const newState = await getScoreForMatchId(matchId);

        if (newState.data?.commentary && loadedExtraCommentaryRef.current.length > 0) {
            setScoreState({
                ...newState,
                data: {
                    ...newState.data,
                    commentary: [...newState.data.commentary, ...loadedExtraCommentaryRef.current],
                },
            });
        } else {
            setScoreState(newState);
        }

        if (newState.data?.oldestCommentaryTimestamp && lastTimestampRef.current === null) {
            lastTimestampRef.current = newState.data.oldestCommentaryTimestamp;
            setLastTimestamp(newState.data.oldestCommentaryTimestamp);
        }
    };

    const loadMoreCommentary = async () => {
        const currentTimestamp = lastTimestampRef.current;
        if (!matchId || !currentTimestamp || loadingMore || currentTimestamp === 0) return;

        setLoadingMore(true);
        try {
            const inningsId = scoreState.data?.currentInningsId || 1;
            const result = await loadMoreCommentaryAction(matchId, currentTimestamp - 1, inningsId);

            if (result.success && result.commentary && result.commentary.length > 0) {
                const extractKey = (c: Commentary) => {
                    if (c.type === 'live' && c.text.includes(':')) return c.text.split(':')[0].trim();
                    return c.text;
                };

                const currentCommentary = scoreState.data?.commentary || [];
                const existingKeys = new Set([
                    ...currentCommentary.map(extractKey),
                    ...loadedExtraCommentaryRef.current.map(extractKey)
                ]);
                const newCommentary = result.commentary.filter(c => !existingKeys.has(extractKey(c)));

                if (result.timestamp && result.timestamp < (lastTimestampRef.current || Infinity)) {
                    lastTimestampRef.current = result.timestamp;
                    setLastTimestamp(result.timestamp);
                }

                if (newCommentary.length === 0) return;

                const currentCommentaryLength = scoreState.data?.commentary.length || 0;
                setNewCommentaryStartIndex(currentCommentaryLength);

                loadedExtraCommentaryRef.current = [...loadedExtraCommentaryRef.current, ...newCommentary];

                setScoreState(prev => {
                    if (!prev.data) return prev;
                    return {
                        ...prev,
                        data: {
                            ...prev.data,
                            commentary: [...prev.data.commentary, ...newCommentary],
                        },
                    };
                });

                setTimeout(() => {
                    newCommentaryStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            } else if (result.success && result.commentary && result.commentary.length === 0) {
                lastTimestampRef.current = 0;
                setLastTimestamp(0);
            }
        } catch (e) {
            console.error('[Client] Failed to load more commentary:', e);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchScore();
        const interval = setInterval(fetchScore, 10000);
        return () => clearInterval(interval);
    }, [matchId]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!selectedProfileId) return;
            setProfileLoading(true);
            const result = await getPlayerProfile(selectedProfileId, selectedPlayerName || undefined);
            if (result.success && result.data) setSelectedProfile(result.data);
            setProfileLoading(false);
        };
        fetchProfile();
    }, [selectedProfileId, selectedPlayerName]);

    useEffect(() => {
        if (!scoreState.data?.matchStartTimestamp) return;
        const updateCountdown = () => {
            const now = Date.now();
            const diff = scoreState.data!.matchStartTimestamp! - now;
            if (diff <= 0) { setTimeLeft(null); return; }
            setTimeLeft({
                hours: Math.floor(diff / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000),
            });
        };
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [scoreState.data?.matchStartTimestamp]);

    const parseScore = (score: string): { runs: number, wickets: number } | null => {
        if (!score || !score.includes('/')) return null;
        const parts = score.split(' ')[1]?.split('/');
        if (!parts || parts.length < 2) return null;
        const runs = parseInt(parts[0], 10);
        const wickets = parseInt(parts[1], 10);
        if (isNaN(runs) || isNaN(wickets)) return null;
        return { runs, wickets };
    }

    const parseOvers = (score: string): number | null => {
        if (!score || !score.includes('(')) return null;
        const oversMatch = score.match(/\(([^)]+)\)/);
        if (!oversMatch || !oversMatch[1]) return null;
        const overs = parseFloat(oversMatch[1]);
        if (isNaN(overs)) return null;
        return overs;
    }

    useEffect(() => {
        if (scoreState.data && previousData.current) {
            const currentScore = parseScore(scoreState.data.score);
            const prevScore = parseScore(previousData.current.score);
            const currentOvers = parseOvers(scoreState.data.score);
            const prevOvers = parseOvers(previousData.current.score);
            const isLive = !scoreState.data.status.toLowerCase().includes('complete') && !scoreState.data.status.toLowerCase().includes('won');

            let eventToShow: Omit<LastEventType, 'key'> | null = null;
            if (currentScore && prevScore && isLive) {
                const runDiff = currentScore.runs - prevScore.runs;
                const wicketDiff = currentScore.wickets - prevScore.wickets;
                const oversChanged = currentOvers !== null && prevOvers !== null && currentOvers > prevOvers;

                if (wicketDiff > 0) eventToShow = { text: 'W', variant: 'destructive' };
                else if (runDiff === 6) eventToShow = { text: '6', variant: 'six' };
                else if (runDiff === 4) eventToShow = { text: '4', variant: 'four' };
                else if (runDiff > 0 && runDiff < 4) eventToShow = { text: `+${runDiff}`, variant: 'default' };
                else if (runDiff === 0 && wicketDiff === 0 && oversChanged) eventToShow = { text: 'DOT', variant: 'default' };
            }
            if (eventToShow) setLastEvent({ ...eventToShow, key: Date.now() });
        }
        if (scoreState.data) previousData.current = scoreState.data;
    }, [scoreState.data]);


    if (scoreState.error) {
        return (
            <div className="max-w-4xl mx-auto px-4">
                <Alert variant="destructive" className="mt-8 rounded-2xl">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{scoreState.error}</AlertDescription>
                </Alert>
            </div>
        )
    }

    const { data } = scoreState;

    if (!data && !scoreState.error) {
        return (
            <div className="w-full flex items-center justify-center p-8 mt-16">
                <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Fetching live score...</p>
            </div>
        )
    }

    const renderCommentaryItem = (comment: Commentary, index: number) => {
        if (comment.type === 'user' && comment.author) {
            return (
                <div key={index} className="slide-in-left ml-8 md:ml-12 py-2 px-3 my-1 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                    <div className="flex items-center gap-2 mb-1">
                        <User size={12} className="text-muted-foreground" />
                        <span className="text-xs font-semibold text-primary">{comment.author}</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic" dangerouslySetInnerHTML={{ __html: `"${comment.text}"` }} />
                </div>
            );
        }

        if (comment.type === 'stat') {
            const isShortText = comment.text.length < 100;
            return (
                <div key={index} className="slide-in-left py-3 px-4 my-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/30 dark:border-zinc-800/30">
                    <p className={`text-xs text-muted-foreground ${isShortText ? 'text-center font-medium' : ''}`} dangerouslySetInnerHTML={{ __html: comment.text }} />
                </div>
            );
        }

        const over = comment.text.split(':')[0];
        const text = comment.text.substring(comment.text.indexOf(':') + 1);
        const events = comment.event?.split(',').map(e => e.toUpperCase()) || [];

        const getEventDisplay = (event: string) => {
            switch (event) {
                case 'FOUR': return { text: '4', className: 'bg-blue-500 text-white' };
                case 'SIX': return { text: '6', className: 'bg-purple-600 text-white' };
                case 'WICKET': return { text: 'W', className: 'bg-red-600 text-white' };
                case 'FIFTY': return { text: '50', className: 'bg-green-500 text-white text-[10px] px-1' };
                case 'HUNDRED': return { text: '100', className: 'bg-amber-500 text-white text-[10px] px-1' };
                default: return null;
            }
        }

        return (
            <div key={index} className="slide-in-left">
                {comment.overSummary && (
                    <div className="my-3 p-2.5 md:p-4 rounded-2xl bg-gradient-to-r from-primary/8 via-primary/4 to-primary/8 dark:from-primary/10 dark:via-primary/5 dark:to-primary/10 border border-primary/15">
                        {(() => {
                            const summaryStr = comment.overSummary || '';
                            const runsMatch = summaryStr.match(/\((\d+)\s*runs?\)/i);
                            const overRuns = runsMatch ? parseInt(runsMatch[1], 10) : comment.overRuns;
                            const ballsStr = summaryStr.replace(/\(\d+\s*runs?\)/i, '').trim();

                            return (
                                <>
                                    {/* Mobile layout */}
                                    <div className="flex md:hidden items-start gap-2.5 py-1">
                                        <div className="flex-shrink-0 flex flex-col items-center bg-primary/15 dark:bg-primary/20 rounded-xl px-2.5 py-2 min-w-[44px]">
                                            <span className="text-[9px] text-muted-foreground font-medium">Over</span>
                                            <span className="text-xl font-display text-primary">{Math.floor(comment.overNumber || 0)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {ballsStr.split(/\s+/).map((ball, idx) => {
                                                    const ballStr = ball.trim();
                                                    if (!ballStr || ballStr.includes('(') || ballStr.includes(')') || ballStr.toLowerCase() === 'runs' || ballStr.toLowerCase() === 'run') return null;
                                                    if (ballStr.toLowerCase().includes('wd') || ballStr.toLowerCase().includes('wide')) return null;

                                                    let ballClass = "w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center";
                                                    let ballContent = ballStr;

                                                    if (ballStr === '6') ballClass += " bg-purple-600 text-white";
                                                    else if (ballStr === '4') ballClass += " bg-blue-600 text-white";
                                                    else if (ballStr === 'W' || ballStr.includes('W')) ballClass += " bg-red-600 text-white";
                                                    else if (ballStr.toLowerCase().startsWith('n') && ballStr.length <= 3) ballClass += " bg-orange-500 text-white text-[8px]";
                                                    else if (ballStr.toLowerCase().includes('nb') || ballStr.toLowerCase().includes('noball')) { ballClass += " bg-orange-500 text-white text-[8px]"; ballContent = 'Nb'; }
                                                    else if (ballStr.toLowerCase().includes('lb') || ballStr.toLowerCase().includes('legbye')) { ballClass += " bg-zinc-500 text-white text-[8px]"; ballContent = 'Lb'; }
                                                    else if (ballStr.toLowerCase().includes('b') && ballStr.length <= 2) { ballClass += " bg-zinc-500 text-white text-[8px]"; ballContent = 'B'; }
                                                    else if (ballStr === '0' || ballStr === '.') { ballClass += " bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"; ballContent = '\u2022'; }
                                                    else if (/^\d+$/.test(ballStr)) ballClass += " bg-green-600 text-white";
                                                    else ballClass += " bg-zinc-200 dark:bg-zinc-800 text-zinc-500 text-[8px]";

                                                    return <span key={idx} className={ballClass}>{ballContent}</span>;
                                                })}
                                                {overRuns !== undefined && (
                                                    <span className="ml-0.5 font-bold text-[11px] text-primary">
                                                        ({overRuns} {overRuns === 1 ? 'run' : 'runs'})
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 self-start bg-zinc-100/80 dark:bg-zinc-900/80 px-2.5 py-1 rounded-full border border-zinc-200/50 dark:border-zinc-800/50">
                                                <span className="font-bold text-xs text-primary">{comment.teamShortName}</span>
                                                <span className="font-display text-sm font-bold text-foreground">{comment.teamScore}-{comment.teamWickets}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop layout */}
                                    <div className="hidden md:flex items-center gap-4">
                                        <div className="flex-shrink-0 flex flex-col items-center bg-primary/15 dark:bg-primary/20 rounded-xl px-3 py-2 min-w-[48px]">
                                            <span className="text-[10px] text-muted-foreground font-medium">Over</span>
                                            <span className="text-xl font-display text-primary">{Math.floor(comment.overNumber || 0)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {ballsStr.split(/\s+/).map((ball, idx) => {
                                                    const ballStr = ball.trim();
                                                    if (!ballStr || ballStr.includes('(') || ballStr.includes(')') || ballStr.toLowerCase() === 'runs' || ballStr.toLowerCase() === 'run') return null;
                                                    if (ballStr.toLowerCase().includes('wd') || ballStr.toLowerCase().includes('wide')) return null;

                                                    let ballClass = "w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center";
                                                    let ballContent = ballStr;

                                                    if (ballStr === '6') ballClass += " bg-purple-600 text-white";
                                                    else if (ballStr === '4') ballClass += " bg-blue-600 text-white";
                                                    else if (ballStr === 'W' || ballStr.includes('W')) ballClass += " bg-red-600 text-white";
                                                    else if (ballStr.toLowerCase().startsWith('n') && ballStr.length <= 3) ballClass += " bg-orange-500 text-white text-[10px]";
                                                    else if (ballStr.toLowerCase().includes('nb') || ballStr.toLowerCase().includes('noball')) { ballClass += " bg-orange-500 text-white text-[10px]"; ballContent = 'Nb'; }
                                                    else if (ballStr.toLowerCase().includes('lb') || ballStr.toLowerCase().includes('legbye')) { ballClass += " bg-zinc-500 text-white text-[10px]"; ballContent = 'Lb'; }
                                                    else if (ballStr.toLowerCase().includes('b') && ballStr.length <= 2) { ballClass += " bg-zinc-500 text-white text-[10px]"; ballContent = 'B'; }
                                                    else if (ballStr === '0' || ballStr === '.') { ballClass += " bg-zinc-200 dark:bg-zinc-800 text-zinc-500"; ballContent = '\u2022'; }
                                                    else if (/^\d+$/.test(ballStr)) ballClass += " bg-green-600 text-white";
                                                    else ballClass += " bg-zinc-200 dark:bg-zinc-800 text-zinc-500 text-[10px]";

                                                    return <span key={idx} className={ballClass}>{ballContent}</span>;
                                                })}
                                                {overRuns !== undefined && (
                                                    <span className="ml-1 font-bold text-sm text-primary">
                                                        ({overRuns} {overRuns === 1 ? 'run' : 'runs'})
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-1.5 ml-auto bg-zinc-100/80 dark:bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-200/50 dark:border-zinc-800/50">
                                                    <span className="font-bold text-xs text-primary">{comment.teamShortName}</span>
                                                    <span className="font-display text-base text-foreground">{comment.teamScore}-{comment.teamWickets}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}
                <div className="flex gap-3 items-start py-2.5 px-1">
                    <div className="flex flex-col items-center flex-shrink-0 w-10 md:w-12 gap-1">
                        <span className="font-mono text-[11px] text-muted-foreground">{over}</span>
                        {events.map((event, i) => {
                            const eventDisplay = getEventDisplay(event);
                            if (!eventDisplay) return null;
                            const isRound = ['FOUR', 'SIX', 'WICKET'].includes(event);
                            return (
                                <span key={i} className={cn(
                                    "flex items-center justify-center font-bold text-xs",
                                    isRound ? 'w-6 h-6 rounded-full' : 'rounded px-1',
                                    eventDisplay.className
                                )}>
                                    {eventDisplay.text}
                                </span>
                            );
                        })}
                    </div>
                    <p className="text-sm text-foreground/80 flex-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
                </div>
            </div>
        );
    };

    const getEventBadgeVariant = (variant: LastEventType['variant']) => {
        switch (variant) {
            case 'destructive': return 'destructive';
            case 'four': return 'default';
            case 'six': return 'secondary';
            default: return 'default';
        }
    }

    const getEventBadgeClass = (variant: LastEventType['variant']) => {
        switch (variant) {
            case 'four': return 'bg-blue-600 hover:bg-blue-700 text-white';
            case 'six': return 'bg-purple-600 hover:bg-purple-700 text-white';
            default: return '';
        }
    }

    const handleProfileClick = (profileId: string | undefined, playerName?: string) => {
        if (profileId) {
            setSelectedProfileId(profileId);
            setSelectedPlayerName(playerName || null);
            setSelectedProfile(null);
        }
    }

    const handleHighlightsClick = async (url: string) => {
        setHighlightsUrl(url);
        setHighlightsData(null);
        setHighlightsLoading(true);
        try {
            const result = await getPlayerHighlights(url);
            if (result.success && result.data) {
                setHighlightsData(result.data);
            }
        } catch {
            // silently fail
        } finally {
            setHighlightsLoading(false);
        }
    };

    const handleHighlightsDialogClose = (open: boolean) => {
        if (!open) {
            setHighlightsUrl(null);
            setHighlightsData(null);
        }
    };

    const handleDialogOpenChange = (open: boolean) => {
        if (!open) {
            setSelectedProfileId(null);
            setSelectedPlayerName(null);
            setSelectedProfile(null);
        }
    }

    return (
        <div className="w-full mx-auto px-2 md:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col gap-2 mb-4 md:mb-6 py-3 md:py-4 gradient-border">
                {/* Desktop: single row | Mobile: title row */}
                <div className="flex items-start gap-2 md:gap-4">
                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 md:h-9 md:w-9 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 mt-0.5" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base md:text-2xl font-display tracking-tight text-foreground leading-tight line-clamp-2 md:truncate">
                            {data?.title}
                        </h1>
                        <div className="text-[10px] md:text-xs text-muted-foreground mt-1 space-y-0.5">
                            {data?.seriesName && data?.seriesId && (
                                <p className="truncate">
                                    <Link
                                        href={`/series/${data.seriesId}/${data.seriesName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
                                        className="text-primary hover:underline"
                                    >
                                        {data.seriesName}
                                    </Link>
                                </p>
                            )}
                            {data?.venue && data.venue !== 'N/A' && data.venue.trim() !== '' && <p className="truncate">{data.venue}</p>}
                            {data?.toss && data.toss !== 'N/A' && data.toss.trim() !== '' && <p className="truncate">{data.toss}</p>}
                            {data?.matchStartTimestamp && (
                                <p className="truncate">
                                    {new Date(data.matchStartTimestamp).toLocaleDateString('en-US', {
                                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
                                    }).replace(/GMT\+5:30/, 'IST').replace(/GMT([+-]\d{1,2}):?(\d{2})?/, 'GMT$1')}
                                </p>
                            )}
                        </div>
                    </div>
                    {/* Desktop: tabs + theme toggle inline with title */}
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
                            {(['live', 'scorecard', 'squads'] as View[]).map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setView(v)}
                                    className={`
                                        px-4 py-2 rounded-lg text-sm font-medium
                                        transition-all duration-200 text-center
                                        ${view === v
                                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }
                                    `}
                                >
                                    {v.charAt(0).toUpperCase() + v.slice(1)}
                                </button>
                            ))}
                        </div>
                        <ThemeToggle />
                    </div>
                    {/* Mobile: theme toggle */}
                    <div className="shrink-0 md:hidden">
                        <ThemeToggle />
                    </div>
                </div>
                {/* Mobile: tabs row */}
                <div className="flex md:hidden items-center gap-3">
                    <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-xl flex-1">
                        {(['live', 'scorecard', 'squads'] as View[]).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`
                                    flex-1 px-3 py-1.5 rounded-lg text-xs font-medium
                                    transition-all duration-200 text-center
                                    ${view === v
                                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }
                                `}
                            >
                                {v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div>
                {view === 'live' && (
                    <div className="space-y-4">
                        {/* Countdown Timer */}
                        {timeLeft && data?.batsmen.length === 0 && (
                            <div className="glass-card p-8 md:p-12 text-center">
                                <div className="flex justify-center gap-2 md:gap-4 mb-4">
                                    {[
                                        { value: timeLeft.hours, label: 'hours' },
                                        { value: timeLeft.minutes, label: 'minutes' },
                                        { value: timeLeft.seconds, label: 'seconds' },
                                    ].map((unit, i) => (
                                        <div key={unit.label} className="flex items-center gap-2 md:gap-4">
                                            <div className="flex flex-col items-center">
                                                <span className="text-4xl md:text-6xl font-display text-primary tabular-nums">
                                                    {String(unit.value).padStart(2, '0')}
                                                </span>
                                                <span className="text-xs text-muted-foreground mt-1">{unit.label}</span>
                                            </div>
                                            {i < 2 && <span className="text-3xl md:text-5xl font-display text-primary/40 mb-5">:</span>}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm text-muted-foreground">{data?.status}</p>
                            </div>
                        )}

                        {/* Score Hero */}
                        {(!timeLeft || (data && data.batsmen.length > 0)) && (
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-100 via-zinc-50 to-white dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-zinc-200 dark:border-zinc-800/50">
                                {/* Atmospheric background layers */}
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(34,197,94,0.08)_0%,_transparent_60%)]" />
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(251,191,36,0.05)_0%,_transparent_60%)]" />

                                {/* Last Event Badge */}
                                {lastEvent && (
                                    <Badge
                                        key={lastEvent.key}
                                        variant={getEventBadgeVariant(lastEvent.variant)}
                                        className={`absolute top-4 right-4 z-10 text-lg font-bold event-animation tabular-nums shadow-lg rounded-xl px-3 py-1 ${getEventBadgeClass(lastEvent.variant)}`}
                                    >
                                        {lastEvent.text}
                                    </Badge>
                                )}

                                <div className="relative z-[1] p-5 md:p-7">
                                    {/* Previous Innings */}
                                    {data?.previousInnings && data.previousInnings.length > 0 && (
                                        <div className="space-y-1 mb-4">
                                            {data.previousInnings.map((inning, index) => (
                                                <div key={index} className="flex items-baseline gap-2 opacity-50">
                                                    {inning.teamFlagUrl && (
                                                        <div className="rounded overflow-hidden w-5 h-3.5 flex-shrink-0 relative top-[2px]">
                                                            <Image src={inning.teamFlagUrl} alt={inning.teamShortName || inning.teamName} width={20} height={14} className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 mr-1">{inning.teamShortName || inning.teamName}</span>
                                                    <span className="text-2xl md:text-3xl font-display tracking-tight text-zinc-500 dark:text-zinc-400">
                                                        {inning.score}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Current Score - the hero */}
                                    <div>
                                        <span className="text-4xl md:text-5xl lg:text-6xl font-display tracking-tight text-amber-600 dark:text-amber-400 score-breathe dark:drop-shadow-[0_0_20px_rgba(251,191,36,0.15)]">
                                            {data?.score}
                                        </span>

                                        {/* Status + Rates row */}
                                        <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                {data?.status && (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full bg-red-500 live-pulse" />
                                                        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">{data.status}</p>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                    <span className="text-xs font-mono font-semibold text-emerald-400 tracking-wide">
                                                        CRR {data?.currentRunRate}
                                                    </span>
                                                </div>
                                                {data?.requiredRunRate && (
                                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                                        <span className="text-xs font-mono font-semibold text-orange-400 tracking-wide">
                                                            REQ {data.requiredRunRate}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom accent line */}
                                <div className="h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                            </div>
                        )}

                        {/* Player of the Match / Series */}
                        {(data?.playerOfTheMatch || data?.playerOfTheSeries) && (
                            <div className="flex flex-wrap gap-3">
                                {data.playerOfTheMatch && (
                                    <button
                                        onClick={() => {
                                            if (data.playerOfTheMatch?.profileId) {
                                                setSelectedProfileId(data.playerOfTheMatch.profileId);
                                                setSelectedPlayerName(data.playerOfTheMatch.name);
                                            }
                                        }}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex-1 min-w-[200px]"
                                    >
                                        {data.playerOfTheMatch.imageUrl && (
                                            <Image src={data.playerOfTheMatch.imageUrl} alt={data.playerOfTheMatch.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                                        )}
                                        <div className="text-left">
                                            <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">Player of the Match</p>
                                            <p className="text-sm font-medium">{data.playerOfTheMatch.name}</p>
                                        </div>
                                    </button>
                                )}
                                {data.playerOfTheSeries && (
                                    <button
                                        onClick={() => {
                                            if (data.playerOfTheSeries?.profileId) {
                                                setSelectedProfileId(data.playerOfTheSeries.profileId);
                                                setSelectedPlayerName(data.playerOfTheSeries.name);
                                            }
                                        }}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors flex-1 min-w-[200px]"
                                    >
                                        {data.playerOfTheSeries.imageUrl && (
                                            <Image src={data.playerOfTheSeries.imageUrl} alt={data.playerOfTheSeries.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                                        )}
                                        <div className="text-left">
                                            <p className="text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400 font-semibold">Player of the Series</p>
                                            <p className="text-sm font-medium">{data.playerOfTheSeries.name}</p>
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Win Probability */}
                        {data?.requiredRunRate && data?.previousInnings?.length > 0 && (
                            <WinProbability
                                score={data.score}
                                currentRunRate={data.currentRunRate}
                                requiredRunRate={data.requiredRunRate}
                                previousInnings={data.previousInnings}
                                status={data.status}
                                scrapedProbability={data.winProbability}
                            />
                        )}

                        {/* Main Layout: Scorecard Left + Commentary Right */}
                        <div className={`grid grid-cols-1 gap-4 lg:gap-6 ${data && data.batsmen.length === 0 && data.bowlers.length === 0 ? '' : 'xl:grid-cols-[420px_1fr]'}`}>
                            {/* Left Column: Scorecard + Key Stats */}
                            <div className="min-w-0 space-y-4">
                                {/* Scorecard Tables */}
                                {data && (data.batsmen.length !== 0 || data.bowlers.length !== 0) && (
                                    <div className="glass-card overflow-hidden">
                                        {/* Batting */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs md:text-sm">
                                                <thead>
                                                    <tr className="bg-green-50/80 dark:bg-green-950/30 border-b border-green-200/50 dark:border-green-900/30">
                                                        <th className="text-left text-xs font-bold text-green-800 dark:text-green-400 px-2 md:px-4 py-2 md:py-3">Batter</th>
                                                        <th className="text-center text-xs font-bold text-green-800 dark:text-green-400 px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">R</th>
                                                        <th className="text-center text-xs font-bold text-green-800 dark:text-green-400 px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">B</th>
                                                        <th className="text-center text-xs font-bold text-green-800 dark:text-green-400 px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">4s</th>
                                                        <th className="text-center text-xs font-bold text-green-800 dark:text-green-400 px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">6s</th>
                                                        <th className="text-center text-xs font-bold text-green-800 dark:text-green-400 px-1 md:px-3 py-2 md:py-3 w-12 md:w-16">SR</th>
                                                        <th className="w-6 md:w-8"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data?.batsmen.map((batsman, index) => {
                                                        const runs = Number(batsman.runs);
                                                        const sr = parseFloat(batsman.strikeRate);
                                                        return (
                                                        <tr key={index} className={`border-b border-zinc-100 dark:border-zinc-800/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors ${
                                                            runs >= 50 ? 'bg-green-50/50 dark:bg-green-950/20' :
                                                            runs >= 30 ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''
                                                        }`}>
                                                            <td className="px-2 md:px-4 py-2 md:py-3">
                                                                <span
                                                                    className={`text-xs md:text-sm font-medium cursor-pointer hover:text-primary transition-colors ${
                                                                        runs >= 50 ? 'text-green-600 dark:text-green-400' : ''
                                                                    }`}
                                                                    onClick={() => handleProfileClick(batsman.profileId, batsman.name)}
                                                                >
                                                                    {batsman.name}{batsman.onStrike ? ' *' : ''}
                                                                </span>
                                                            </td>
                                                            <td className={`text-center text-xs md:text-sm font-bold px-1 md:px-3 py-2 md:py-3 ${runs >= 50 ? 'text-green-600 dark:text-green-400' : ''}`}>{batsman.runs}</td>
                                                            <td className="text-center text-xs md:text-sm text-muted-foreground px-1 md:px-3 py-2 md:py-3">{batsman.balls}</td>
                                                            <td className={`text-center text-xs md:text-sm px-1 md:px-3 py-2 md:py-3 ${Number(batsman.fours) > 0 ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-muted-foreground'}`}>{batsman.fours}</td>
                                                            <td className={`text-center text-xs md:text-sm px-1 md:px-3 py-2 md:py-3 ${Number(batsman.sixes) > 0 ? 'text-purple-600 dark:text-purple-400 font-medium' : 'text-muted-foreground'}`}>{batsman.sixes}</td>
                                                            <td className={`text-center text-xs md:text-sm font-mono px-1 md:px-3 py-2 md:py-3 ${
                                                                sr >= 150 ? 'text-green-600 dark:text-green-400 font-bold' :
                                                                sr >= 100 ? 'text-emerald-600 dark:text-emerald-400' :
                                                                'text-muted-foreground'
                                                            }`}>{sr.toFixed(2)}</td>
                                                            <td className="text-center px-1 md:px-2 py-2 md:py-3">
                                                                {batsman.highlightsUrl ? (
                                                                    <span
                                                                        className="text-primary hover:text-primary/80 transition-colors text-xs cursor-pointer"
                                                                        title="View Highlights"
                                                                        onClick={() => handleHighlightsClick(batsman.highlightsUrl!)}
                                                                    >▶</span>
                                                                ) : (
                                                                    <span className="text-muted-foreground cursor-pointer" onClick={() => handleProfileClick(batsman.profileId, batsman.name)}>›</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Bowling */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs md:text-sm">
                                                <thead>
                                                    <tr className="bg-orange-50/80 dark:bg-orange-950/30 border-b border-orange-200/50 dark:border-orange-900/30">
                                                        <th className="text-left text-xs font-bold text-orange-800 dark:text-orange-400 px-2 md:px-4 py-2 md:py-3">Bowler</th>
                                                        <th className="text-center text-xs font-bold text-orange-800 dark:text-orange-400 px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">O</th>
                                                        <th className="text-center text-xs font-bold text-orange-800 dark:text-orange-400 px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">M</th>
                                                        <th className="text-center text-xs font-bold text-orange-800 dark:text-orange-400 px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">R</th>
                                                        <th className="text-center text-xs font-bold text-orange-800 dark:text-orange-400 px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">W</th>
                                                        <th className="text-center text-xs font-bold text-orange-800 dark:text-orange-400 px-1 md:px-3 py-2 md:py-3 w-12 md:w-16">ECO</th>
                                                        <th className="w-6 md:w-8"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data?.bowlers.map((bowler, index) => {
                                                        const wkts = Number(bowler.wickets);
                                                        const eco = parseFloat(bowler.economy);
                                                        return (
                                                        <tr key={index} className={`border-b border-zinc-100 dark:border-zinc-800/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors ${
                                                            wkts >= 3 ? 'bg-orange-50/50 dark:bg-orange-950/20' :
                                                            wkts >= 2 ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                                                        }`}>
                                                            <td className="px-2 md:px-4 py-2 md:py-3">
                                                                <span
                                                                    className={`text-xs md:text-sm font-medium cursor-pointer hover:text-primary transition-colors ${
                                                                        wkts >= 3 ? 'text-orange-600 dark:text-orange-400' : ''
                                                                    }`}
                                                                    onClick={() => handleProfileClick(bowler.profileId, bowler.name)}
                                                                >
                                                                    {bowler.name}{bowler.onStrike ? ' *' : ''}
                                                                </span>
                                                            </td>
                                                            <td className="text-center text-xs md:text-sm text-muted-foreground px-1 md:px-3 py-2 md:py-3">{bowler.overs}</td>
                                                            <td className={`text-center text-xs md:text-sm px-1 md:px-3 py-2 md:py-3 ${Number(bowler.maidens) > 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}>{bowler.maidens}</td>
                                                            <td className="text-center text-xs md:text-sm text-muted-foreground px-1 md:px-3 py-2 md:py-3">{bowler.runs}</td>
                                                            <td className={`text-center text-xs md:text-sm font-bold px-1 md:px-3 py-2 md:py-3 ${
                                                                wkts >= 3 ? 'text-orange-600 dark:text-orange-400' :
                                                                wkts >= 1 ? 'text-amber-600 dark:text-amber-400' : ''
                                                            }`}>{bowler.wickets}</td>
                                                            <td className={`text-center text-xs md:text-sm font-mono px-1 md:px-3 py-2 md:py-3 ${
                                                                eco <= 4 ? 'text-green-600 dark:text-green-400' :
                                                                eco >= 10 ? 'text-red-500 dark:text-red-400' :
                                                                'text-muted-foreground'
                                                            }`}>{bowler.economy}</td>
                                                            <td className="text-center px-1 md:px-2 py-2 md:py-3">
                                                                {bowler.highlightsUrl ? (
                                                                    <span
                                                                        className="text-primary hover:text-primary/80 transition-colors text-xs cursor-pointer"
                                                                        title="View Highlights"
                                                                        onClick={() => handleHighlightsClick(bowler.highlightsUrl!)}
                                                                    >▶</span>
                                                                ) : (
                                                                    <span className="text-muted-foreground cursor-pointer" onClick={() => handleProfileClick(bowler.profileId, bowler.name)}>›</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Key Stats - Vertical layout for full visibility */}
                                {data && (data.batsmen.length !== 0 || data.bowlers.length !== 0) && (
                                    <div className="glass-card overflow-hidden divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                                        {data?.partnership && data.partnership !== '-' && (
                                            <div className="p-3 flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Partnership</span>
                                                    <p className="text-sm font-semibold text-foreground mt-0.5">{data.partnership}</p>
                                                </div>
                                            </div>
                                        )}
                                        {data?.lastWicket && data.lastWicket !== '-' && (
                                            <div className="p-3 flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Last Wicket</span>
                                                    <p className="text-sm font-semibold text-foreground mt-0.5">{data.lastWicket}</p>
                                                </div>
                                            </div>
                                        )}
                                        {data?.recentOvers && data.recentOvers !== '-' && (
                                            <div className="p-3 flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Recent Overs</span>
                                                    <p className="text-sm font-mono font-semibold text-foreground mt-0.5">{data.recentOvers}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Mobile Commentary - Only visible on smaller screens */}
                                <div className="xl:hidden glass-card overflow-hidden">
                                    <div className="px-4 py-3 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-gradient-to-r from-zinc-50 to-transparent dark:from-zinc-900/50">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Commentary</h3>
                                    </div>
                                    <div className="p-3">
                                        <div className="space-y-0.5 max-h-[32rem] overflow-y-auto hide-scrollbar">
                                            {data?.commentary.map((comment, index) => (
                                                <div key={index}>
                                                    {index === newCommentaryStartIndex && <div ref={newCommentaryStartRef} />}
                                                    {renderCommentaryItem(comment, index)}
                                                </div>
                                            ))}
                                            <div ref={commentaryEndRef} />
                                        </div>
                                        {lastTimestamp !== null && lastTimestamp !== 0 && (
                                            <div className="pt-3 mt-3 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                                <Button
                                                    onClick={loadMoreCommentary}
                                                    disabled={loadingMore}
                                                    variant="outline"
                                                    className="w-full rounded-xl text-sm"
                                                >
                                                    {loadingMore ? (
                                                        <><LoaderCircle className="w-4 h-4 animate-spin mr-2" />Loading...</>
                                                    ) : (
                                                        'Load More'
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Commentary - Desktop only, sticky */}
                            {data && (data.batsmen.length !== 0 || data.bowlers.length !== 0) && (
                                <div className="hidden xl:block">
                                    <div className="sticky top-4">
                                        <div className="glass-card overflow-hidden">
                                            {/* Commentary Header with gradient accent */}
                                            <div className="relative px-4 py-3 border-b border-zinc-200/50 dark:border-zinc-800/50">
                                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-emerald-500/5 to-transparent dark:from-primary/10 dark:via-emerald-500/10"></div>
                                                <div className="relative flex items-center justify-between">
                                                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Live Commentary</h3>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 live-pulse"></div>
                                                        <span className="text-[10px] font-medium text-muted-foreground">LIVE</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Commentary Feed */}
                                            <div className="p-3">
                                                <div className="space-y-0.5 max-h-[calc(100vh-280px)] overflow-y-auto hide-scrollbar">
                                                    {data?.commentary.map((comment, index) => (
                                                        <div key={index}>
                                                            {renderCommentaryItem(comment, index)}
                                                        </div>
                                                    ))}
                                                    <div ref={commentaryEndRef} />
                                                </div>
                                                {lastTimestamp !== null && lastTimestamp !== 0 && (
                                                    <div className="pt-3 mt-3 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                                        <Button
                                                            onClick={loadMoreCommentary}
                                                            disabled={loadingMore}
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full rounded-xl text-xs"
                                                        >
                                                            {loadingMore ? (
                                                                <><LoaderCircle className="w-3 h-3 animate-spin mr-2" />Loading...</>
                                                            ) : (
                                                                'Load More Commentary'
                                                            )}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {view === 'scorecard' && <FullScorecard matchId={matchId} />}
                {view === 'squads' && <MatchSquadsDisplay matchId={matchId} />}
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
                    {selectedProfile && <PlayerProfileDisplay profile={selectedProfile} />}
                    {!profileLoading && !selectedProfile && selectedProfileId && (
                        <div className="p-8 text-center text-muted-foreground">Failed to load player profile</div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Highlights Dialog */}
            <Dialog open={!!highlightsUrl} onOpenChange={handleHighlightsDialogClose}>
                <DialogContent className="max-w-2xl w-full max-h-[85vh] overflow-y-auto p-0 rounded-2xl">
                    <DialogHeader className="px-5 pt-5 pb-3 border-b border-zinc-200/50 dark:border-zinc-800/50">
                        <DialogTitle className="font-display text-lg">
                            {highlightsData ? (
                                <span>{highlightsData.playerName} <span className="text-muted-foreground font-mono text-base">{highlightsData.playerScore}</span></span>
                            ) : (
                                'Player Highlights'
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    {highlightsLoading && (
                        <div className="flex justify-center items-center p-12">
                            <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
                            <p className="ml-4 text-muted-foreground">Loading highlights...</p>
                        </div>
                    )}
                    {highlightsData && (
                        <div className="p-3 md:p-4">
                            <div className="space-y-0.5">
                                {highlightsData.highlights.map((item, index) => {
                                    const text = item.text;
                                    const textLower = text.toLowerCase();
                                    // Detect events from bold tags and keywords
                                    const hasBold = (kw: string) => text.includes(`<b>${kw}</b>`) || text.includes(`<b>${kw.toUpperCase()}</b>`) || text.includes(`<b>${kw.charAt(0).toUpperCase() + kw.slice(1)}</b>`);
                                    const isFour = hasBold('four') || /\bFOUR\b/.test(text);
                                    const isSix = hasBold('six') || /\bSIX\b/.test(text);
                                    const isWicket = hasBold('out') || /\bOUT\b/.test(text);
                                    const isDot = textLower.includes('no run');
                                    // Wide detection: only detect actual wides via bold tag (Cricbuzz bolds extras)
                                    const isWide = !isDot && hasBold('wide');
                                    const isNoBall = textLower.includes('no ball') || textLower.includes('no-ball');

                                    // Get run value from text if possible
                                    let runDisplay = '•';
                                    if (isFour) runDisplay = '4';
                                    else if (isSix) runDisplay = '6';
                                    else if (isWicket) runDisplay = 'W';
                                    else if (isWide) runDisplay = 'Wd';
                                    else if (isNoBall) runDisplay = 'Nb';
                                    else if (isDot) runDisplay = '•';
                                    else {
                                        // Try to extract runs from patterns like "1 run" or "2 runs"
                                        const runMatch = text.match(/\b(\d)\s*runs?\b/i);
                                        if (runMatch) runDisplay = runMatch[1];
                                    }

                                    // Ball indicator class matching commentary style
                                    let ballClass = "w-7 h-7 md:w-8 md:h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0";
                                    if (isSix) ballClass += " bg-purple-600 text-white";
                                    else if (isFour) ballClass += " bg-blue-600 text-white";
                                    else if (isWicket) ballClass += " bg-red-600 text-white";
                                    else if (isWide || isNoBall) ballClass += " bg-orange-500 text-white text-[10px]";
                                    else if (isDot) ballClass += " bg-zinc-200 dark:bg-zinc-800 text-zinc-500";
                                    else if (/^\d$/.test(runDisplay)) ballClass += " bg-green-600 text-white";
                                    else ballClass += " bg-zinc-200 dark:bg-zinc-800 text-zinc-500";

                                    return (
                                        <div key={index} className="slide-in-left flex items-start gap-3 py-2.5 px-2 rounded-xl hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="font-mono font-bold text-xs text-muted-foreground w-8 text-right">
                                                    {item.over}
                                                </span>
                                                <span className={ballClass}>{runDisplay}</span>
                                            </div>
                                            <p className="text-sm text-foreground/90 flex-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
                                        </div>
                                    );
                                })}
                                {highlightsData.highlights.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">No highlights available.</p>
                                )}
                            </div>
                        </div>
                    )}
                    {!highlightsLoading && !highlightsData && highlightsUrl && (
                        <div className="p-8 text-center text-muted-foreground">Failed to load highlights</div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
