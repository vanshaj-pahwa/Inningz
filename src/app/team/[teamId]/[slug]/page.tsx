'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { CommandPaletteTrigger } from '@/components/command-palette';
import Breadcrumbs from '@/components/breadcrumbs';
import { getTeamSchedule, getICCTeamRankings } from '@/app/actions';
import type { LiveMatch, TeamSchedule, TeamRankingEntry } from '@/app/actions';
import { buildTeamHref, buildMatchHref } from '@/lib/utils';
import { teamFlagHdFromUrl } from '@/lib/upstream';

const FMT_ORDER = ['TEST', 'ODI', 'T20I', 'T20'];

// Unified flag treatment — same tight rectangle and 2px border radius as
// MatchCard uses (`rounded-[2px]`), so flags read the same across the app.
// Every size below preserves cricbuzz's 4:3 flag aspect.
function TeamFlag({
    src, alt, size = 'sm', priority,
}: { src?: string; alt: string; size?: 'sm' | 'md' | 'lg' | 'xl'; priority?: boolean }) {
    const box = {
        sm: 'w-6 h-[18px]',   // fixture row + sidebar list — matches MatchCard 1:1
        md: 'w-9 h-[27px]',   // next-up team flag
        lg: 'w-14 h-[42px]',  // large chip
        xl: 'w-24 h-[72px]',  // hero masthead
    }[size];
    return (
        <div className={`${box} overflow-hidden bg-muted rounded-[2px] ring-1 ring-black/5 dark:ring-white/10 shrink-0`}>
            {src ? (
                <Image
                    src={src}
                    alt={alt}
                    width={288}
                    height={208}
                    className="w-full h-full object-cover"
                    unoptimized
                    priority={priority}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    {alt.charAt(0)}
                </div>
            )}
        </div>
    );
}

