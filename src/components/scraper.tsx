
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getScoreForMatchId, loadMoreCommentary as loadMoreCommentaryAction, getPlayerProfile } from '@/app/actions';
import type { ScrapeCricbuzzUrlOutput, Commentary, PlayerProfile } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoaderCircle, User, ArrowLeft } from "lucide-react";
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import FullScorecard from './full-scorecard';
import PlayerProfileDisplay from './player-profile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import MatchSquadsDisplay from './match-squads';

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

const CricketBatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="16" height="16" x="0" y="0" viewBox="0 0 512 512" className="inline-block ml-1 text-primary" xmlSpace="preserve"><g fill="currentColor"><path d="m148.67 150.612-22.453 43.502a7.834 7.834 0 0 0 1.534 8.906l96.127 90.728-1.671 12.502 203.456 203.456a7.834 7.834 0 0 0 8.906 1.534l7.782-3.704a137.76 137.76 0 0 0 65.183-65.183l3.704-7.782a7.834 7.834 0 0 0-1.534-8.906L306.248 222.208l-12.104 1.671-91.196-96.057a7.834 7.834 0 0 0-8.906-1.534z" opacity="1"></path><path d="m511.237 434.57-3.698 7.777a130.779 130.779 0 0 1-3.295 6.466L315.536 260.11 186.165 127.612c-.857-.843-.663-2.264.422-2.78l9.477-.85c2.995-1.425 8.717 5.03 11.062 7.375l79.161 84.945 19.962 5.906 203.459 203.459a7.827 7.827 0 0 1 1.529 8.903z" opacity="1"></path><path d="m204.592 120.557 101.654 101.654 22.921 93.554c1.98 8.082-5.32 15.382-13.402 13.402l-93.554-22.921-101.655-101.653a7.846 7.846 0 0 1-1.54-8.901l24.725-51.949 51.949-24.725a7.846 7.846 0 0 1 8.902 1.539z" opacity="1"></path><path d="M315.533 260.112 183.092 127.67a8.515 8.515 0 0 0-2.21-1.601v-.011l14.811-7.044a7.865 7.865 0 0 1 8.903 1.539l101.653 101.653z" opacity="1"></path><path d="M223.643 223.644c-8.504 8.504-22.291 8.504-30.795 0L3 33.795c-3.998-3.998-3.998-10.481 0-14.48L19.315 3.001c3.998-3.998 10.481-3.998 14.48 0L223.644 192.85c8.503 8.503 8.503 22.29-.001 30.794z" opacity="1"></path><path d="M223.641 223.642a21.705 21.705 0 0 1-8.965 5.412c2.324-7.467.516-15.937-5.391-21.845L19.437 17.362c-3.997-4.008-10.483-4.008-14.481 0L19.313 3.006a10.222 10.222 0 0 1 14.48 0L223.64 192.853c8.512 8.5 8.512 22.289.001 30.789z" opacity="1"></path></g></svg>
)

const CricketBallIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" width="14" height="14" x="0" y="0" viewBox="0 0 173.397 173.397" className="inline-block ml-1 text-primary" xmlSpace="preserve" fillRule="evenodd"><g fill="currentColor"><path d="M154.034 128.243a79.182 79.182 0 0 1-10.213 13.183L31.97 29.576a79.182 79.182 0 0 1 13.183-10.213 3.498 3.498 0 0 1 4.353.507l104.02 104.019a3.498 3.498 0 0 1 .507 4.354zm-27.008 11.207a1.693 1.693 0 0 0-2.395 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.394 2.395l2.979 2.979a1.693 1.693 0 0 0 2.395-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.394 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.394 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.004-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.004a1.693 1.693 0 0 0-2.395 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.394 2.394l2.979 2.98a1.693 1.693 0 0 0 2.395-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.394 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.396zm-8.004-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.004a1.693 1.693 0 0 0-2.395 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm110.876 81.239a1.693 1.693 0 0 0-2.395 2.395l2.98 2.979a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.394 2.395l2.979 2.98a1.693 1.693 0 0 0 2.395-2.395zm-8.005-8.004a1.693 1.693 0 0 0-2.394 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.004-8.005a1.693 1.693 0 0 0-2.395 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005A1.693 1.693 0 0 0 99.425 87l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.396zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.394 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zM69.8 52.588a1.693 1.693 0 0 0-2.394 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.004-8.005a1.693 1.693 0 0 0-2.395 2.394l2.98 2.98a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.979a1.693 1.693 0 0 0 2.394-2.395zm-8.005-8.005a1.693 1.693 0 0 0-2.395 2.395l2.98 2.98a1.693 1.693 0 0 0 2.394-2.396zm95.64 115.248a79.19 79.19 0 0 1-13.183 10.213 3.498 3.498 0 0 1-4.354-.507L19.87 49.508a3.498 3.498 0 0 1-.507-4.354 79.19 79.19 0 0 1 10.213-13.182l111.85 111.85zM18.415 52.841C4.28 81.34 9.078 116.842 32.817 140.581c23.738 23.738 59.24 28.536 87.74 14.402L18.414 52.842zm79.277 98.539a1.69 1.69 0 0 0-.556-3.334c-4.122.697-8.292.98-12.443.847a62.506 62.506 0 0 1-12.355-1.642 1.691 1.691 0 0 0-.767 3.294 65.844 65.844 0 0 0 13.016 1.721c4.39.14 8.781-.155 13.105-.886zm-41.237-6.442a1.692 1.692 0 0 0 1.56-3.003 61.847 61.847 0 0 1-15.314-11.24 1.693 1.693 0 0 0-2.394 2.395c2.4 2.401 4.957 4.586 7.64 6.555a65.209 65.209 0 0 0 8.508 5.293zm60.487-116.48a1.692 1.692 0 0 0-1.56 3.004A61.847 61.847 0 0 1 130.695 42.7a1.693 1.693 0 0 0 2.394-2.395 66.122 66.122 0 0 0-7.639-6.554 65.209 65.209 0 0 0-8.509-5.293zm-41.237-6.441a1.69 1.69 0 0 0 .556 3.334 62.617 62.617 0 0 1 12.443-.847c4.138.132 8.278.68 12.355 1.642a1.691 1.691 0 0 0 .767-3.294A65.844 65.844 0 0 0 88.81 21.13c-4.39-.14-8.781.155-13.105.887zm79.277 98.539c14.135-28.499 9.337-64.001-14.401-87.74C116.842 9.078 81.34 4.28 52.84 18.414l102.141 102.141z" opacity="1"></path></g></svg>
);


