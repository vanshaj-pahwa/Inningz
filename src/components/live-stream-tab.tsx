'use client';

import { useEffect, useState, useCallback } from 'react';
import { getStreamMatchList } from '@/app/actions';
import { findBestStreamMatch, type MatchCandidate } from '@/lib/match-matcher';
import LiveStreamPlayer from './live-stream-player';

interface LiveStreamTabProps {
    matchTitle: string;
    teams: { name: string }[];
}

export default function LiveStreamTab({ matchTitle, teams }: LiveStreamTabProps) {
    const [loading, setLoading] = useState(true);
    const [streamMatchId, setStreamMatchId] = useState<string | null>(null);
    const [matchInfo, setMatchInfo] = useState<MatchCandidate | null>(null);

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

    return (
        <LiveStreamPlayer
            streamUrl={`/api/stream/${streamMatchId}`}
            title={matchInfo ? `${matchInfo.team1} vs ${matchInfo.team2}` : matchTitle}
        />
    );
}
