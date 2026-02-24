'use client';

import { useEffect, useState, useCallback } from 'react';
import { getStreamMatchList } from '@/app/actions';
import { findBestStreamMatch, type MatchCandidate } from '@/lib/match-matcher';
import LiveStreamPlayer from './live-stream-player';
import { LoaderCircle, Radio, AlertTriangle, RefreshCw, Tv } from 'lucide-react';
import { Button } from './ui/button';

interface LiveStreamTabProps {
    matchTitle: string;
    teams: { name: string }[];
}

export default function LiveStreamTab({ matchTitle, teams }: LiveStreamTabProps) {
    const [loading, setLoading] = useState(true);
    const [streamMatchId, setStreamMatchId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [matchInfo, setMatchInfo] = useState<MatchCandidate | null>(null);

    const findStream = useCallback(async () => {
        setLoading(true);
        setError(null);
        setStreamMatchId(null);
        setMatchInfo(null);

        try {
            const listResult = await getStreamMatchList();
            if (!listResult.success || !listResult.matches?.length) {
                setError('No live cricket streams available at the moment.');
                setLoading(false);
                return;
            }

            const match = findBestStreamMatch(matchTitle, teams, listResult.matches);
            if (!match) {
                setError(`Could not find a stream for this match. ${listResult.matches.length} cricket streams are live but none matched "${matchTitle}".`);
                setLoading(false);
                return;
            }

            setMatchInfo(match);
            setStreamMatchId(match.streamMatchId);
        } catch {
            setError('Failed to find stream. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [matchTitle, teams]);

    useEffect(() => {
        findStream();
    }, [findStream]);

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative">
                    <Tv className="w-12 h-12 text-cyan-400/50" />
                    <LoaderCircle className="w-6 h-6 text-cyan-400 animate-spin absolute -top-1 -right-1" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-medium text-foreground/80">Finding stream...</p>
                    <p className="text-xs text-muted-foreground mt-1">Matching {matchTitle.split(',')[0]}</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !streamMatchId) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4 px-4">
                <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-orange-400" />
                </div>
                <div className="text-center max-w-md">
                    <p className="text-sm font-medium text-foreground/80">{error || 'Stream not available'}</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 mt-2"
                    onClick={findStream}
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Match info badge */}
            {matchInfo && (
                <div className="flex items-center gap-2 px-1">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                        <Radio className="w-3 h-3 text-red-400 animate-pulse" />
                        <span className="text-[11px] font-semibold text-red-400 tracking-wide">LIVE</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {matchInfo.team1} vs {matchInfo.team2}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">
                        ({Math.round(matchInfo.confidence * 100)}% match)
                    </span>
                </div>
            )}

            {/* Video Player - uses our API route, no real URLs exposed */}
            <LiveStreamPlayer
                streamUrl={`/api/stream/${streamMatchId}`}
                title={matchInfo ? `${matchInfo.team1} vs ${matchInfo.team2}` : matchTitle}
            />
        </div>
    );
}