export default function ScoreDisplay({ matchId }: { matchId: string }) {
    const [scoreState, setScoreState] = useState<ScrapeState>({ success: false });
    const [lastEvent, setLastEvent] = useState<LastEventType | null>(null);
    const previousData = useRef<ScrapeCricbuzzUrlOutput | null>(null);
    const [view, setView] = useState<View>('live');
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastTimestamp, setLastTimestamp] = useState<number | null>(null);
    const commentaryEndRef = useRef<HTMLDivElement>(null);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);


    const fetchScore = async () => {
        if (!matchId) return;
        const newState = await getScoreForMatchId(matchId);

        // If we already have extra commentary loaded (more than what API returns), preserve it
        if (scoreState.data?.commentary && newState.data?.commentary) {
            const apiCommentaryCount = newState.data.commentary.length;
            const currentCommentaryCount = scoreState.data.commentary.length;

            // If we have more commentary than the API returns, it means we loaded more
            if (currentCommentaryCount > apiCommentaryCount) {
                // Keep the new live commentary at the top, and append the old loaded commentary
                const oldLoadedCommentary = scoreState.data.commentary.slice(apiCommentaryCount);
                setScoreState({
                    ...newState,
                    data: {
                        ...newState.data,
                        commentary: [...newState.data.commentary, ...oldLoadedCommentary],
                    },
                });
            } else {
                setScoreState(newState);
            }
        } else {
            setScoreState(newState);
        }

        // Use the oldest commentary timestamp for pagination (only set once)
        if (newState.data?.oldestCommentaryTimestamp && !lastTimestamp) {
            setLastTimestamp(newState.data.oldestCommentaryTimestamp);
        }
    };

    const loadMoreCommentary = async () => {
        if (!matchId || !lastTimestamp || loadingMore) return;

        setLoadingMore(true);
        try {
            const result = await loadMoreCommentaryAction(matchId, lastTimestamp);

            if (result.success && result.commentary && result.commentary.length > 0 && scoreState.data) {
                setScoreState({
                    ...scoreState,
                    data: {
                        ...scoreState.data,
                        commentary: [...scoreState.data.commentary, ...result.commentary],
                    },
                });

                if (result.timestamp) {
                    setLastTimestamp(result.timestamp);
                }

                // Scroll to the newly loaded commentary
                setTimeout(() => {
                    commentaryEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } else if (result.success && result.commentary && result.commentary.length === 0) {
                // No more commentary available
                setLastTimestamp(null); // Hide the load more button
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
            if (result.success && result.data) {
                setSelectedProfile(result.data);
            }
            setProfileLoading(false);
        };
        fetchProfile();
    }, [selectedProfileId, selectedPlayerName]);

    // Countdown timer for upcoming matches
    useEffect(() => {
        if (!scoreState.data?.matchStartTimestamp) return;
        
        const updateCountdown = () => {
            const now = Date.now();
            const diff = scoreState.data!.matchStartTimestamp! - now;
            
            if (diff <= 0) {
                setTimeLeft(null);
                return;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            setTimeLeft({ hours, minutes, seconds });
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

                if (wicketDiff > 0) {
                    eventToShow = { text: 'W', variant: 'destructive' };
                } else if (runDiff === 6) {
                    eventToShow = { text: '6', variant: 'six' };
                } else if (runDiff === 4) {
                    eventToShow = { text: '4', variant: 'four' };
                } else if (runDiff > 0 && runDiff < 4) {
                    eventToShow = { text: `+${runDiff}`, variant: 'default' };
                } else if (runDiff === 0 && wicketDiff === 0 && oversChanged) {
                    eventToShow = { text: 'DOT', variant: 'default' };
                }
            }

            if (eventToShow) {
                setLastEvent({ ...eventToShow, key: Date.now() });
            }
        }

        if (scoreState.data) {
            previousData.current = scoreState.data;
        }
    }, [scoreState.data]);


    if (scoreState.error) {
        return (
            <div className="max-w-4xl mx-auto">
                <Alert variant="destructive" className="mt-8">
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
        const baseClasses = "p-2.5 md:p-3 flex gap-2 md:gap-3 items-start text-xs md:text-sm";

        if (comment.type === 'user' && comment.author) {
            return (
                <div key={index} className={`${baseClasses} border-t`}>
                    <User size={14} className="text-muted-foreground mt-0.5 flex-shrink-0 md:w-4 md:h-4" />
                    <div>
                        <p className="font-semibold text-primary text-xs md:text-sm">{comment.author}</p>
                        <p className="text-foreground/80 italic text-xs md:text-sm" dangerouslySetInnerHTML={{ __html: `"${comment.text}"` }} />
                    </div>
                </div>
            );
        }

        if (comment.type === 'stat') {
            const isShortText = comment.text.length < 100;
            return (
                <div key={index} className={`${baseClasses} bg-slate-50 dark:bg-gray-800/20 border-t`}>
                    <p className={`text-muted-foreground w-full text-xs md:text-sm ${isShortText ? 'text-center' : ''}`} dangerouslySetInnerHTML={{ __html: comment.text }} />
                </div>
            )
        }

        const over = comment.text.split(':')[0];
        const text = comment.text.substring(comment.text.indexOf(':') + 1);
        const events = comment.event?.split(',') || [];

        const getEventDisplay = (event: string) => {
            switch (event) {
                case 'FOUR': return { text: '4', className: 'bg-blue-500 text-white' };
                case 'SIX': return { text: '6', className: 'bg-purple-600 text-white' };
                case 'WICKET': return { text: 'W', className: 'bg-red-600 text-white' };
                case 'FIFTY': return { text: '50', className: 'bg-green-500 text-white text-[10px] md:text-xs px-1 md:px-1.5' };
                case 'HUNDRED': return { text: '100', className: 'bg-amber-500 text-white text-[10px] md:text-xs px-1 md:px-1.5' };
                default: return null;
            }
        }

        return (
            <div key={index}>
                {comment.overSummary && (
                    <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 border-y border-primary/20 dark:border-primary/30 px-3 md:px-4 py-3 md:py-3.5">
                        <div className="flex items-center gap-3 md:gap-4">
                            {/* Over Number */}
                            <div className="flex-shrink-0 flex flex-col items-center justify-center bg-primary/10 dark:bg-primary/20 rounded-lg px-2 md:px-3 py-1.5 md:py-2 border border-primary/30">
                                <span className="text-[10px] md:text-xs text-muted-foreground font-medium">Over</span>
                                <span className="text-lg md:text-xl font-bold text-primary">{Math.floor(comment.overNumber || 0) + 1}</span>
                            </div>
                            
                            {/* Balls and Score */}
                            <div className="flex-1 flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {comment.overSummary.trim().split(/\s+/).map((ball, idx) => {
                                        const ballStr = ball.trim();
                                        if (!ballStr) return null;
                                        
                                        // Determine ball type and styling
                                        let ballClass = "px-2 py-1 rounded-md font-bold text-xs md:text-sm transition-all";
                                        let ballContent = ballStr;
                                        
                                        if (ballStr === '6') {
                                            ballClass += " bg-purple-600 text-white shadow-md";
                                        } else if (ballStr === '4') {
                                            ballClass += " bg-blue-600 text-white shadow-md";
                                        } else if (ballStr === 'W' || ballStr.includes('W')) {
                                            ballClass += " bg-red-600 text-white shadow-md";
                                        } else if (ballStr.toLowerCase().includes('wd') || ballStr.toLowerCase().includes('wide')) {
                                            ballClass += " bg-orange-500 text-white text-[10px] md:text-xs";
                                            ballContent = 'Wd';
                                        } else if (ballStr.toLowerCase().includes('nb') || ballStr.toLowerCase().includes('noball')) {
                                            ballClass += " bg-orange-500 text-white text-[10px] md:text-xs";
                                            ballContent = 'Nb';
                                        } else if (ballStr.toLowerCase().includes('lb') || ballStr.toLowerCase().includes('legbye')) {
                                            ballClass += " bg-gray-500 text-white text-[10px] md:text-xs";
                                            ballContent = 'Lb';
                                        } else if (ballStr.toLowerCase().includes('b') && ballStr.length <= 2) {
                                            ballClass += " bg-gray-500 text-white text-[10px] md:text-xs";
                                            ballContent = 'B';
                                        } else if (ballStr === '0' || ballStr === '.') {
                                            ballClass += " bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
                                            ballContent = '•';
                                        } else if (/^\d+$/.test(ballStr)) {
                                            ballClass += " bg-green-600 text-white";
                                        } else {
                                            ballClass += " bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] md:text-xs";
                                        }
                                        
                                        return (
                                            <span key={idx} className={ballClass}>
                                                {ballContent}
                                            </span>
                                        );
                                    })}
                                    <span className="ml-1 font-bold text-sm md:text-base text-primary">
                                        ({comment.overRuns} runs)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-900/50 px-3 py-1.5 rounded-full border border-primary/20">
                                    <span className="font-bold text-sm md:text-base text-primary">{comment.teamShortName}</span>
                                    <span className="font-bold text-base md:text-lg text-foreground">{comment.teamScore}-{comment.teamWickets}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className={`${baseClasses} border-t`}>
                    <div className="flex flex-col items-center flex-shrink-0 w-9 md:w-12 space-y-1">
                        <div className="font-mono text-[10px] md:text-xs text-muted-foreground">{over}</div>
                        <div className="flex flex-col items-center space-y-1">
                            {events.map((event, i) => {
                                const eventDisplay = getEventDisplay(event);
                                if (!eventDisplay) return null;

                                const isRound = ['FOUR', 'SIX', 'WICKET'].includes(event);

                                return (
                                    <div key={i} className={cn(`flex-shrink-0 flex items-center justify-center font-bold text-xs md:text-sm`,
                                        isRound ? 'w-5 h-5 md:w-6 md:h-6 rounded-full' : 'rounded',
                                        eventDisplay.className
                                    )}>
                                        {eventDisplay.text}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <p className="text-foreground flex-1 text-xs md:text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
                </div>
            </div>
        );
    };

    const getEventBadgeVariant = (variant: LastEventType['variant']) => {
        switch (variant) {
            case 'destructive': return 'destructive';
            case 'four': return 'default';
            case 'six': return 'secondary'; // Or create a custom variant
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

    const handleDialogOpenChange = (open: boolean) => {
        if (!open) {
            setSelectedProfileId(null);
            setSelectedPlayerName(null);
            setSelectedProfile(null);
        }
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-2 md:px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6 py-3 md:py-4 border-b dark:border-gray-800">
                <div className="flex items-center gap-2 md:gap-4">
                    <Button asChild variant="outline" size="icon" className="shrink-0 h-8 w-8 md:h-10 md:w-10">
                        <Link href="/">
                            <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
                        </Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base md:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent truncate">
                            {data?.title}
                        </h1>
                        <div className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1 space-y-0.5">
                            {data?.toss && data.toss !== 'N/A' && data.toss.trim() !== '' ? (
                                <p className="truncate">{data.toss}</p>
                            ) : null}
                            {data?.venue && data.venue !== 'N/A' && data.venue.trim() !== '' && (
                                <p className="truncate">
                                    <span className="font-semibold">Venue: </span>
                                    {data.venue}
                                </p>
                            )}
                            {data?.matchStartTimestamp && (
                                <p className="truncate">
                                    <span className="font-semibold">Date: </span>
                                    {new Date(data.matchStartTimestamp).toLocaleDateString('en-US', { 
                                        weekday: 'short', 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZoneName: 'short'
                                    }).replace(/GMT\+5:30/, 'IST').replace(/GMT([+-]\d{1,2}):?(\d{2})?/, 'GMT$1')}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1 md:gap-1.5 bg-gray-100/50 dark:bg-gray-800/30 p-1 rounded-lg backdrop-blur-sm self-start md:self-auto">
                    <Button
                        variant={view === 'live' ? 'default' : 'ghost'}
                        onClick={() => setView('live')}
                        size="sm"
                        className="rounded-md text-xs md:text-sm h-8 md:h-9 px-2 md:px-4"
                    >
                        Live
                    </Button>
                    <Button
                        variant={view === 'scorecard' ? 'default' : 'ghost'}
                        onClick={() => setView('scorecard')}
                        size="sm"
                        className="rounded-md text-xs md:text-sm h-8 md:h-9 px-2 md:px-4"
                    >
                        Scorecard
                    </Button>
                    <Button
                        variant={view === 'squads' ? 'default' : 'ghost'}
                        onClick={() => setView('squads')}
                        size="sm"
                        className="rounded-md text-xs md:text-sm h-8 md:h-9 px-2 md:px-4"
                    >
                        Squads
                    </Button>
                </div>
            </div>

            <div>
                {view === 'live' && (
                    <div className="space-y-4 md:space-y-6">
                        {/* Countdown Timer for Upcoming Matches */}
                        {timeLeft && data?.batsmen.length === 0 && (
                            <Card className="backdrop-blur-sm bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 border-primary/20">
                                <CardContent className="p-6 md:p-8">
                                    <div className="flex flex-col gap-4 md:gap-6">
                                        {/* Countdown */}
                                        <div className="flex justify-center">
                                            <div className="flex items-end gap-1 md:gap-2 font-bold text-2xl md:text-4xl">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-3xl md:text-5xl text-primary">{String(timeLeft.hours).padStart(2, '0')}</span>
                                                    <span className="text-xs md:text-sm text-muted-foreground mt-1">hours</span>
                                                </div>
                                                <span className="text-3xl md:text-5xl text-primary mb-6">:</span>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-3xl md:text-5xl text-primary">{String(timeLeft.minutes).padStart(2, '0')}</span>
                                                    <span className="text-xs md:text-sm text-muted-foreground mt-1">minutes</span>
                                                </div>
                                                <span className="text-3xl md:text-5xl text-primary mb-6">:</span>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-3xl md:text-5xl text-primary">{String(timeLeft.seconds).padStart(2, '0')}</span>
                                                    <span className="text-xs md:text-sm text-muted-foreground mt-1">seconds</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Match Start Info */}
                                        <div className="text-center">
                                            <p className="text-sm md:text-base text-muted-foreground">{data?.status}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        
                        {/* Score Card - Full width */}
                        {(!timeLeft || data?.batsmen.length > 0) && (
                            <Card className="backdrop-blur-sm bg-white/50 dark:bg-gray-950/50 border-primary/10">
                                <CardContent className="p-4 md:p-6 relative">
                                    {lastEvent && (
                                        <Badge
                                            key={lastEvent.key}
                                            variant={getEventBadgeVariant(lastEvent.variant)}
                                            className={`absolute top-[-0.75rem] right-4 text-base md:text-lg font-bold event-animation tabular-nums shadow-lg ${getEventBadgeClass(lastEvent.variant)}`}
                                        >
                                            {lastEvent.text}
                                        </Badge>
                                    )}
                                    <div className="space-y-3 md:space-y-4">
                                    {data?.previousInnings.map((inning, index) => (
                                        <div key={index}
                                            className="p-2.5 md:p-3 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition-colors"
                                        >
                                            <div className="flex justify-between items-center gap-3 md:gap-4">
                                                <div className="flex items-center gap-2">
                                                    {inning.teamFlagUrl && (
                                                        <div className="rounded overflow-hidden w-6 h-4 md:w-7 md:h-5 flex-shrink-0">
                                                            <Image
                                                                src={inning.teamFlagUrl}
                                                                alt={inning.teamShortName || inning.teamName}
                                                                width={25}
                                                                height={18}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <span className="font-semibold text-sm md:text-base text-primary/90">{inning.teamName}</span>
                                                </div>
                                                <span className="font-bold text-base md:text-lg bg-primary/10 text-primary px-2.5 md:px-3 py-0.5 rounded-full">
                                                    {inning.score}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="p-3 md:p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5">
                                        <div className="flex justify-between items-baseline gap-3 md:gap-4 flex-wrap">
                                            <span className="text-xl md:text-2xl font-bold tracking-tight">{data?.score}</span>
                                            <div className="flex items-center gap-3 md:gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs md:text-sm text-muted-foreground">CRR:</span>
                                                    <span className="font-semibold text-sm md:text-base text-primary">{data?.currentRunRate}</span>
                                                </div>
                                                {data?.requiredRunRate && (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs md:text-sm font-bold text-muted-foreground">REQ:</span>
                                                        <span className="font-semibold text-sm md:text-base text-orange-600 dark:text-orange-400">{data.requiredRunRate}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm md:text-base text-red-600 dark:text-red-400 font-semibold mt-2 md:mt-3">{data?.status}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        )}

                        {/* Desktop: 2-column grid, Mobile: Stack with reordering */}
                        <div className={`grid grid-cols-1 gap-4 md:gap-6 ${data?.batsmen.length === 0 && data?.bowlers.length === 0 ? '' : 'lg:grid-cols-5'}`}>
                            {/* Commentary - Desktop: Left (3/5 or full width), Mobile: Bottom */}
                            <div className={`order-3 lg:order-1 space-y-4 md:space-y-6 ${data?.batsmen.length === 0 && data?.bowlers.length === 0 ? '' : 'lg:col-span-3'}`}>
                                <Card className="backdrop-blur-sm bg-white/50 dark:bg-gray-950/50 border-primary/10">
                                    <CardHeader className="border-b dark:border-gray-800 p-3 md:p-6">
                                        <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                            Commentary
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="space-y-0.5 max-h-[80rem] overflow-y-auto hide-scrollbar">
                                            {data?.commentary.map((comment, index) => renderCommentaryItem(comment, index))}
                                            <div ref={commentaryEndRef} />
                                        </div>
                                        {lastTimestamp && (
                                            <div className="p-3 md:p-4 border-t dark:border-gray-800">
                                                <Button
                                                    onClick={loadMoreCommentary}
                                                    disabled={loadingMore}
                                                    variant="outline"
                                                    className="w-full text-xs md:text-sm"
                                                >
                                                    {loadingMore ? (
                                                        <>
                                                            <LoaderCircle className="w-3 h-3 md:w-4 md:h-4 animate-spin mr-2" />
                                                            Loading...
                                                        </>
                                                    ) : (
                                                        'Load More Commentary'
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Scoreboard & Match Info - Desktop: Right sidebar (2/5), Mobile: Top */}
                            {(data.batsmen.length !== 0 || data.bowlers.length !== 0) && (
                            <div className="lg:col-span-2 space-y-4 md:space-y-6">
                                {/* Scoreboard - Mobile: First */}
                                <Card className="backdrop-blur-sm bg-white/50 dark:bg-gray-950/50 border-primary/10 order-1 lg:order-none">
                            <CardHeader className="border-b dark:border-gray-800 p-3 md:p-6">
                                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                    Scoreboard
                                </CardTitle>
                            </CardHeader>
                            <CardContent className='p-3 md:pt-6 md:px-6 md:pb-6'>
                                <div className="space-y-4 md:space-y-6">
                                    {/* Batting */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3 md:mb-4">
                                            <h4 className="font-semibold text-sm md:text-base">Batting</h4>
                                        </div>
                                        <div className="overflow-x-auto -mx-3 md:mx-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="text-xs md:text-sm min-w-[120px] md:w-auto">Batter</TableHead>
                                                        <TableHead className="text-right text-xs md:text-sm">R</TableHead>
                                                        <TableHead className="text-right text-xs md:text-sm">B</TableHead>
                                                        <TableHead className="text-right text-xs md:text-sm">4s</TableHead>
                                                        <TableHead className="text-right text-xs md:text-sm">6s</TableHead>
                                                        <TableHead className="text-right text-xs md:text-sm">SR</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {data?.batsmen.map((batsman, index) => (
                                                        <TableRow key={index}
                                                            className={cn(
                                                                "transition-colors",
                                                                batsman.onStrike
                                                                    ? "bg-primary/5 hover:bg-primary/10"
                                                                    : "even:bg-gray-50/50 dark:even:bg-gray-800/20 hover:bg-gray-100/50 dark:hover:bg-gray-800/40"
                                                            )}
                                                        >
                                                            <TableCell className="font-medium text-xs md:text-sm py-2 md:py-3">
                                                                <span className="flex items-center gap-1 md:gap-2">
                                                                    <span
                                                                        className={batsman.profileId ? "cursor-pointer hover:text-primary transition-colors truncate" : "truncate"}
                                                                        onClick={() => handleProfileClick(batsman.profileId, batsman.name)}
                                                                    >
                                                                        {batsman.name}
                                                                    </span>
                                                                    {batsman.onStrike && <CricketBatIcon />}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-primary text-xs md:text-sm">{batsman.runs}</TableCell>
                                                            <TableCell className="text-right text-xs md:text-sm">{batsman.balls}</TableCell>
                                                            <TableCell className="text-right text-blue-600 dark:text-blue-400 text-xs md:text-sm">{batsman.fours}</TableCell>
                                                            <TableCell className="text-right text-purple-600 dark:text-purple-400 text-xs md:text-sm">{batsman.sixes}</TableCell>
                                                            <TableCell className="text-right font-medium text-xs md:text-sm">{parseFloat(batsman.strikeRate).toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    {/* Bowling */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <h4 className="font-semibold text-sm md:text-base">Bowling</h4>
                                        </div>
                                        <div className="overflow-x-auto -mx-3 md:mx-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="text-xs md:text-sm min-w-[120px] md:w-auto">Bowler</TableHead>
                                                        <TableHead className="text-right text-xs md:text-sm">O</TableHead>
                                                        <TableHead className="text-right text-xs md:text-sm">M</TableHead>
                                                        <TableHead className="text-right text-xs md:text-sm">R</TableHead>
                                                        <TableHead className="text-right text-xs md:text-sm">W</TableHead>
                                                        <TableHead className="text-right text-xs md:text-sm">ECO</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {data?.bowlers.map((bowler, index) => (
                                                        <TableRow key={index}
                                                            className={cn(
                                                                "transition-colors",
                                                                bowler.onStrike
                                                                    ? "bg-primary/5 hover:bg-primary/10"
                                                                    : "even:bg-gray-50/50 dark:even:bg-gray-800/20 hover:bg-gray-100/50 dark:hover:bg-gray-800/40"
                                                            )}
                                                        >
                                                            <TableCell className="font-medium text-xs md:text-sm py-2 md:py-3">
                                                                <span className="flex items-center gap-1 md:gap-2">
                                                                    <span
                                                                        className={bowler.profileId ? "cursor-pointer hover:text-primary transition-colors truncate" : "truncate"}
                                                                        onClick={() => handleProfileClick(bowler.profileId, bowler.name)}
                                                                    >
                                                                        {bowler.name}
                                                                    </span>
                                                                    {bowler.onStrike && <CricketBallIcon />}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right text-primary font-medium text-xs md:text-sm">{bowler.overs}</TableCell>
                                                            <TableCell className="text-right text-xs md:text-sm">{bowler.maidens}</TableCell>
                                                            <TableCell className="text-right text-xs md:text-sm">{bowler.runs}</TableCell>
                                                            <TableCell className="text-right font-bold text-orange-600 dark:text-orange-400 text-xs md:text-sm">{bowler.wickets}</TableCell>
                                                            <TableCell className="text-right text-xs md:text-sm">
                                                                <span className={cn(
                                                                    "font-medium",
                                                                    parseFloat(bowler.economy) <= 6 ? "text-green-600 dark:text-green-400" :
                                                                        parseFloat(bowler.economy) >= 10 ? "text-red-600 dark:text-red-400" :
                                                                            "text-primary"
                                                                )}>
                                                                    {bowler.economy}
                                                                </span>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                                {/* Match Info - Mobile: Second */}
                                <Card className="backdrop-blur-sm bg-white/50 dark:bg-gray-950/50 border-primary/10 order-2 lg:order-none">
                                    <CardHeader className="border-b dark:border-gray-800 p-3 md:p-6">
                                        <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                            Match Info
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="divide-y dark:divide-gray-800 p-3 md:pt-6 md:px-6 md:pb-6">
                                        <div className="py-3 md:py-4 first:pt-0 last:pb-0">
                                            <p className="font-semibold text-primary mb-2 text-sm md:text-base">Partnership</p>
                                            <p className="text-muted-foreground bg-gray-50/50 dark:bg-gray-900/30 p-2 rounded text-xs md:text-sm">
                                                {data?.partnership}
                                            </p>
                                        </div>
                                        <div className="py-3 md:py-4 first:pt-0 last:pb-0">
                                            <p className="font-semibold text-destructive mb-2 text-sm md:text-base">Last Wicket</p>
                                            <p className="text-muted-foreground bg-gray-50/50 dark:bg-gray-900/30 p-2 rounded text-xs md:text-sm">
                                                {data?.lastWicket}
                                            </p>
                                        </div>
                                        <div className="py-3 md:py-4 first:pt-0 last:pb-0">
                                            <p className="font-semibold text-orange-600 dark:text-orange-400 mb-2 text-sm md:text-base">Recent Overs</p>
                                            <p className="font-mono text-xs md:text-sm bg-gray-50/50 dark:bg-gray-900/30 p-2 rounded tracking-wider">
                                                {data?.recentOvers}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            )}
                        </div>
                    </div>
                )}
                {view === 'scorecard' && (
                    <>
                        <FullScorecard matchId={matchId} />
                    </>
                )}
                {view === 'squads' && (
                    <>
                        <MatchSquadsDisplay matchId={matchId} />
                    </>
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
