'use client';

import type { PlayerProfile } from '@/app/actions';
import Image from 'next/image';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';


export default function PlayerProfileDisplay({ profile }: { profile: PlayerProfile }) {
    if (!profile) {
        return null;
    }

    const { info, bio, battingStats, bowlingStats } = profile;

    return (
        <div className="w-full bg-background">
            {/* Header Section */}
            <div className="relative bg-gradient-to-r from-green-900 to-zinc-950 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                <div className="relative max-w-7xl mx-auto px-4 py-6 md:px-12 md:py-8">
                    <div className="flex items-center gap-4 md:gap-6">
                        {info.imageUrl && (
                            <div className="shrink-0">
                                <Image
                                    src={info.imageUrl}
                                    alt={info.name}
                                    width={225}
                                    height={225}
                                    className="w-[72px] h-[72px] md:w-[100px] md:h-[100px] rounded-full border-[3px] md:border-4 border-white/90 shadow-lg bg-white"
                                    unoptimized
                                />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl md:text-3xl font-display text-white mb-0.5 md:mb-1.5 tracking-tight truncate">{info.name}</h1>
                            <div className="flex items-center gap-1.5 md:gap-2.5 text-white/90">
                                <span className="text-sm md:text-base font-medium">{info.country}</span>
                                {info.personal.role && info.personal.role !== '--' && (
                                    <>
                                        <span className="text-white/40">•</span>
                                        <span className="text-sm md:text-base text-white/75">{info.personal.role}</span>
                                    </>
                                )}
                            </div>
                            <HeaderRankings rankings={profile.rankings} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">

                {/* Main Content */}
                <div className="px-4 md:px-6 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Sidebar */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Personal Information Card */}
                            <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
                                <div className="px-6 py-4 border-b border-border/50 bg-muted/50">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                        Personal Information
                                    </h3>
                                </div>
                                <div className="p-6">
                                    <dl className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <dt className="text-sm text-muted-foreground">Born</dt>
                                            <dd className="text-sm font-semibold text-foreground text-right">{info.personal.born}</dd>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <dt className="text-sm text-muted-foreground">Birth Place</dt>
                                            <dd className="text-sm font-semibold text-foreground text-right max-w-[60%]">{info.personal.birthPlace}</dd>
                                        </div>
                                        {info.personal.height !== '--' && (
                                            <div className="flex justify-between items-start">
                                                <dt className="text-sm text-muted-foreground">Height</dt>
                                                <dd className="text-sm font-semibold text-foreground">{info.personal.height}</dd>
                                            </div>
                                        )}
                                        <div className="pt-3 border-t border-border/30"></div>
                                        <div className="flex justify-between items-start">
                                            <dt className="text-sm text-muted-foreground">Batting Style</dt>
                                            <dd className="text-sm font-semibold text-foreground text-right">{info.personal.battingStyle}</dd>
                                        </div>
                                        {info.personal.bowlingStyle !== '--' && (
                                            <div className="flex justify-between items-start">
                                                <dt className="text-sm text-muted-foreground">Bowling Style</dt>
                                                <dd className="text-sm font-semibold text-foreground text-right">{info.personal.bowlingStyle}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>
                            </div>

                            {/* ICC Rankings Card */}
                            <ICCRankingsCard rankings={profile.rankings} />

                            {/* Recent Form */}
                            <RecentFormCard recentForm={profile.recentForm} />

                            {/* Teams Card */}
                            {info.teams && info.teams !== '--' && (
                                <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-border/50 bg-muted/50">
                                        <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                            Teams
                                        </h3>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{info.teams}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Content */}
                        <div className="lg:col-span-8 space-y-6">
                            {/* Career Summary */}
                            <CareerSummaryCard
                                battingCareerSummary={profile.battingCareerSummary}
                                bowlingCareerSummary={profile.bowlingCareerSummary}
                            />

                            {/* Profile/Bio */}
                            {bio && (
                                <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
                                    <div className="px-5 py-3.5 border-b border-border/50 bg-muted/50">
                                        <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                            Profile
                                        </h3>
                                    </div>
                                    <div className="p-5">
                                        <div
                                            className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: bio }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Old Format Career Statistics (Fallback) */}
                    <div className="mt-6 space-y-6">
                        {/* Batting Stats - Old Format (fallback) */}
                        {(!profile.battingCareerSummary || profile.battingCareerSummary.length === 0) && battingStats.length > 0 && (
                            <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
                                <div className="px-6 py-4 border-b border-border/50 bg-muted/50">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                        Batting Career Summary
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-muted/30">
                                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"></th>
                                                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Test</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">ODI</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">T20</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">IPL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30">
                                            {profile.battingCareerSummary.map((row, idx) => (
                                                <tr key={idx} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                                                    <td className="px-4 py-3 text-sm font-bold text-foreground">{row.stat}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-zinc-600 dark:text-zinc-400">{row.values.test}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-zinc-600 dark:text-zinc-400">{row.values.odi}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-zinc-600 dark:text-zinc-400">{row.values.t20}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-zinc-600 dark:text-zinc-400">{row.values.ipl}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Batting Stats - Old Format (fallback) */}
                        {(!profile.battingCareerSummary || profile.battingCareerSummary.length === 0) && battingStats.length > 0 && (
                            <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
                                <div className="px-6 py-4 border-b border-border/50 bg-muted/50">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                        Batting Career Summary
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead className="font-bold text-foreground">Format</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">M</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">Inn</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">NO</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">Runs</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">HS</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">Avg</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">BF</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">SR</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">100</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">50</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">4s</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">6s</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {battingStats.map((stat, idx) => (
                                                <TableRow key={stat.format} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                                                    <TableCell className="font-semibold text-foreground">{stat.format}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.matches}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.innings}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.notOuts}</TableCell>
                                                    <TableCell className="text-right font-bold text-foreground">{stat.runs}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.highest}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.average}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.ballsFaced}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.strikeRate}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.hundreds}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.fifties}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.fours}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.sixes}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* Bowling Stats - Old Format (fallback) */}
                        {(!profile.bowlingCareerSummary || profile.bowlingCareerSummary.length === 0) && bowlingStats.length > 0 && (
                            <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
                                <div className="px-6 py-4 border-b border-border/50 bg-muted/50">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                        Bowling Career Summary
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead className="font-bold text-foreground">Format</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">M</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">Inn</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">B</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">Runs</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">Wkts</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">BBI</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">BBM</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">Econ</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">Avg</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">SR</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">5W</TableHead>
                                                <TableHead className="text-right font-bold text-foreground">10W</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {bowlingStats.map((stat, idx) => (
                                                <TableRow key={stat.format} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                                                    <TableCell className="font-semibold text-foreground">{stat.format}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.matches}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.innings}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.balls}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.runs}</TableCell>
                                                    <TableCell className="text-right font-bold text-foreground">{stat.wickets}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.bbi}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.bbm}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.economy}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.average}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.strikeRate}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.fiveWickets}</TableCell>
                                                    <TableCell className="text-right text-zinc-600 dark:text-zinc-400">{stat.tenWickets}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ICCRankingsCard({ rankings }: { rankings?: PlayerProfile['rankings'] }) {
    const [tab, setTab] = useState<'batting' | 'bowling' | 'allRounder'>('batting');

    if (!rankings) return null;

    const hasAnyRanking = ['batting', 'bowling', 'allRounder'].some((cat) => {
        const r = rankings[cat as keyof typeof rankings];
        return r && (r.test !== '--' || r.odi !== '--' || r.t20 !== '--');
    });
    if (!hasAnyRanking) return null;

    const current = rankings[tab];
    const tabs = [
        { key: 'batting' as const, label: 'Bat' },
        { key: 'bowling' as const, label: 'Bowl' },
        { key: 'allRounder' as const, label: 'All-Round' },
    ];

    const rows = [
        { format: 'Test', rank: current?.test ?? '--', best: current?.testBest ?? '--' },
        { format: 'ODI', rank: current?.odi ?? '--', best: current?.odiBest ?? '--' },
        { format: 'T20I', rank: current?.t20 ?? '--', best: current?.t20Best ?? '--' },
    ];

    return (
        <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50 bg-muted/50 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                    ICC Rankings
                </h3>
                <div className="flex items-center bg-muted rounded-full p-0.5">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-2.5 py-0.5 text-[11px] rounded-full transition-all ${
                                tab === t.key
                                    ? 'bg-green-600 text-white font-semibold shadow-sm'
                                    : 'text-zinc-500 dark:text-zinc-400 hover:text-foreground'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-3 gap-3">
                    {rows.map((row) => (
                        <div key={row.format} className="text-center rounded-xl bg-muted/50 py-3 px-2">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{row.format}</div>
                            <div className={`text-2xl font-bold tracking-tight ${row.rank !== '--' ? 'text-foreground' : 'text-zinc-300 dark:text-zinc-600'}`}>
                                {row.rank !== '--' ? row.rank : '--'}
                            </div>
                            {row.best !== '--' && (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                                    Best {row.best}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function RecentFormCard({ recentForm }: { recentForm?: PlayerProfile['recentForm'] }) {
    const hasBatting = recentForm && recentForm.batting.length > 0;
    const hasBowling = recentForm && recentForm.bowling.length > 0;
    if (!hasBatting && !hasBowling) return null;

    const [tab, setTab] = useState<'batting' | 'bowling'>(hasBatting ? 'batting' : 'bowling');

    const tabs = [
        ...(hasBatting ? [{ key: 'batting' as const, label: 'Batting' }] : []),
        ...(hasBowling ? [{ key: 'bowling' as const, label: 'Bowling' }] : []),
    ];

    const isBatting = tab === 'batting' && hasBatting;
    const data = isBatting ? recentForm!.batting.slice(0, 5) : recentForm!.bowling.slice(0, 5);

    return (
        <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50 bg-muted/50 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                    Recent Form
                </h3>
                {tabs.length > 1 && (
                    <div className="flex items-center bg-muted rounded-full p-0.5">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`px-2.5 py-0.5 text-[11px] rounded-full transition-all ${
                                    tab === t.key
                                        ? 'bg-green-600 text-white font-semibold shadow-sm'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-foreground'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="p-4">
                <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr] gap-2 px-3 pb-2 mb-1 border-b border-border/50">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{isBatting ? 'Score' : 'Figures'}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Vs</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Format</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Date</div>
                </div>
                <div className="space-y-0.5">
                    {data.map((match, idx) => (
                        <div key={idx} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr] gap-2 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="text-sm font-bold text-foreground tabular-nums">
                                {isBatting ? (match as any).score : (match as any).wickets}
                            </div>
                            <div className="text-xs text-right text-foreground self-center">{match.opponent}</div>
                            <div className="text-xs text-right text-muted-foreground self-center">{match.format}</div>
                            <div className="text-xs text-right text-muted-foreground self-center">{match.date}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function CareerSummaryCard({ battingCareerSummary, bowlingCareerSummary }: {
    battingCareerSummary?: PlayerProfile['battingCareerSummary'];
    bowlingCareerSummary?: PlayerProfile['bowlingCareerSummary'];
}) {
    const hasBatting = battingCareerSummary && battingCareerSummary.length > 0;
    const hasBowling = bowlingCareerSummary && bowlingCareerSummary.length > 0;
    if (!hasBatting && !hasBowling) return null;

    const [tab, setTab] = useState<'batting' | 'bowling'>(hasBatting ? 'batting' : 'bowling');

    const tabs = [
        ...(hasBatting ? [{ key: 'batting' as const, label: 'Batting' }] : []),
        ...(hasBowling ? [{ key: 'bowling' as const, label: 'Bowling' }] : []),
    ];

    const rows = tab === 'batting' && hasBatting ? battingCareerSummary! : bowlingCareerSummary!;

    return (
        <div className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50 bg-muted/50 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                    Career Summary
                </h3>
                {tabs.length > 1 && (
                    <div className="flex items-center bg-muted rounded-full p-0.5">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`px-2.5 py-0.5 text-[11px] rounded-full transition-all ${
                                    tab === t.key
                                        ? 'bg-green-600 text-white font-semibold shadow-sm'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-foreground'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="p-4 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border/50">
                            <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"></th>
                            <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Test</th>
                            <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">ODI</th>
                            <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">T20</th>
                            <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">IPL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx} className="border-b last:border-b-0 border-border/20">
                                <td className="py-2 pr-3 font-semibold text-foreground whitespace-nowrap">{row.stat}</td>
                                <td className="py-2 text-right text-zinc-500 dark:text-zinc-400 tabular-nums">{row.values.test}</td>
                                <td className="py-2 text-right text-zinc-500 dark:text-zinc-400 tabular-nums">{row.values.odi}</td>
                                <td className="py-2 text-right text-zinc-500 dark:text-zinc-400 tabular-nums">{row.values.t20}</td>
                                <td className="py-2 text-right text-zinc-500 dark:text-zinc-400 tabular-nums">{row.values.ipl}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function HeaderRankings({ rankings }: { rankings?: PlayerProfile['rankings'] }) {
    if (!rankings) return null;

    const categories = [
        { key: 'batting' as const, label: 'Bat', data: rankings.batting },
        { key: 'bowling' as const, label: 'Bowl', data: rankings.bowling },
        { key: 'allRounder' as const, label: 'AR', data: rankings.allRounder },
    ];

    const badges: { label: string; rank: string }[] = [];
    for (const cat of categories) {
        if (!cat.data) continue;
        const formats = [
            { fmt: 'Test', rank: cat.data.test },
            { fmt: 'ODI', rank: cat.data.odi },
            { fmt: 'T20I', rank: cat.data.t20 },
        ];
        for (const f of formats) {
            if (f.rank !== '--') {
                badges.push({ label: `${cat.label} ${f.fmt}`, rank: f.rank });
            }
        }
    }

    if (badges.length === 0) return null;

    badges.sort((a, b) => Number(a.rank) - Number(b.rank));

    return (
        <div className="flex flex-wrap items-center gap-1 md:gap-1.5 mt-2 md:mt-2.5">
            {badges.map((b) => (
                <span key={b.label} className="inline-flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-0.5 rounded-full bg-white/10 text-white/90 text-[10px] md:text-xs">
                    <span className="text-white/50">{b.label}</span>
                    <span className="font-bold">{b.rank}</span>
                </span>
            ))}
        </div>
    );
}
