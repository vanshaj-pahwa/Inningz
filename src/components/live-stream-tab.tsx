'use client';

import { useEffect, useState, useCallback } from 'react';
import { getStreamMatchList } from '@/app/actions';
import { findBestStreamMatch, type MatchCandidate } from '@/lib/match-matcher';
import LiveStreamPlayer from './live-stream-player';
import { X, Radio } from 'lucide-react';

interface LiveStreamTabProps {
    matchTitle: string;
    teams: { name: string }[];
}

export default function LiveStreamTab({ matchTitle, teams }: LiveStreamTabProps) {
    const [loading, setLoading] = useState(true);
    const [streamMatchId, setStreamMatchId] = useState<string | null>(null);
    const [matchInfo, setMatchInfo] = useState<MatchCandidate | null>(null);
    const [visible, setVisible] = useState(true);

    const findStream = useCallback(async () => {
        setLoading(true);
        setStreamMatchId(null);
        setMatchInfo(null);

        try {
            const listResult = await getStreamMatchList();
            if (!listResult.success || !listResult.matches?.length) {
                setLoading(false);
                return;
            }

            const match = findBestStreamMatch(matchTitle, teams, listResult.matches);
            if (match) {
                setMatchInfo(match);
                setStreamMatchId(match.streamMatchId);
            }
        } catch {
            // Silently fail — no stream shown
        } finally {
            setLoading(false);
        }
    }, [matchTitle, teams]);

    useEffect(() => {
        findStream();
    }, [findStream]);

    // Don't render anything while loading or if no stream found
    if (loading || !streamMatchId) {
        return null;
    }

    const streamUrl = `/api/stream/${streamMatchId}`;
    const title = matchInfo ? `${matchInfo.team1} vs ${matchInfo.team2}` : matchTitle;

    if (!visible) {
        return (
            <button
                onClick={() => setVisible(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold active:scale-[0.98] transition-all"
            >
                <Radio className="w-4 h-4 animate-pulse" />
                Watch Live
            </button>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setVisible(false)}
                className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                aria-label="Hide live stream"
            >
                <X className="w-4 h-4" />
            </button>
            <LiveStreamPlayer
                streamUrl={streamUrl}
                title={title}
            />
        </div>
    );
}
