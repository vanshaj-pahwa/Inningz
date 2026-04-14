'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { MatchupsData, ForecastCard } from '@/app/actions';

interface Props {
    data: MatchupsData;
}

function playerImage(imageId?: string): string | null {
    if (!imageId) return null;
    return `https://static.cricbuzz.com/a/img/v1/225x225/i1/c${imageId}/player.jpg`;
}

export default function MatchupsSection({ data }: Props) {
    if (!data.cards.length) {
        return <p className="text-xs text-muted-foreground text-center py-8">No matchups available.</p>;
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {data.cards.map((card, i) => (
                <MatchupCard key={`${card.cardHeading}-${i}`} card={card} />
            ))}
        </div>
    );
}

function MatchupCard({ card }: { card: ForecastCard }) {
    const p1 = playerImage(card.playerOneImageId);
    const p2 = playerImage(card.playerTwoImageId);
    return (
        <div className="rounded-2xl border border-border/50 bg-card/30 overflow-hidden">
            {/* Header */}
            <div className="relative px-4 py-3 flex items-center gap-3 border-b border-border/40 bg-muted/20">
                <div className="flex -space-x-3 shrink-0">
                    {p1 && (
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-card bg-muted">
                            <Image src={p1} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized />
                        </div>
                    )}
                    {p2 && (
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-card bg-muted">
                            <Image src={p2} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold leading-tight truncate">{card.cardHeading}</h3>
                    {card.cardLabel && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                            {card.cardLabel}
                        </span>
                    )}
                </div>
            </div>

            {/* Subcards */}
            <div className="divide-y divide-border/30">
                {card.subCard.map((sc, idx) => (
                    <div key={idx} className="px-4 py-3">
                        <p className="text-xs font-medium text-foreground/90 mb-2.5">{sc.subCardHeading}</p>
                        <div className={cn(
                            'grid gap-x-3 gap-y-2',
                            sc.stats.length <= 3 ? 'grid-cols-3' : 'grid-cols-3 md:grid-cols-6'
                        )}>
                            {sc.stats.map((s, si) => (
                                <div key={si} className="text-center">
                                    <div className="text-sm md:text-base font-display text-foreground tabular-nums leading-tight">
                                        {s.value}
                                    </div>
                                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
                                        {s.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
