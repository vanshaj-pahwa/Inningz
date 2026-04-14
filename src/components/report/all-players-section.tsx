'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AllPlayersData, ForecastPlayer, ForecastPlayerBadge } from '@/app/actions';

interface Props {
    data: AllPlayersData;
}

function badgeEmoji(code: string): string {
    // Cricbuzz passes unicode code points as hex strings like "1F525" → 🔥
    try {
        const cp = parseInt(code, 16);
        if (!isNaN(cp)) return String.fromCodePoint(cp);
    } catch { /* noop */ }
    return '';
}

export default function AllPlayersSection({ data }: Props) {
    if (!data.playersByRole.length) {
        return <p className="text-xs text-muted-foreground text-center py-8">No player data available.</p>;
    }

    // Collect unique badges that actually appear on players in this match
    const uniqueBadges: ForecastPlayerBadge[] = [];
    const seen = new Set<string>();
    for (const group of data.playersByRole) {
        for (const p of group.players) {
            for (const b of p.badges) {
                if (seen.has(b.code)) continue;
                seen.add(b.code);
                uniqueBadges.push(b);
            }
        }
    }

    return (
        <div className="space-y-5 md:space-y-6">
            {uniqueBadges.length > 0 && <Legend badges={uniqueBadges} />}

            {data.playersByRole.map((group) => (
                <div key={group.role}>
                    <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground mb-2.5">
                        {group.role}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {group.players.map((p) => (
                            <PlayerRow key={p.id} player={p} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function Legend({ badges }: { badges: ForecastPlayerBadge[] }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-2xl border border-border/50 bg-card/20 overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors"
                aria-expanded={open}
            >
                <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground">
                    Legend
                </span>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {badges.map((b) => {
                            const emoji = badgeEmoji(b.code);
                            if (!emoji) return null;
                            return (
                                <span key={b.code} className="flex items-center gap-0.5">
                                    <span>{emoji}</span>
                                    <span className="hidden md:inline text-foreground/70">{b.label}</span>
                                </span>
                            );
                        })}
                    </div>
                    <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
                </div>
            </button>
            {open && (
                <div className="border-t border-border/40 p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {badges.map((b) => {
                        const emoji = badgeEmoji(b.code);
                        return (
                            <div key={b.code} className="rounded-xl border border-border/40 bg-card/40 p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    {emoji && <span className="text-base leading-none">{emoji}</span>}
                                    <span className="text-xs font-semibold text-foreground">{b.label}</span>
                                </div>
                                {b.desc && (
                                    <p className="text-[11px] text-foreground/70 leading-snug">{b.desc}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function PlayerRow({ player }: { player: ForecastPlayer }) {
    const style = player.playerStyle.map((s) => s.label).join(' · ');
    return (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-card/20 hover:bg-card/40 transition-colors">
            {/* Avatar */}
            <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                    {player.imageUrl ? (
                        <Image
                            src={player.imageUrl}
                            alt={player.name}
                            width={44}
                            height={44}
                            className="w-full h-full object-cover"
                            unoptimized
                        />
                    ) : (
                        <span className="text-sm font-bold text-muted-foreground">
                            {player.name.charAt(0)}
                        </span>
                    )}
                </div>
                {/* Team tag */}
                <span className={cn(
                    'absolute -bottom-1 -right-1 px-1 py-0.5 rounded-md text-[8px] font-bold tabular-nums',
                    'bg-card border border-border/60 text-foreground'
                )}>
                    {player.teamShortName}
                </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-foreground truncate">{player.name}</span>
                    {player.badges.map((b, i) => {
                        const emoji = badgeEmoji(b.code);
                        if (!emoji) return null;
                        return (
                            <span key={i} title={b.desc || b.label} className="text-sm leading-none">
                                {emoji}
                            </span>
                        );
                    })}
                </div>
                {style && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{style}</p>
                )}
                {player.description && (
                    <p className="text-[11px] text-foreground/70 leading-snug mt-1.5 line-clamp-3">
                        {player.description}
                    </p>
                )}
            </div>
        </div>
    );
}
