'use client';

import Link from 'next/link';
import { cn, buildMatchHref } from '@/lib/utils';
import type { VenueData, ForecastCard } from '@/app/actions';

interface Props {
    data: VenueData;
}

export default function VenueSection({ data }: Props) {
    return (
        <div className="space-y-4 md:space-y-6">
            {/* Ground header */}
            <div className="flex flex-col gap-0.5">
                <h3 className="font-display text-lg md:text-2xl text-foreground leading-tight">
                    {data.groundName}
                </h3>
                {(data.city || data.country) && (
                    <p className="text-xs text-muted-foreground">
                        {[data.city, data.country].filter(Boolean).join(', ')}
                    </p>
                )}
            </div>

            {/* Average scores — hero stat */}
            {data.averageScores && data.averageScores.values.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-card/30 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border/40 bg-muted/20 flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">{data.averageScores.heading}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{data.averageScores.label}</span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-border/30">
                        {data.averageScores.values.map((v, i) => (
                            <div key={i} className="px-4 py-4 text-center">
                                <div className="text-2xl md:text-3xl font-display stat-amber tabular-nums">
                                    {v.content}
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                                    {v.heading}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pitch + Ground + Runs Expected — quick reads */}
            {(data.pitchDetails.length > 0 || data.groundDetails.length > 0 || data.runsExpected.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        ...data.pitchDetails.map((x) => ({ ...x, kind: 'pitch' as const })),
                        ...data.runsExpected.map((x) => ({ ...x, kind: 'runs' as const })),
                        ...data.groundDetails.map((x) => ({ ...x, kind: 'ground' as const })),
                    ].map((item, i) => (
                        <div key={i} className="rounded-xl border border-border/50 p-3 bg-card/20">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className={cn(
                                    'w-1.5 h-1.5 rounded-full shrink-0',
                                    item.kind === 'pitch' ? 'bg-emerald-400' :
                                        item.kind === 'runs' ? 'bg-amber-400' : 'bg-cyan-400'
                                )} />
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                    {item.heading}
                                </span>
                            </div>
                            <p className="text-xs text-foreground/85 leading-relaxed">{item.content}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Stat cards (pace vs spin, phases, etc) */}
            {data.cards.map((card, i) => (
                <VenueStatCard key={i} card={card} />
            ))}

            {/* Recent matches */}
            {data.recentMatches && data.recentMatches.rows.length > 0 && (
                <div className="rounded-2xl border border-border/50 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border/40 bg-muted/20">
                        <span className="text-xs font-semibold text-foreground">{data.recentMatches.label}</span>
                    </div>
                    <div className="divide-y divide-border/25">
                        {data.recentMatches.rows.slice(0, 10).map((r, i) => (
                            <Link
                                key={i}
                                href={buildMatchHref(r.matchId, r.label)}
                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                            >
                                <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">{r.label}</span>
                                <div className="flex items-center gap-2 shrink-0 tabular-nums text-xs">
                                    <span className="text-foreground/80">{r.firstInnings}</span>
                                    <span className="text-muted-foreground/50">·</span>
                                    <span className="text-foreground/80">{r.secondInnings}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function VenueStatCard({ card }: { card: ForecastCard }) {
    return (
        <div className="rounded-2xl border border-border/50 bg-card/30 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/40 bg-muted/20 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-foreground">{card.cardHeading}</span>
                {card.cardLabel && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{card.cardLabel}</span>
                )}
            </div>
            <div className="divide-y divide-border/30">
                {card.subCard.map((sc, idx) => (
                    <div key={idx} className="px-4 py-3">
                        <p className="text-[11px] font-semibold text-foreground/90 mb-2">{sc.subCardHeading.trim()}</p>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-x-2 gap-y-2">
                            {sc.stats.map((s, si) => (
                                <div key={si}>
                                    <div className="text-sm font-display tabular-nums text-foreground leading-tight">
                                        {s.value}
                                    </div>
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
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
