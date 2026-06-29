'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User } from 'lucide-react';
import { getPlayerProfile } from '@/app/actions';
import type { PlayerProfile } from '@/app/actions';
import PlayerProfileDisplay from '@/components/player-profile';
import { PlayerProfileSkeleton } from '@/components/match-skeletons';
import { useRecentHistoryContext } from '@/contexts/recent-history-context';

interface PlayerProfileContextType {
    openPlayer: (profileId: string, playerName?: string) => void;
}

const PlayerProfileContext = createContext<PlayerProfileContextType | null>(null);

export function usePlayerProfile() {
    const ctx = useContext(PlayerProfileContext);
    if (!ctx) throw new Error('usePlayerProfile must be used within PlayerProfileProvider');
    return ctx;
}

export function PlayerProfileProvider({ children }: { children: ReactNode }) {
    const [profileId, setProfileId] = useState<string | null>(null);
    const [playerName, setPlayerName] = useState<string | null>(null);
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const { addPlayer } = useRecentHistoryContext();

    const openPlayer = useCallback((id: string, name?: string) => {
        if (!id) return;
        setProfileId(id);
        setPlayerName(name ?? null);
        setProfile(null);
        if (name) addPlayer(id, name);
    }, [addPlayer]);

    useEffect(() => {
        if (!profileId) return;
        let cancelled = false;
        setLoading(true);
        getPlayerProfile(profileId, playerName ?? undefined).then(res => {
            if (cancelled) return;
            if (res.success && res.data) setProfile(res.data);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [profileId, playerName]);

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setProfileId(null);
            setPlayerName(null);
            setProfile(null);
            setLoading(false);
        }
    };

    return (
        <PlayerProfileContext.Provider value={{ openPlayer }}>
            {children}
            <Dialog open={!!profileId} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Player Profile</DialogTitle>
                    </DialogHeader>
                    {loading && <PlayerProfileSkeleton />}
                    {profile && <PlayerProfileDisplay profile={profile} />}
                    {!loading && !profile && profileId && (
                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                                <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">Couldn&apos;t load profile</p>
                            <p className="text-xs text-muted-foreground">Please try again in a moment.</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </PlayerProfileContext.Provider>
    );
}
