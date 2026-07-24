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
import { buildTeamHref, buildMatchHref, deriveMatchFormat, displayMatchFormat } from '@/lib/utils';
import { teamFlagHdFromUrl } from '@/lib/upstream';

const FMT_ORDER = ['TEST', 'ODI', 'T20I', 'T20'];

// Home-screen format chip palette — kept in sync with MatchCard so a badge
// on the team page reads exactly the same as one on the home dashboard.
const FORMAT_BADGE: Record<string, string> = {
    T20: 'bg-purple-500/15 text-purple-600 dark:text-purple-300',
    T20I: 'bg-purple-500/15 text-purple-600 dark:text-purple-300',
    T10: 'bg-teal-500/15 text-teal-600 dark:text-teal-300',
    ODI: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
    TEST: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
    '100': 'bg-pink-500/15 text-pink-600 dark:text-pink-300',
    'List A': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
};

// Unified flag treatment — same tight rectangle and 2px border radius as
// MatchCard uses (`rounded-[2px]`), so flags read the same across the app.
// Every size below preserves the upstream's 4:3 flag aspect.
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

    // Countdown seconds for the "Next up" hero.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(t);
    }, []);

    // Format filter — Test / ODI / T20I / All. Kept as a client-side pass so
    // the sidebar counts stay accurate for the full dataset.
    const [formatFilter, setFormatFilter] = useState<'all' | string>('all');
    const availableFormats = useMemo(() => {
        if (!data) return [];
        const set = new Set<string>();
        for (const m of [...data.live, ...data.upcoming, ...data.recent]) {
            const f = (m.matchFormat || '').toUpperCase();
            if (f && f !== 'OTHER') set.add(f);
        }
        // Normalize T20/T20I into one control since they display the same.
        const arr = Array.from(set);
        const hasT20 = arr.includes('T20') || arr.includes('T20I');
        return [
            ...(arr.includes('TEST') ? ['TEST'] : []),
            ...(arr.includes('ODI') ? ['ODI'] : []),
            ...(hasT20 ? ['T20I'] : []),
            ...arr.filter(f => !['TEST', 'ODI', 'T20', 'T20I'].includes(f)),
        ];
    }, [data]);

    const filterMatch = (m: LiveMatch) => {
        if (formatFilter === 'all') return true;
        const f = (m.matchFormat || '').toUpperCase();
        if (formatFilter === 'T20I') return f === 'T20' || f === 'T20I';
        return f === formatFilter;
    };

    const filteredData = useMemo(() => {
        if (!data) return null;
        if (formatFilter === 'all') return data;
        return {
            ...data,
            live: data.live.filter(filterMatch),
            upcoming: data.upcoming.filter(filterMatch),
            recent: data.recent.filter(filterMatch),
        };
    }, [data, formatFilter]);

    // Next match reflects the CURRENTLY FILTERED dataset so the hero shows
    // "next TEST" when the Test chip is active, "next ODI" for ODI, etc.
    // Never hidden by a filter.
    const nextMatch = filteredData?.live[0] || filteredData?.upcoming[0];

    // Head-to-head vs the Next Up opponent, derived from the FULL recent
    // history (independent of format filter so H2H remains meaningful).
    const h2h = useMemo(() => {
        if (!data || !nextMatch) return null;
        const myNameLc = readableName.toLowerCase();
        const opponent = nextMatch.teams.find(t => (t.name || '').toLowerCase() !== myNameLc);
        if (!opponent) return null;
        const opponentLc = (opponent.name || '').toLowerCase();
        const past = data.recent.filter(m => m.teams.some(t => (t.name || '').toLowerCase() === opponentLc));
        if (past.length === 0) return { opponent: opponent.name || '', opponentFlag: opponent.flagUrl, results: [] as ('W' | 'L' | 'D')[] };
        const results = past.slice(0, 5).map(m => {
            const s = (m.status || '').toLowerCase();
            if (s.includes('draw') || s.includes('tied') || s.includes('no result') || s.includes('abandoned')) return 'D' as const;
            return s.includes(`${myNameLc} won`) ? 'W' as const : 'L' as const;
        });
        return { opponent: opponent.name || '', opponentFlag: opponent.flagUrl, results };
    }, [data, nextMatch, readableName]);

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
                            { label: 'Teams', href: '/rankings?category=teams' },
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

                {!loading && !error && data && filteredData && (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8">
                        <div className="min-w-0 space-y-8 md:space-y-10">
                            {nextMatch && <NextUp match={nextMatch} now={now} h2h={h2h} />}
                            {availableFormats.length > 1 && (
                                <FormatFilter
                                    formats={availableFormats}
                                    value={formatFilter}
                                    onChange={setFormatFilter}
                                    counts={{
                                        all: data.live.length + data.upcoming.length + data.recent.length,
                                        ...Object.fromEntries(availableFormats.map(f => [
                                            f,
                                            [...data.live, ...data.upcoming, ...data.recent].filter(m => {
                                                const mf = (m.matchFormat || '').toUpperCase();
                                                if (f === 'T20I') return mf === 'T20' || mf === 'T20I';
                                                return mf === f;
                                            }).length,
                                        ])),
                                    }}
                                />
                            )}
                            {filteredData.live.length > 0 && <FixtureBlock title="Live" matches={filteredData.live} live />}
                            {/* Next Up already surfaces the very next upcoming
                                match in the featured hero — remove it from the
                                Upcoming block so it doesn't appear twice. */}
                            {filteredData.upcoming.length > (nextMatch && filteredData.live.length === 0 ? 1 : 0) && (
                                <FixtureBlock
                                    title="Upcoming"
                                    matches={
                                        nextMatch && filteredData.live.length === 0
                                            ? filteredData.upcoming.slice(1)
                                            : filteredData.upcoming
                                    }
                                    groupBySeries
                                />
                            )}
                            {filteredData.recent.length > 0 && (
                                <FixtureBlock title="Recent results" matches={filteredData.recent} groupBySeries />
                            )}
                            {filteredData.live.length === 0 && filteredData.upcoming.length === 0 && filteredData.recent.length === 0 && (
                                <div className="surface-card p-10 text-center rounded-2xl">
                                    <p className="font-display text-lg">
                                        {formatFilter === 'all' ? 'No fixtures on the wire' : `No ${formatFilter} fixtures`}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {formatFilter === 'all'
                                            ? 'Check back after the next series announcement.'
                                            : 'Try switching the format filter.'}
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
    // All three pills belong to the same team — style them consistently
    // regardless of rank so #1 and #4 sit together as a set.
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-primary/40 bg-primary/10">
            <span className="text-muted-foreground font-semibold">{label}</span>
            <span className="tabular-nums font-bold text-primary">#{entry.rank}</span>
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

function FormatFilter({
    formats, value, onChange, counts,
}: {
    formats: string[];
    value: 'all' | string;
    onChange: (v: 'all' | string) => void;
    counts: Record<string, number>;
}) {
    const options: Array<{ id: 'all' | string; label: string }> = [
        { id: 'all', label: 'All' },
        ...formats.map(f => ({ id: f as string, label: f })),
    ];
    return (
        <div
            role="tablist"
            aria-label="Filter fixtures by format"
            className="flex items-center gap-1.5 p-1 rounded-xl border border-border/60 bg-card/40 overflow-x-auto"
        >
            {options.map(o => {
                const active = value === o.id;
                const c = counts[o.id] ?? 0;
                return (
                    <button
                        key={o.id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(o.id)}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            active
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                        }`}
                    >
                        <span>{o.label}</span>
                        <span className={`tabular-nums text-[10px] ${active ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`}>
                            {c}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function NextUp({ match, now, h2h }: {
    match: LiveMatch;
    now: number;
    h2h?: { opponent: string; opponentFlag?: string; results: Array<'W' | 'L' | 'D'> } | null;
}) {
    const startMs = match.startDate
        ? match.startDate < 10_000_000_000 ? match.startDate * 1000 : match.startDate
        : undefined;
    const diffMs = startMs ? startMs - now : 0;
    const countdown = startMs ? buildCountdown(diffMs) : null;
    // Countdown becomes the hero's most prominent element only when it's
    // actually urgent (< 24h) — otherwise it's a peer of the datetime line.
    // Splitting it into a "big number" (e.g. `1d 2h`) + a small "starts in"
    // label lets the eye land on the answer, not the ornament.
    const isUrgent = !!startMs && diffMs > 0 && diffMs < 24 * 60 * 60 * 1000;
    const [teamA, teamB] = match.teams;
    const href = buildMatchHref(match.matchId, match.title);
    const format = displayMatchFormat(match.matchFormat) || deriveMatchFormat(match.title, match.seriesName);
    // Break the full datetime string into two lines so the day+date sits
    // above the time. Format is "Sat 25 Jul, 16:30 GMT" — split on the first
    // comma. Falls back to a single line if the format ever changes shape.
    const fullTime = startMs ? formatFullTime(startMs) : null;
    const [dateLine, timeLine] = (() => {
        if (!fullTime) return [null, null] as const;
        const commaIdx = fullTime.indexOf(',');
        if (commaIdx === -1) return [fullTime, null] as const;
        return [fullTime.slice(0, commaIdx).trim(), fullTime.slice(commaIdx + 1).trim()] as const;
    })();
    const wins = h2h?.results.filter(r => r === 'W').length ?? 0;
    const losses = h2h?.results.filter(r => r === 'L').length ?? 0;
    const draws = h2h?.results.filter(r => r === 'D').length ?? 0;
    return (
        <Link
            href={href}
            className="block surface-card rounded-2xl overflow-hidden hover:border-primary/40 transition-colors group"
        >
            {/* Eyebrow — one line: NEXT UP · Series name, format chip pinned
                right. Series moved out of the body meta so the middle stays
                for match-specific info (teams + when + where). */}
            <div className="px-4 md:px-5 py-2.5 border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary shrink-0">
                        Next up
                    </span>
                    {match.seriesName && (
                        <>
                            <span aria-hidden className="text-primary/40 shrink-0">·</span>
                            <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                                {match.seriesName}
                            </span>
                        </>
                    )}
                </div>
                {format && (
                    <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-md tracking-wide ${FORMAT_BADGE[format] ?? 'bg-muted text-muted-foreground'}`}>
                        {format}
                    </span>
                )}
            </div>

            <div className="p-5 md:p-6 space-y-5 md:space-y-6">
                {/* Team block — stacked on both mobile and desktop so the
                    layout stays scannable regardless of team-name length.
                    Same visual DNA as the FixtureRow but scaled up. */}
                <div className="space-y-2.5 md:space-y-3">
                    <div className="flex items-center gap-3 md:gap-4">
                        <TeamFlag src={teamA?.flagUrl} alt={teamA?.name || 'Team A'} size="md" />
                        <span className="flex-1 min-w-0 font-display text-xl md:text-2xl tracking-tight leading-tight truncate">
                            {teamA?.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4">
                        <TeamFlag src={teamB?.flagUrl} alt={teamB?.name || 'Team B'} size="md" />
                        <span className="flex-1 min-w-0 font-display text-xl md:text-2xl tracking-tight leading-tight truncate">
                            {teamB?.name}
                        </span>
                    </div>
                </div>

                {/* When strip — two columns share the same baseline so the
                    countdown ("1d 2h") reads at the same height as the
                    day+time. Countdown gets primary tint when urgent,
                    foreground colour otherwise; the labels above each column
                    keep the pair intentional and legible. */}
                {(countdown || fullTime) && (
                    <div className="flex items-start gap-6 md:gap-10">
                        {countdown && (
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    Starts in
                                </p>
                                <p
                                    className={`mt-1 font-display text-3xl md:text-4xl leading-none tabular-nums ${
                                        isUrgent ? 'text-primary' : 'text-foreground'
                                    }`}
                                >
                                    {countdown}
                                </p>
                            </div>
                        )}
                        {(dateLine || timeLine) && (
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    Starts at
                                </p>
                                <div className="mt-1 font-display text-xl md:text-2xl leading-none text-foreground tabular-nums">
                                    <span>{dateLine}</span>
                                    {timeLine && (
                                        <span className="block text-muted-foreground text-base md:text-lg mt-1">
                                            {timeLine}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Venue — its own row so the icon+text align consistently
                    with the FixtureRow venue treatment elsewhere. */}
                {match.venue && (
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                        <MapPin aria-hidden className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 opacity-70" />
                        <span className="truncate">{match.venue}</span>
                    </div>
                )}
            </div>

            {/* H2H footer — full-width band with its own background tint so
                it reads as a summary, not a random append. Label · dots ·
                W-L split flow left to right with proper breathing room. */}
            {h2h && h2h.results.length > 0 && (
                <div className="px-4 md:px-5 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">
                            Last {h2h.results.length} vs {h2h.opponent}
                        </span>
                        <div className="flex items-center gap-1">
                            {h2h.results.map((r, i) => (
                                <FormDot key={i} result={r} />
                            ))}
                        </div>
                    </div>
                    <span className="text-[11px] md:text-xs font-semibold tabular-nums text-foreground shrink-0">
                        {wins}<span className="text-muted-foreground">W</span>
                        <span aria-hidden className="text-muted-foreground/40 mx-1.5">·</span>
                        {losses}<span className="text-muted-foreground">L</span>
                        {draws > 0 && (
                            <>
                                <span aria-hidden className="text-muted-foreground/40 mx-1.5">·</span>
                                {draws}<span className="text-muted-foreground">D</span>
                            </>
                        )}
                    </span>
                </div>
            )}
        </Link>
    );
}

function groupMatchesBySeries(matches: LiveMatch[]): Array<{ series: string; matches: LiveMatch[]; firstStart: number }> {
    const map = new Map<string, LiveMatch[]>();
    for (const m of matches) {
        const key = (m.seriesName || 'Uncategorised').trim();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(m);
    }
    const groups = Array.from(map.entries()).map(([series, ms]) => {
        const times = ms.map(m => {
            const s = m.startDate;
            return s ? (s < 10_000_000_000 ? s * 1000 : s) : Number.MAX_SAFE_INTEGER;
        }).filter(t => t !== Number.MAX_SAFE_INTEGER);
        return {
            series,
            matches: ms.slice().sort((a, b) => (a.startDate || 0) - (b.startDate || 0)),
            firstStart: times.length ? Math.min(...times) : Number.MAX_SAFE_INTEGER,
        };
    });
    // Sort series groups chronologically by earliest match in the group.
    return groups.sort((a, b) => a.firstStart - b.firstStart);
}

function FixtureBlock({
    title, matches, live, groupBySeries,
}: {
    title: string;
    matches: LiveMatch[];
    live?: boolean;
    groupBySeries?: boolean;
}) {
    if (matches.length === 0) return null;
    // Only group when there's actually more than one series, otherwise the
    // group header just adds a redundant layer of visual chrome.
    const shouldGroup = !!groupBySeries && new Set(matches.map(m => (m.seriesName || '').trim())).size > 1;
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
            {shouldGroup ? (
                <div className="space-y-3 md:space-y-4">
                    {groupMatchesBySeries(matches).map(g => (
                        <SeriesGroup key={g.series} series={g.series} matches={g.matches} />
                    ))}
                </div>
            ) : (
                <div className="surface-card rounded-2xl divide-y divide-border/50 overflow-hidden">
                    {matches.map(m => (
                        <FixtureRow key={m.matchId} match={m} />
                    ))}
                </div>
            )}
        </section>
    );
}

function SeriesGroup({ series, matches }: { series: string; matches: LiveMatch[] }) {
    // Default open — this is a browse surface, users want to see their fixtures.
    const [open, setOpen] = useState(true);

    // Build the format count summary ("3 T20I · 3 ODI") using the same short-
    // format resolution the format chip uses.
    const formatCounts = useMemo(() => {
        const map = new Map<string, number>();
        for (const m of matches) {
            const f = displayMatchFormat(m.matchFormat) || deriveMatchFormat(m.title, m.seriesName) || 'OTHER';
            map.set(f, (map.get(f) || 0) + 1);
        }
        return Array.from(map.entries()).sort((a, b) => {
            const order = ['TEST', 'ODI', 'T20I', 'T20', 'T10', '100', 'List A'];
            const ai = order.indexOf(a[0]);
            const bi = order.indexOf(b[0]);
            if (ai === -1 && bi === -1) return b[1] - a[1];
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
    }, [matches]);

    const dateRange = useMemo(() => {
        const times = matches
            .map(m => (m.startDate ? (m.startDate < 10_000_000_000 ? m.startDate * 1000 : m.startDate) : null))
            .filter((t): t is number => t !== null);
        if (times.length === 0) return null;
        const first = new Date(Math.min(...times));
        const last = new Date(Math.max(...times));
        const short = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
        return first.getTime() === last.getTime() ? short(first) : `${short(first)} – ${short(last)}`;
    }, [matches]);

    return (
        <div className="surface-card rounded-2xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="w-full flex items-center gap-3 px-4 md:px-5 py-3.5 hover:bg-muted/30 transition-colors text-left"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm md:text-[15px] font-semibold text-foreground truncate">
                            {series}
                        </span>
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                            {matches.length} {matches.length === 1 ? 'match' : 'matches'}
                        </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {formatCounts.map(([fmt, count]) => (
                            <span
                                key={fmt}
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md tracking-wide ${
                                    FORMAT_BADGE[fmt] ?? 'bg-muted text-muted-foreground'
                                }`}
                            >
                                <span className="tabular-nums">{count}</span>
                                <span>{fmt}</span>
                            </span>
                        ))}
                        {dateRange && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground tabular-nums">
                                {dateRange}
                            </span>
                        )}
                    </div>
                </div>
                <ChevronRight
                    className={`w-4 h-4 text-muted-foreground/60 shrink-0 transition-transform duration-200 ${
                        open ? 'rotate-90' : ''
                    }`}
                />
            </button>
            {open && (
                <div className="divide-y divide-border/50 border-t border-border/50">
                    {matches.map(m => (
                        <FixtureRow key={m.matchId} match={m} />
                    ))}
                </div>
            )}
        </div>
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
    // Match the resolution MatchCard uses so a T20I on the home dashboard
    // reads identically here — colored chip, same short label.
    const format = displayMatchFormat(match.matchFormat) || deriveMatchFormat(match.title, match.seriesName);
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
                {/* Series line: truncate on tablet+ (desktop had a status
                    column, no wrap needed), wrap to 2 lines on mobile so
                    long tour names stay legible. */}
                <div className="mt-1.5 text-[11px] text-muted-foreground md:truncate break-words">
                    {match.seriesName ? match.seriesName + (match.venue ? ` · ${match.venue}` : '') : match.venue}
                </div>
                {/* Mobile-only status line — desktop shows it in the right
                    column. Allow wrap so "Match starts at {date}, {time} GMT"
                    is fully visible on narrow viewports (iPhone SE 375px is
                    the tightest common width). No font shrink. */}
                <div className={`md:hidden mt-1 text-[11px] font-medium leading-tight break-words ${
                    isLive ? 'text-red-500 dark:text-red-400'
                    : isComplete ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                    {match.status}
                </div>
            </div>
            {/* Right column: on tablet+ show format + long status; on mobile
                only the format chip stays and status appears inline below the
                series line so the row keeps its density without wrapping. */}
            <div className="hidden md:flex shrink-0 flex-col items-end gap-1.5 text-right w-28 md:w-32">
                {format && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md tracking-wide ${FORMAT_BADGE[format] ?? 'bg-muted text-muted-foreground'}`}>
                        {format}
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
            <div className="md:hidden shrink-0 self-start">
                {format && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md tracking-wide ${FORMAT_BADGE[format] ?? 'bg-muted text-muted-foreground'}`}>
                        {format}
                    </span>
                )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors self-center" />
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
