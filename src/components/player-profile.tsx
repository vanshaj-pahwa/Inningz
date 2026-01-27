'use client';

import type { PlayerProfile } from '@/app/actions';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';


export default function PlayerProfileDisplay({ profile }: { profile: PlayerProfile }) {
    if (!profile) {
        return null;
    }

    const { info, bio, battingStats, bowlingStats } = profile;

    return (
        <div className="w-full bg-zinc-50 dark:bg-zinc-950">
            {/* Header Section */}
            <div className="relative bg-gradient-to-r from-green-900 to-zinc-950 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                <div className="relative max-w-7xl mx-auto px-6 py-8 md:px-12">
                    <div className="flex items-center gap-6">
                        {info.imageUrl && (
                            <div className="shrink-0">
                                <Image
                                    src={info.imageUrl}
                                    alt={info.name}
                                    width={100}
                                    height={100}
                                    className="rounded-full border-4 border-white shadow-lg bg-white"
                                />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl md:text-3xl font-display text-white mb-1.5 tracking-tight">{info.name}</h1>
                            <div className="flex items-center gap-2.5 text-white/95">
                                <span className="text-base font-medium">{info.country}</span>
                                {info.personal.role && info.personal.role !== '--' && (
                                    <>
                                        <span className="text-white/50">•</span>
                                        <span className="text-base">{info.personal.role}</span>
                                    </>
                                )}
                            </div>
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
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
                                <div className="px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50">
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
                                        <div className="pt-3 border-t border-zinc-200/30 dark:border-zinc-800/30"></div>
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


                            {/* Teams Card */}
                            {info.teams && info.teams !== '--' && (
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50">
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
                            {/* Recent Form */}
                            {profile.recentForm && (profile.recentForm.batting.length > 0 || profile.recentForm.bowling.length > 0) && (
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50">
                                        <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                            Recent Form
                                        </h3>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Batting Form */}
                                            {profile.recentForm.batting.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-3">Batting Form</h4>
                                                    <div className="border border-zinc-200/50 dark:border-zinc-800/50 rounded-lg overflow-hidden">
                                                        <div className="bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2 grid grid-cols-[0.8fr_1.2fr_0.8fr_1fr] gap-2 text-xs font-semibold uppercase text-muted-foreground">
                                                            <div>Oppn.</div>
                                                            <div className="text-right">Score</div>
                                                            <div className="text-right">Format</div>
                                                            <div className="text-right">Date</div>
                                                        </div>
                                                        <div className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30">
                                                            {profile.recentForm.batting.slice(0, 5).map((match, idx) => (
                                                                <div key={idx} className="px-3 py-2.5 grid grid-cols-[0.8fr_1.2fr_0.8fr_1fr] gap-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                                                    <div className="font-medium text-foreground">{match.opponent}</div>
                                                                    <div className="text-right font-bold text-foreground">{match.score}</div>
                                                                    <div className="text-right text-muted-foreground">{match.format}</div>
                                                                    <div className="text-right text-muted-foreground">{match.date}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Bowling Form */}
                                            {profile.recentForm.bowling.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-3">Bowling Form</h4>
                                                    <div className="border border-zinc-200/50 dark:border-zinc-800/50 rounded-lg overflow-hidden">
                                                        <div className="bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2 grid grid-cols-[0.8fr_1.2fr_0.8fr_1fr] gap-2 text-xs font-semibold uppercase text-muted-foreground">
                                                            <div>Oppn.</div>
                                                            <div className="text-right">Wickets</div>
                                                            <div className="text-right">Format</div>
                                                            <div className="text-right">Date</div>
                                                        </div>
                                                        <div className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30">
                                                            {profile.recentForm.bowling.slice(0, 5).map((match, idx) => (
                                                                <div key={idx} className="px-3 py-2.5 grid grid-cols-[0.8fr_1.2fr_0.8fr_1fr] gap-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                                                    <div className="font-medium text-foreground">{match.opponent}</div>
                                                                    <div className="text-right font-bold text-foreground">{match.wickets}</div>
                                                                    <div className="text-right text-muted-foreground">{match.format}</div>
                                                                    <div className="text-right text-muted-foreground">{match.date}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Career Statistics - Side by Side */}
                            {(profile.battingCareerSummary && profile.battingCareerSummary.length > 0) || (profile.bowlingCareerSummary && profile.bowlingCareerSummary.length > 0) ? (
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50">
                                        <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                            Career Summary
                                        </h3>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Batting Career Summary */}
                                            {profile.battingCareerSummary && profile.battingCareerSummary.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-3">Batting Career Summary</h4>
                                                    <div className="border border-zinc-200/50 dark:border-zinc-800/50 rounded-lg overflow-hidden">
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="bg-zinc-50 dark:bg-zinc-900/50">
                                                                    <th className="px-3 py-2 text-left font-bold text-zinc-600 dark:text-zinc-400"></th>
                                                                    <th className="px-3 py-2 text-right font-bold text-zinc-600 dark:text-zinc-400">Test</th>
                                                                    <th className="px-3 py-2 text-right font-bold text-zinc-600 dark:text-zinc-400">ODI</th>
                                                                    <th className="px-3 py-2 text-right font-bold text-zinc-600 dark:text-zinc-400">T20</th>
                                                                    <th className="px-3 py-2 text-right font-bold text-zinc-600 dark:text-zinc-400">IPL</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30">
                                                                {profile.battingCareerSummary.map((row, idx) => (
                                                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50/50 dark:bg-zinc-900/30'}>
                                                                        <td className="px-3 py-2 font-bold text-foreground">{row.stat}</td>
                                                                        <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">{row.values.test}</td>
                                                                        <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">{row.values.odi}</td>
                                                                        <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">{row.values.t20}</td>
                                                                        <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">{row.values.ipl}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Bowling Career Summary */}
                                            {profile.bowlingCareerSummary && profile.bowlingCareerSummary.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-3">Bowling Career Summary</h4>
                                                    <div className="border border-zinc-200/50 dark:border-zinc-800/50 rounded-lg overflow-hidden">
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="bg-zinc-50 dark:bg-zinc-900/50">
                                                                    <th className="px-3 py-2 text-left font-bold text-zinc-600 dark:text-zinc-400"></th>
                                                                    <th className="px-3 py-2 text-right font-bold text-zinc-600 dark:text-zinc-400">Test</th>
                                                                    <th className="px-3 py-2 text-right font-bold text-zinc-600 dark:text-zinc-400">ODI</th>
                                                                    <th className="px-3 py-2 text-right font-bold text-zinc-600 dark:text-zinc-400">T20</th>
                                                                    <th className="px-3 py-2 text-right font-bold text-zinc-600 dark:text-zinc-400">IPL</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30">
                                                                {profile.bowlingCareerSummary.map((row, idx) => (
                                                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50/50 dark:bg-zinc-900/30'}>
                                                                        <td className="px-3 py-2 font-bold text-foreground">{row.stat}</td>
                                                                        <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">{row.values.test}</td>
                                                                        <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">{row.values.odi}</td>
                                                                        <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">{row.values.t20}</td>
                                                                        <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">{row.values.ipl}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {/* Profile/Bio */}
                            {bio && (
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50">
                                        <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                            Profile
                                        </h3>
                                    </div>
                                    <div className="p-6">
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
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
                                <div className="px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                        Batting Career Summary
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-zinc-50 dark:bg-zinc-900/30">
                                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"></th>
                                                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Test</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">ODI</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">T20</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">IPL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30">
                                            {profile.battingCareerSummary.map((row, idx) => (
                                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50/50 dark:bg-zinc-900/30'}>
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
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
                                <div className="px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                        Batting Career Summary
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-zinc-50 dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
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
                                                <TableRow key={stat.format} className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50/50 dark:bg-zinc-900/30'}>
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
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
                                <div className="px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                                        Bowling Career Summary
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-zinc-50 dark:bg-zinc-900/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
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
                                                <TableRow key={stat.format} className={idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50/50 dark:bg-zinc-900/30'}>
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