export default function TeamPage() {
    const router = useRouter();
    const params = useParams();
    const teamId = Array.isArray(params.teamId) ? params.teamId[0] : (params.teamId as string);
    const slug = Array.isArray(params.slug) ? params.slug[0] : (params.slug as string);

    const [data, setData] = useState<TeamSchedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ranks, setRanks] = useState<{ test?: TeamRankingEntry; odi?: TeamRankingEntry; t20?: TeamRankingEntry }>({});
    const [odiTop, setOdiTop] = useState<TeamRankingEntry[]>([]);

    useEffect(() => {
        (async () => {
            const [test, odi, t20] = await Promise.all([
                getICCTeamRankings('test'),
                getICCTeamRankings('odi'),
                getICCTeamRankings('t20'),
            ]);
            const findFor = (r: typeof test): TeamRankingEntry | undefined => {
                if (!r.success || !r.data) return undefined;
                return r.data.entries.find(e => e.teamId === teamId);
            };
            setRanks({ test: findFor(test), odi: findFor(odi), t20: findFor(t20) });
            if (odi.success && odi.data) setOdiTop(odi.data.entries.slice(0, 14));
        })();
    }, [teamId]);

    useEffect(() => {
        if (!teamId) return;
        (async () => {
            setLoading(true);
            setError(null);
            const res = await getTeamSchedule(teamId, slug || '');
            if (res.success && res.data) setData(res.data);
            else setError(res.error || 'Failed to load team');
            setLoading(false);
        })();
    }, [teamId, slug]);

    const readableName = useMemo(() => {
        const fromData = data?.teamName?.trim();
        if (fromData) return fromData;
        return (slug || 'Team')
            .split('-')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    }, [data?.teamName, slug]);

    // Real form derived from recent results — 'W' if the status mentions this
    // team winning, 'L' otherwise, 'D' on draws/ties/no-results.
    const form = useMemo(() => {
        if (!data) return [];
        const teamNameLower = readableName.toLowerCase();
        return data.recent.slice(0, 5).map(m => {
            const s = (m.status || '').toLowerCase();
            if (s.includes('draw') || s.includes('tied') || s.includes('no result') || s.includes('abandoned')) return 'D';
            const wonPrefix = s.startsWith(`${teamNameLower} won`) || s.includes(` ${teamNameLower} won`);
            return wonPrefix ? 'W' : 'L';
        });
    }, [data, readableName]);

    const nextMatch = data?.live[0] || data?.upcoming[0];

    // Countdown seconds for the "Next up" hero.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-50 w-full glass-nav border-b border-border/40">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="flex items-center justify-between h-14 md:h-16 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl h-9 w-9 shrink-0"
                                onClick={() => router.back()}
                                aria-label="Back"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <Link href="/" aria-label="Inningz home" className="shrink-0">
                                <Image src="/logo-full-transparent.png" alt="Inningz" width={400} height={120} priority className="hidden dark:block h-9 md:h-11 w-auto" />
                                <Image src="/logo-full-dark.png" alt="Inningz" width={400} height={120} priority className="block dark:hidden h-9 md:h-11 w-auto" />
                            </Link>
                            {/* Persistent team identity in the sticky bar once
                                the masthead scrolls off. Compact so it doesn't
                                fight the logo. */}
                            {data && (
                                <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-border/50 min-w-0">
                                    <TeamFlag src={data.teamFlagUrl} alt={readableName} size="sm" />
                                    <span className="text-sm font-semibold truncate">{readableName}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <CommandPaletteTrigger />
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-16">
                {/* Masthead — team identity, rank pills and recent form on one
                    row. No tab strip; everything renders on this page. */}
                <section className="pt-4 md:pt-6 pb-6 md:pb-8 gradient-border mb-6 md:mb-8">
                    <Breadcrumbs
                        className="mb-3"
                        items={[
                            { label: 'Home', href: '/' },
                            { label: 'Rankings', href: '/rankings?category=teams' },
                        ]}
                    />
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div className="flex items-center gap-4 md:gap-5">
                            <TeamFlag src={teamFlagHdFromUrl(data?.teamFlagUrl) || data?.teamFlagUrl} alt={readableName} size="xl" priority />
                            <div className="min-w-0">
                                <h1 className="text-3xl md:text-5xl font-display tracking-tight text-foreground leading-[1.05] truncate">
                                    {loading ? <span className="opacity-60">Loading&hellip;</span> : readableName}
                                </h1>
                                {data && (
                                    <div className="mt-2 text-xs md:text-sm text-muted-foreground">
                                        <span className="tabular-nums font-semibold text-foreground/80">{data.upcoming.length}</span> upcoming
                                        <span className="text-muted-foreground/40 mx-2" aria-hidden>·</span>
                                        <span className="tabular-nums font-semibold text-foreground/80">{data.recent.length}</span> recent
                                        {data.live.length > 0 && (
                                            <>
                                                <span className="text-muted-foreground/40 mx-2" aria-hidden>·</span>
                                                <span className="inline-flex items-center gap-1.5 text-red-500 dark:text-red-400 font-semibold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 live-pulse" />
                                                    <span className="tabular-nums">{data.live.length} live</span>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <RankPill label="Test" entry={ranks.test} />
                            <RankPill label="ODI" entry={ranks.odi} />
                            <RankPill label="T20I" entry={ranks.t20} />
                            {form.length > 0 && (
                                <div className="ml-1 md:ml-2 flex items-center gap-2 pl-3 md:pl-4 border-l border-border/60">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Form</span>
                                    <div className="flex items-center gap-1">
                                        {form.map((r, i) => (
                                            <FormDot key={i} result={r} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {loading && <PageSkeleton />}

                {!loading && error && (
                    <div className="surface-card p-8 text-center rounded-2xl">
                        <p className="font-display text-lg">Couldn&apos;t load this team</p>
                        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                    </div>
                )}

                {!loading && !error && data && (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8">
                        <div className="min-w-0 space-y-8 md:space-y-10">
                            {nextMatch && <NextUp match={nextMatch} now={now} />}
                            {data.live.length > 0 && <FixtureBlock title="Live" matches={data.live} live />}
                            {data.upcoming.length > (nextMatch && data.live.length === 0 ? 1 : 0) && (
                                <FixtureBlock
                                    title="Upcoming"
                                    matches={data.live.length === 0 ? data.upcoming.slice(1) : data.upcoming}
                                />
                            )}
                            {data.recent.length > 0 && <FixtureBlock title="Recent results" matches={data.recent} />}
                            {data.live.length === 0 && data.upcoming.length === 0 && data.recent.length === 0 && (
                                <div className="surface-card p-10 text-center rounded-2xl">
                                    <p className="font-display text-lg">No fixtures on the wire</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Check back after the next series announcement.
                                    </p>
                                </div>
                            )}
                        </div>
                        <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
                            <FormatBreakdown data={data} />
                            <OtherTeams currentTeamId={teamId} teams={odiTop} />
                        </aside>
                    </div>
                )}
            </main>
        </div>
    );
}

function RankPill({ label, entry }: { label: string; entry?: TeamRankingEntry }) {
    if (!entry) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/50 bg-card/40 text-xs">
                <span className="text-muted-foreground font-semibold">{label}</span>
                <span className="text-muted-foreground/60 tabular-nums">–</span>
            </span>
        );
    }
    const rank = parseInt(entry.rank, 10);
    const top3 = rank >= 1 && rank <= 3;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${
            top3
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border/60 bg-card/40 text-foreground'
        }`}>
            <span className="text-muted-foreground font-semibold">{label}</span>
            <span className={`tabular-nums font-bold ${top3 ? 'text-primary' : 'text-foreground'}`}>#{entry.rank}</span>
            <span className="text-muted-foreground/70 tabular-nums text-[10px]">{entry.rating}</span>
        </span>
    );
}

function FormDot({ result }: { result: 'W' | 'L' | 'D' }) {
    const style =
        result === 'W'
            ? 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border-emerald-500/30'
            : result === 'L'
            ? 'bg-red-500/20 text-red-500 dark:text-red-400 border-red-500/30'
            : 'bg-muted text-muted-foreground border-border/50';
    return (
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold border ${style}`}>
            {result}
        </span>
    );
}

function NextUp({ match, now }: { match: LiveMatch; now: number }) {
    const startMs = match.startDate
        ? match.startDate < 10_000_000_000 ? match.startDate * 1000 : match.startDate
        : undefined;
    const countdown = startMs ? buildCountdown(startMs - now) : null;
    const [teamA, teamB] = match.teams;
    const href = buildMatchHref(match.matchId, match.title);
    return (
        <Link
            href={href}
            className="block surface-card rounded-2xl overflow-hidden hover:border-primary/40 transition-colors group"
        >
            <div className="px-4 md:px-5 py-2.5 border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Next up</span>
                    {match.matchFormat && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            · {match.matchFormat}
                        </span>
                    )}
                </div>
                {countdown && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-500 dark:text-amber-400">
                        <Clock className="w-3 h-3" />
                        <span className="tabular-nums">{countdown}</span>
                    </span>
                )}
            </div>
            <div className="p-5 md:p-6">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-6">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <TeamFlag src={teamA?.flagUrl} alt={teamA?.name || 'Team A'} size="lg" />
                        <span className="font-display text-lg md:text-2xl tracking-tight truncate">{teamA?.name}</span>
                    </div>
                    <span className="text-muted-foreground/40 font-display text-xl md:text-2xl">vs</span>
                    <div className="flex items-center gap-3 md:gap-4 min-w-0 justify-end">
                        <span className="font-display text-lg md:text-2xl tracking-tight truncate text-right">{teamB?.name}</span>
                        <TeamFlag src={teamB?.flagUrl} alt={teamB?.name || 'Team B'} size="lg" />
                    </div>
                </div>
                <div className="mt-4 md:mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs md:text-sm text-muted-foreground">
                    {match.seriesName && <span className="truncate">{match.seriesName}</span>}
                    {startMs && (
                        <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 opacity-70" />
                            <span className="tabular-nums">{formatFullTime(startMs)}</span>
                        </span>
                    )}
                    {match.venue && (
                        <span className="inline-flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 opacity-70" />
                            <span className="truncate">{match.venue}</span>
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}

function FixtureBlock({ title, matches, live }: { title: string; matches: LiveMatch[]; live?: boolean }) {
    if (matches.length === 0) return null;
    return (
        <section>
            <header className="flex items-baseline gap-2 mb-3 md:mb-4">
                <h2 className="font-display text-xl md:text-2xl tracking-tight">{title}</h2>
                <span className="text-xs md:text-sm text-muted-foreground tabular-nums">{matches.length}</span>
                {live && (
                    <span className="ml-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-500 dark:text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 live-pulse" />
                        Live
                    </span>
                )}
            </header>
            <div className="surface-card rounded-2xl divide-y divide-border/50 overflow-hidden">
                {matches.map(m => (
                    <FixtureRow key={m.matchId} match={m} />
                ))}
            </div>
        </section>
    );
}

function FixtureRow({ match }: { match: LiveMatch }) {
    const [teamA, teamB] = match.teams;
    const status = (match.status || '').toLowerCase();
    const isLive = /live|innings|resumed|toss/.test(status);
    const isComplete = /won|drawn|tied|no result|abandoned|complete/.test(status);
    const startMs = match.startDate
        ? match.startDate < 10_000_000_000 ? match.startDate * 1000 : match.startDate
        : undefined;
    const href = buildMatchHref(match.matchId, match.title);
    return (
        <Link href={href} className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5 hover:bg-muted/30 transition-colors group">
            <div className="w-14 md:w-16 shrink-0 text-left">
                {startMs ? (
                    <>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground tabular-nums leading-tight">
                            {new Date(startMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70 tabular-nums leading-tight mt-0.5">
                            {new Date(startMs).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </div>
                    </>
                ) : (
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">TBC</div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <TeamFlag src={teamA?.flagUrl} alt={teamA?.name || 'A'} size="sm" />
                    <span className="text-sm md:text-[15px] font-semibold truncate">{teamA?.name}</span>
                    {teamA?.score && (
                        <span className="text-xs md:text-sm font-semibold tabular-nums text-foreground/90 shrink-0">
                            {teamA.score}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <TeamFlag src={teamB?.flagUrl} alt={teamB?.name || 'B'} size="sm" />
                    <span className="text-sm md:text-[15px] font-semibold truncate">{teamB?.name}</span>
                    {teamB?.score && (
                        <span className="text-xs md:text-sm font-semibold tabular-nums text-foreground/90 shrink-0">
                            {teamB.score}
                        </span>
                    )}
                </div>
                <div className="mt-1.5 text-[11px] text-muted-foreground truncate">
                    {match.seriesName ? match.seriesName + (match.venue ? ` · ${match.venue}` : '') : match.venue}
                </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5 text-right w-24 md:w-32">
                {match.matchFormat && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">
                        {match.matchFormat}
                    </span>
                )}
                <span className={`text-[11px] md:text-xs font-medium line-clamp-2 leading-tight ${
                    isLive ? 'text-red-500 dark:text-red-400'
                    : isComplete ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                    {match.status}
                </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
        </Link>
    );
}

function FormatBreakdown({ data }: { data: TeamSchedule }) {
    const rows = useMemo(() => {
        const all = [
            ...data.live.map(m => ({ m, cat: 'upcoming' as const })),
            ...data.upcoming.map(m => ({ m, cat: 'upcoming' as const })),
            ...data.recent.map(m => ({ m, cat: 'recent' as const })),
        ];
        const map = new Map<string, { upcoming: number; recent: number }>();
        for (const { m, cat } of all) {
            const fmt = (m.matchFormat || 'OTHER').toUpperCase();
            if (!map.has(fmt)) map.set(fmt, { upcoming: 0, recent: 0 });
            map.get(fmt)![cat]++;
        }
        return Array.from(map.entries())
            .sort(([a], [b]) => {
                const ai = FMT_ORDER.indexOf(a);
                const bi = FMT_ORDER.indexOf(b);
                if (ai === -1 && bi === -1) return a.localeCompare(b);
                if (ai === -1) return 1;
                if (bi === -1) return -1;
                return ai - bi;
            });
    }, [data]);

    if (rows.length === 0) return null;
    const maxTotal = Math.max(...rows.map(([, v]) => v.upcoming + v.recent));

    return (
        <div className="surface-card rounded-2xl p-4 md:p-5">
            <header className="mb-3">
                <h2 className="font-display text-base tracking-tight">Format breakdown</h2>
            </header>
            <div className="space-y-3">
                {rows.map(([fmt, v]) => {
                    const total = v.upcoming + v.recent;
                    const upcomingPct = total === 0 ? 0 : (v.upcoming / maxTotal) * 100;
                    const recentPct = total === 0 ? 0 : (v.recent / maxTotal) * 100;
                    return (
                        <div key={fmt}>
                            <div className="flex items-baseline justify-between mb-1">
                                <span className="text-xs font-semibold text-foreground">{fmt}</span>
                                <span className="text-[11px] text-muted-foreground tabular-nums">
                                    {v.recent} played · {v.upcoming} upcoming
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden flex">
                                <span
                                    className="bg-emerald-500/70 h-full"
                                    style={{ width: `${recentPct}%` }}
                                    aria-label="Played"
                                />
                                <span
                                    className="bg-amber-500/70 h-full"
                                    style={{ width: `${upcomingPct}%` }}
                                    aria-label="Upcoming"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-emerald-500/70" /> Played
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-amber-500/70" /> Upcoming
                </span>
            </div>
        </div>
    );
}

function OtherTeams({ currentTeamId, teams }: { currentTeamId: string; teams: TeamRankingEntry[] }) {
    const others = teams.filter(t => t.teamId !== currentTeamId);
    if (others.length === 0) return null;
    return (
        <div className="surface-card rounded-2xl p-4 md:p-5">
            <header className="flex items-baseline justify-between mb-3">
                <h2 className="font-display text-base tracking-tight">Other teams</h2>
                <Link
                    href="/rankings?category=teams"
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-0.5"
                >
                    Rankings <ChevronRight className="w-3 h-3" />
                </Link>
            </header>
            <div className="space-y-0.5">
                {others.slice(0, 10).map(t => {
                    const href = buildTeamHref(t.teamId, t.teamName);
                    if (!href) return null;
                    return (
                        <Link
                            key={t.teamId}
                            href={href}
                            className="group flex items-center gap-3 px-2 py-1.5 -mx-2 rounded-lg hover:bg-muted/60 transition-colors"
                        >
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground tabular-nums w-6 text-right">
                                #{t.rank}
                            </span>
                            <TeamFlag src={t.imageUrl} alt={t.teamName} size="sm" />
                            <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                {t.teamName}
                            </span>
                            <span className="text-[11px] text-muted-foreground tabular-nums">{t.rating}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

function PageSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8">
            <div className="space-y-8">
                <div className="surface-card rounded-2xl overflow-hidden">
                    <div className="skeleton h-9" />
                    <div className="p-5 space-y-3">
                        <div className="skeleton h-8 w-2/3" />
                        <div className="skeleton h-4 w-1/2" />
                    </div>
                </div>
                {[0, 1].map(i => (
                    <div key={i}>
                        <div className="skeleton h-6 w-40 mb-3" />
                        <div className="surface-card rounded-2xl divide-y divide-border/50">
                            {[0, 1, 2, 3].map(k => (
                                <div key={k} className="p-4 flex items-center gap-3">
                                    <div className="skeleton h-8 w-14" />
                                    <div className="flex-1 space-y-2">
                                        <div className="skeleton h-4 w-32" />
                                        <div className="skeleton h-4 w-28" />
                                    </div>
                                    <div className="skeleton h-4 w-16" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <aside className="space-y-4">
                <div className="surface-card rounded-2xl p-5 space-y-3">
                    <div className="skeleton h-5 w-32" />
                    <div className="skeleton h-3 w-full" />
                    <div className="skeleton h-3 w-4/5" />
                    <div className="skeleton h-3 w-3/4" />
                </div>
            </aside>
        </div>
    );
}

function buildCountdown(msRemaining: number): string | null {
    if (msRemaining <= 0) return null;
    const totalMin = Math.floor(msRemaining / 60_000);
    if (totalMin < 60) return `${totalMin}m`;
    const totalHr = Math.floor(totalMin / 60);
    if (totalHr < 24) return `${totalHr}h ${totalMin % 60}m`;
    const days = Math.floor(totalHr / 24);
    return `${days}d ${totalHr % 24}h`;
}

function formatFullTime(ms: number): string {
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}
