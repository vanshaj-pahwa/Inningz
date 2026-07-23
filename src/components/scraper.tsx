
'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { loadMoreCommentary as loadMoreCommentaryAction, getPlayerProfile, getPlayerHighlights, getMatchSquads, getInningsOverData } from '@/app/actions';
import type { ScrapeCricbuzzUrlOutput, Commentary, PlayerProfile, PlayerHighlights } from '@/app/actions';
import { useLiveScore } from '@/lib/data-layer';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { User, ArrowLeft, ChevronLeft, ChevronRight, ChevronUp, Share2, Trophy, MapPin, Clock, Newspaper, Medal } from "lucide-react";
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn, buildVenueHref, buildTeamHref, displayMatchFormat } from '@/lib/utils';
import FullScorecard, { prefetchScorecard } from './full-scorecard';
import PlayerProfileDisplay from './player-profile';
import AnimatedScore from './animated-score';
import RainOverlay from './rain-overlay';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import MatchSquadsDisplay from './match-squads';
import { ThemeToggle } from './theme-toggle';

import WinProbability from './win-probability';
import MatchStickyBar from './match-sticky-bar';
import Breadcrumbs from './breadcrumbs';
import { useRecentHistoryContext } from '@/contexts/recent-history-context';
import { useSwipe } from '@/hooks/use-swipe';
import { ShareButton, StatShareDialog } from './share-cards';
import BatterBreakdown from './batter-breakdown';
import HeroMomentum, { type OverPoint } from './hero-momentum';

// Module-scoped cache so the hero runs-per-over sparkline survives page
// unmount/remount (navigating away from the match page and back). Without
// it the sparkline flashes skeleton on return even though we've fetched it
// this session.
const heroOversCache = new Map<string, OverPoint[]>();

// Minimal top-of-page chrome shown around the "match unavailable" and
// "upcoming" empty states. Without this the user lands on a bare centered
// card with only the mobile bottom nav, which reads as a broken page.
function StrandedPage({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-20 border-b border-border/40 bg-background/85 backdrop-blur">
                <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Back to home"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Home</span>
                    </Link>
                    <Link href="/" className="font-display text-base tracking-tight">
                        Inningz
                    </Link>
                    <div className="w-12" />
                </div>
            </header>
            <div className="flex-1 max-w-md mx-auto w-full px-4 py-10 flex flex-col items-center justify-center text-center">
                {children}
            </div>
        </div>
    );
}
import { getMatchFlags, rememberMatchFlags, pickVibrant, teamColorFor, type StoredTeam } from '@/lib/team-flags';
import { VirtualCommentaryList } from './virtual-commentary-list';
import PointsTableDisplay from './points-table';
import dynamic from 'next/dynamic';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { MatchPageSkeleton, PlayerProfileSkeleton, HighlightsSkeleton, GraphsSkeleton } from './match-skeletons';

// Heavy, tab-gated components (hls.js / recharts + gsap) loaded as async chunks so they
// stay out of the initial match-page bundle.
const LiveStreamTab = dynamic(() => import('./live-stream-tab'), { ssr: false });
const MatchGraphs = dynamic(() => import('./match-graphs'), {
    ssr: false,
    loading: () => <GraphsSkeleton />,
});
import { CommandPaletteTrigger } from './command-palette';

type LastEventType = {
    text: string;
    key: number;
    variant: 'default' | 'destructive' | 'four' | 'six';
};

type View = 'live' | 'scorecard' | 'squads' | 'graphs' | 'table';

const VIEW_LABELS: Record<View, string> = {
    live: 'Live',
    scorecard: 'Scorecard',
    squads: 'Squads',
    graphs: 'Report',
    table: 'Table',
};

function computeOverRuns(overSummary: string | undefined, apiOverRuns: number | undefined): number | undefined {
    // 1. Prefer the authoritative API value when present.
    if (apiOverRuns !== undefined && apiOverRuns !== null) return apiOverRuns;
    if (!overSummary) return undefined;

    // 2. Fallback: sum ball tokens from the summary string (handles wides/no-balls).
    const ballsStr = overSummary.replace(/\(\d+\s*runs?\)/i, '').trim();
    let runs = 0;
    let hasValidBalls = false;
    for (const ball of ballsStr.split(/\s+/)) {
        const b = ball.trim();
        if (!b || b.includes('(') || b.includes(')') || b.toLowerCase() === 'runs' || b.toLowerCase() === 'run') continue;
        hasValidBalls = true;
        if (b === 'W') continue;
        if (b === '.' || b === '0') continue;
        const num = parseInt(b, 10);
        if (!isNaN(num)) runs += num;
        else if (b.toLowerCase().includes('wd') || b.toLowerCase().includes('wide')) runs += 1;
        else if (b.toLowerCase().includes('nb') || b.toLowerCase().includes('noball')) runs += 1;
        else if (b.toLowerCase().includes('lb') || b.toLowerCase().includes('legbye')) runs += 1;
        else if (b.toLowerCase().includes('b') && b.length <= 2) runs += 1;
    }
    if (hasValidBalls) return runs;

    // 3. Last resort: parse any embedded "(X runs)" tail.
    const embedded = overSummary.match(/\((\d+)\s*runs?\)/i);
    return embedded ? parseInt(embedded[1], 10) : undefined;
}

// Render a match title with the two team names wrapped in `<Link>` when their
// names resolve to a known cricbuzz teamId. Splits on " vs " and takes the
// short-code suffix before the first comma as the team-B boundary. Falls back
// to plain text if the shape doesn't match.
function TitleWithTeamLinks({ title }: { title?: string }) {
    if (!title) return null;
    const vsMatch = title.match(/^(.+?)\s+vs\s+(.+?)(,.+)?$/i);
    if (!vsMatch) return <>{title}</>;
    const [, teamA, teamB, rest] = vsMatch;
    const hrefA = buildTeamHref(undefined, teamA);
    const hrefB = buildTeamHref(undefined, teamB);
    const teamStyle = 'hover:text-primary transition-colors underline-offset-2 hover:underline';
    return (
        <>
            {hrefA ? (
                <Link href={hrefA} className={teamStyle}>{teamA}</Link>
            ) : (
                <>{teamA}</>
            )}
            <span className="text-muted-foreground/60"> vs </span>
            {hrefB ? (
                <Link href={hrefB} className={teamStyle}>{teamB}</Link>
            ) : (
                <>{teamB}</>
            )}
            {rest || ''}
        </>
    );
}

function isLive(status: string): boolean {
    const s = status.toLowerCase();
    return s.includes('live') || s.includes('need') || s.includes('session') ||
        s.includes('innings') || s.includes('lead') || s.includes('rain') ||
        s.includes('weather') || s.includes('delay') || s.includes('stops play') ||
        (!s.includes('won') && !s.includes('complete') && !s.includes('drawn') && !s.includes('tied'));
}

// Match a score's short code (e.g. "ENG", "WI", "INDU19") to a stored full team
// name ("England", "West Indies", "India U19") so we can show the batting side's
// flag. Handles single-word names by prefix and multi-word names by initials.
// Age-group suffixes (U19/U16 etc.) are stripped from both sides so "INDU19"
// still finds "India U19".
function flagForShortCode(shortCode: string | undefined, teams: StoredTeam[] | null): string | null {
    if (!shortCode || !teams) return null;
    const stripAgeGroup = (v: string) => v.replace(/u\d+/g, '').replace(/\s+a\b/g, '');
    const raw = shortCode.toLowerCase();
    const s = stripAgeGroup(raw).replace(/[^a-z]/g, '');
    if (!s) return null;
    for (const t of teams) {
        const name = stripAgeGroup(t.name.toLowerCase()).trim();
        const noSpace = name.replace(/[^a-z]/g, '');
        const words = name.split(/\s+/).filter(Boolean);
        const initials = words.map((w) => w[0] || '').join('');
        if (noSpace.startsWith(s) || initials === s || initials.startsWith(s)) return t.flagUrl;
        // Common multi-word abbreviation pattern: first N chars of word 1
        // followed by the initial of each remaining word. Covers codes like
        // "WEF" (Welsh Fire), "SOUW" (Southern Brave Women), "WELW" (Welsh
        // Fire Women), "CSK" (Chennai Super Kings), and similar shortening
        // conventions the upstream feed uses.
        if (words.length > 0) {
            const trailingInitials = words.slice(1).map((w) => w[0] || '').join('');
            const maxN = Math.min(4, words[0].length);
            for (let n = 1; n <= maxN; n++) {
                if (words[0].slice(0, n) + trailingInitials === s) return t.flagUrl;
            }
        }
    }
    return null;
}

export default function ScoreDisplay({ matchId }: { matchId: string }) {
    const router = useRouter();
    const { addMatch, addPlayer } = useRecentHistoryContext();
    const hasTrackedMatch = useRef(false);
    const [lastEvent, setLastEvent] = useState<LastEventType | null>(null);
    const previousData = useRef<ScrapeCricbuzzUrlOutput | null>(null);
    const [view, setView] = useState<View>('live');
    const [extraCommentary, setExtraCommentary] = useState<Commentary[]>([]);
    const lastTimestampRef = useRef<number | null>(null);
    const [lastTimestamp, setLastTimestamp] = useState<number | null>(null);
    const [statShareOpen, setStatShareOpen] = useState(false);
    const [statShareData, setStatShareData] = useState<{ headline?: string; text: string; snippetType?: string } | null>(null);
    // Ambient rain animation — plays for a few seconds when we first see a
    // rain-related status, then goes away. Ref keeps it a one-shot per view.
    const [rainActive, setRainActive] = useState(false);
    const rainShownRef = useRef(false);
    // Team flags stashed when the user opened this match from a list card; the
    // live feed itself doesn't carry the batting side's flag.
    const [storedFlags, setStoredFlags] = useState<StoredTeam[] | null>(null);
    useEffect(() => {
        const stored = getMatchFlags(matchId);
        if (stored && stored.length) { setStoredFlags(stored); return; }
        // Direct navigation (no card click) has no stored flags; pull them from
        // the squads endpoint and cache for next time.
        let cancelled = false;
        getMatchSquads(matchId)
            .then((res) => {
                if (cancelled || !res.success || !res.squads) return;
                const teams = [res.squads.team1, res.squads.team2]
                    .filter((t): t is typeof t & { teamFlagUrl: string } => !!t.teamName && !!t.teamFlagUrl)
                    .map((t) => ({ name: t.teamName, flagUrl: t.teamFlagUrl }));
                if (teams.length) {
                    setStoredFlags(teams);
                    rememberMatchFlags(matchId, teams);
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [matchId]);
    // Colour the hero score with the batting side's flag colours.
    const [scoreColors, setScoreColors] = useState<string[] | null>(null);
    const [overSheetOpen, setOverSheetOpen] = useState(false);
    const [overSheetData, setOverSheetData] = useState<Commentary | null>(null);
    const [keyStatsOpen, setKeyStatsOpen] = useState(false);
    const [loadTimedOut, setLoadTimedOut] = useState(false);
    const [graphsInitialTab, setGraphsInitialTab] = useState<string | undefined>(undefined);

    // SSE-powered live score with polling fallback
    const {
        data: liveData,
        loading: liveLoading,
        error: liveError,
        connectionStatus,
        refresh
    } = useLiveScore<ScrapeCricbuzzUrlOutput>(matchId, {
        enabled: !!matchId,
        onUpdate: (newData) => {
            const scoreData = newData as ScrapeCricbuzzUrlOutput;
            if (scoreData?.oldestCommentaryTimestamp && lastTimestampRef.current === null) {
                lastTimestampRef.current = scoreData.oldestCommentaryTimestamp;
                setLastTimestamp(scoreData.oldestCommentaryTimestamp);
            }
        }
    });

    // Merge live data with extra loaded commentary
    const data = useMemo(() => {
        if (!liveData) return null;
        if (extraCommentary.length === 0) return liveData;
        return {
            ...liveData,
            commentary: [...liveData.commentary, ...extraCommentary],
        };
    }, [liveData, extraCommentary]);

    // Invalid/dead matches can load forever without erroring. Stop the skeleton after a
    // grace period and show a "Match unavailable" state instead.
    useEffect(() => {
        if (liveData || liveError) { setLoadTimedOut(false); return; }
        const t = setTimeout(() => setLoadTimedOut(true), 12000);
        return () => clearTimeout(t);
    }, [liveData, liveError, matchId]);

    // First time we see the status explicitly mention rain / wet conditions,
    // play the rain overlay once. Ref keeps it from re-triggering. Kept tight
    // on purpose — "abandoned" / "delay" / "stops play" can mean bad light or
    // other non-weather causes, so we only fire on unambiguous rain signals.
    useEffect(() => {
        const status = (data?.status || '').toLowerCase();
        const isRainy = /\brain\b|wet outfield|drizzl|shower|thunder|storm|weather/i.test(status);
        if (isRainy && !rainShownRef.current) {
            rainShownRef.current = true;
            setRainActive(true);
        }
    }, [data?.status]);

    // The batting side's flag (from stored list-card flags) and its accent colours,
    // used to badge and colour the hero score. Declared here, above any early
    // return, so hook order stays stable.
    const battingFlagUrl = flagForShortCode(data?.score?.split(' ')[0], storedFlags);
    useEffect(() => {
        if (!battingFlagUrl) { setScoreColors(null); return; }
        let cancelled = false;
        fetch(`/api/flag-colors?url=${encodeURIComponent(battingFlagUrl)}`)
            .then((r) => r.json())
            .then((d: { colors?: string[] }) => {
                if (!cancelled && d.colors?.length) setScoreColors(d.colors);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [battingFlagUrl]);
    // Team identity colour: the jersey-colour map first (India blue, England red),
    // then a vivid flag colour for anyone not mapped (e.g. league sides).
    const heroAccent = teamColorFor(data?.score?.split(' ')[0], storedFlags?.map((t) => t.name) ?? null) ?? pickVibrant(scoreColors);

    // Runs-per-over for the current innings, owned here so the same data feeds
    // both the hero momentum sparkline and the share card (loaded on match open,
    // so it's ready by the time the user shares). null = still loading.
    const heroInningsId = data?.currentInningsId || 1;
    const heroOversKey = `${matchId}:${heroInningsId}`;
    const [heroOvers, setHeroOvers] = useState<OverPoint[] | null>(() => heroOversCache.get(heroOversKey) ?? null);
    useEffect(() => {
        let cancelled = false;
        getInningsOverData(matchId, heroInningsId)
            .then((res) => {
                if (cancelled) return;
                if (res.success && res.data?.overs?.length) {
                    const list = res.data.overs;
                    const mapped = list.map((o, i) => ({
                        overNumber: o.overNumber,
                        runs: o.runs,
                        wickets: o.wickets,
                        wicketFell: i > 0 ? o.wickets > list[i - 1].wickets : o.wickets > 0,
                    }));
                    heroOversCache.set(heroOversKey, mapped);
                    setHeroOvers(mapped);
                } else {
                    setHeroOvers([]);
                }
            })
            .catch(() => { if (!cancelled) setHeroOvers([]); });
        return () => { cancelled = true; };
    }, [matchId, heroInningsId, heroOversKey, data?.score]);

    // Dynamic views based on data availability
    const views: View[] = useMemo(() => {
        const baseViews: View[] = ['live', 'scorecard', 'graphs', 'squads'];
        if (data?.hasPointsTable && data?.seriesId) {
            baseViews.push('table');
        }
        return baseViews;
    }, [data?.hasPointsTable, data?.seriesId]);
    const currentViewIndex = views.indexOf(view);

    // Memoize stream data to prevent re-fetching on every live score update
    const streamTitle = useMemo(() => data?.title || '', [data?.title]);
    const streamTeams = useMemo(() => {
        const teams: { name: string }[] = [];
        if (data?.previousInnings) {
            data.previousInnings.forEach(i => teams.push({ name: i.teamName }));
        }
        if (data?.score && data.score !== 'N/A') {
            teams.push({ name: data.score.split(' ')[0] });
        }
        return teams;
        // Only recompute when title changes (not on every score update)
    }, [data?.title]); // eslint-disable-line react-hooks/exhaustive-deps

    // Swipe between tabs
    const { swiping, swipeDirection, swipeProgress } = useSwipe({
        onSwipeLeft: () => {
            if (currentViewIndex < views.length - 1) {
                setView(views[currentViewIndex + 1]);
            }
        },
        onSwipeRight: () => {
            if (currentViewIndex > 0) {
                setView(views[currentViewIndex - 1]);
            }
        },
        threshold: 80,
        enabled: view !== 'graphs',
    });

    // Keyboard shortcuts: 1-5 jump to tabs. Arrow keys are already handled by useSwipe.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target as HTMLElement | null;
            if (target) {
                const tag = target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
            }
            if (document.querySelector('[role="dialog"][data-state="open"]')) return;

            if (e.key >= '1' && e.key <= '9') {
                const idx = parseInt(e.key, 10) - 1;
                if (idx >= 0 && idx < views.length) {
                    setView(views[idx]);
                    e.preventDefault();
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [views]);

    const [loadingMore, setLoadingMore] = useState(false);
    const [newCommentaryStartIndex, setNewCommentaryStartIndex] = useState<number | null>(null);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [highlightsData, setHighlightsData] = useState<PlayerHighlights | null>(null);
    const [highlightsLoading, setHighlightsLoading] = useState(false);
    const [highlightsUrl, setHighlightsUrl] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
    const scoreHeroRef = useRef<HTMLDivElement>(null);

    const loadMoreCommentary = async () => {
        const currentTimestamp = lastTimestampRef.current;
        if (!matchId || !currentTimestamp || loadingMore || currentTimestamp === 0) return;

        setLoadingMore(true);
        try {
            const inningsId = data?.currentInningsId || 1;
            const result = await loadMoreCommentaryAction(matchId, currentTimestamp - 1, inningsId);

            if (result.success && result.commentary && result.commentary.length > 0) {
                const extractKey = (c: Commentary) => {
                    if (c.type === 'live' && c.text.includes(':')) return c.text.split(':')[0].trim();
                    return c.text;
                };

                const currentCommentary = data?.commentary || [];
                const existingKeys = new Set([
                    ...currentCommentary.map(extractKey),
                    ...extraCommentary.map(extractKey)
                ]);
                const newCommentary = result.commentary.filter(c => !existingKeys.has(extractKey(c)));

                if (result.timestamp && result.timestamp < (lastTimestampRef.current || Infinity)) {
                    lastTimestampRef.current = result.timestamp;
                    setLastTimestamp(result.timestamp);
                }

                if (newCommentary.length === 0) return;

                const currentCommentaryLength = data?.commentary.length || 0;
                setNewCommentaryStartIndex(currentCommentaryLength);

                setExtraCommentary(prev => [...prev, ...newCommentary]);
            } else if (result.success && result.commentary && result.commentary.length === 0) {
                // No more commentary available
                lastTimestampRef.current = 0;
                setLastTimestamp(0);
            } else if (!result.success) {
                // API error - stop trying to load more
                console.error('[Client] Load more commentary failed:', result.error);
                lastTimestampRef.current = 0;
                setLastTimestamp(0);
            }
        } catch (e) {
            console.error('[Client] Failed to load more commentary:', e);
            // Stop infinite loading on exception
            lastTimestampRef.current = 0;
            setLastTimestamp(0);
        } finally {
            setLoadingMore(false);
        }
    };

    // Update browser tab title with live score
    useEffect(() => {
        if (!data) return;
        const score = data.score && data.score !== 'N/A' ? data.score : '';
        if (score) {
            document.title = `${score} | Inningz`;
        } else if (data.title) {
            document.title = `${data.title} | Inningz`;
        }
        return () => { document.title = 'Inningz'; };
    }, [data?.score, data?.title]);

    // Track match in recent history — keep the full title (e.g. "England vs
    // India, 1st T20I") so the chip actually tells the user which match it was.
    useEffect(() => {
        if (data && !hasTrackedMatch.current) {
            const fullTitle = (data.title || 'Match').trim();
            addMatch(matchId, fullTitle, data.seriesName || undefined);
            hasTrackedMatch.current = true;
        }
    }, [data, matchId, addMatch]);

    // Prefetch the scorecard the moment we have a matchId so switching to the
    // Scorecard tab is instant. Cheap: cached by matchId, in-flight dedupe.
    useEffect(() => {
        if (matchId) prefetchScorecard(matchId);
    }, [matchId]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!selectedProfileId) return;
            setProfileLoading(true);
            const result = await getPlayerProfile(selectedProfileId, selectedPlayerName || undefined);
            if (result.success && result.data) setSelectedProfile(result.data);
            setProfileLoading(false);
        };
        fetchProfile();
    }, [selectedProfileId, selectedPlayerName]);

    useEffect(() => {
        if (!data?.matchStartTimestamp) return;
        const updateCountdown = () => {
            const now = Date.now();
            const diff = data!.matchStartTimestamp! - now;
            if (diff <= 0) { setTimeLeft(null); return; }
            setTimeLeft({
                hours: Math.floor(diff / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000),
            });
        };
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [data?.matchStartTimestamp]);

    const parseScore = (score: string): { runs: number, wickets: number } | null => {
        if (!score || !score.includes('/')) return null;
        const parts = score.split(' ')[1]?.split('/');
        if (!parts || parts.length < 2) return null;
        const runs = parseInt(parts[0], 10);
        const wickets = parseInt(parts[1], 10);
        if (isNaN(runs) || isNaN(wickets)) return null;
        return { runs, wickets };
    }

    const parseOvers = (score: string): number | null => {
        if (!score || !score.includes('(')) return null;
        const oversMatch = score.match(/\(([^)]+)\)/);
        if (!oversMatch || !oversMatch[1]) return null;
        const overs = parseFloat(oversMatch[1]);
        if (isNaN(overs)) return null;
        return overs;
    }

    useEffect(() => {
        if (liveData && previousData.current) {
            const currentScore = parseScore(liveData.score);
            const prevScore = parseScore(previousData.current.score);
            const currentOvers = parseOvers(liveData.score);
            const prevOvers = parseOvers(previousData.current.score);
            const isLive = !liveData.status.toLowerCase().includes('complete') && !liveData.status.toLowerCase().includes('won');

            let eventToShow: Omit<LastEventType, 'key'> | null = null;
            if (currentScore && prevScore && isLive) {
                const runDiff = currentScore.runs - prevScore.runs;
                const wicketDiff = currentScore.wickets - prevScore.wickets;
                const oversChanged = currentOvers !== null && prevOvers !== null && currentOvers > prevOvers;

                if (wicketDiff > 0) {
                    eventToShow = { text: 'W', variant: 'destructive' };
                    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                        navigator.vibrate([120, 60, 120]);
                    }
                }
                else if (runDiff === 6) {
                    eventToShow = { text: '6', variant: 'six' };
                    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                        navigator.vibrate(40);
                    }
                }
                else if (runDiff === 4) {
                    eventToShow = { text: '4', variant: 'four' };
                    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                        navigator.vibrate(25);
                    }
                }
                else if (runDiff > 0 && runDiff < 4) eventToShow = { text: `+${runDiff}`, variant: 'default' };
                else if (runDiff === 0 && wicketDiff === 0 && oversChanged) eventToShow = { text: 'DOT', variant: 'default' };
            }
            if (eventToShow) setLastEvent({ ...eventToShow, key: Date.now() });
        }
        if (liveData) previousData.current = liveData;
    }, [liveData]);


    const matchStartMs = data?.matchStartTimestamp
        ? (data.matchStartTimestamp < 10_000_000_000 ? data.matchStartTimestamp * 1000 : data.matchStartTimestamp)
        : null;
    const isUpcoming = !!matchStartMs && matchStartMs > Date.now();
    const hasNoScore = data?.status === 'Match data not available' || data?.score === 'Score not available';

    // Retry that also resets our own "loading timed out" flag so the skeleton
    // reappears while the poll is in-flight. Without the reset, clicking "Try
    // again" was a no-op — the timeout stayed true and the same error card
    // stayed on screen for the whole retry.
    const handleRetry = () => {
        setLoadTimedOut(false);
        refresh();
    };

    if (isUpcoming && hasNoScore) {
        const startAt = new Intl.DateTimeFormat(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            hour12: false, timeZoneName: 'short',
        }).format(new Date(matchStartMs!));
        return (
            <StrandedPage>
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                    <Clock className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-display mb-1.5">{data?.title || 'Upcoming match'}</h2>
                <p className="text-sm text-muted-foreground mb-1 max-w-xs">
                    Match starts at {startAt}
                </p>
                {data?.venue && (
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-5">
                        <MapPin className="w-3 h-3" /> {data.venue}
                    </p>
                )}
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleRetry} className="rounded-xl">Refresh</Button>
                    <Button onClick={() => router.push('/')} className="rounded-xl">Back to Home</Button>
                </div>
            </StrandedPage>
        )
    }

    if ((hasNoScore && !isUpcoming) || ((liveError || loadTimedOut) && !data)) {
        return (
            <StrandedPage>
                <div className="p-4 rounded-full bg-muted mb-4">
                    <Trophy className="w-7 h-7 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-display mb-1.5">Match unavailable</h2>
                <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                    We couldn&apos;t load this match. It may have ended or the link is no longer valid.
                </p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleRetry} className="rounded-xl">Try again</Button>
                    <Button onClick={() => router.push('/')} className="rounded-xl">Back to Home</Button>
                </div>
            </StrandedPage>
        )
    }

    if (!data && liveLoading) {
        return <MatchPageSkeleton />;
    }

    // Helper function to highlight "THATS OUT!!" in any commentary text
    const formatCommentaryHtml = (html: string) => {
        let result = html;

        // "THATS OUT!!" / "THAT'S OUT!!" in red
        result = result.replace(
            /(that'?s\s*out!*)/gi,
            '<span class="font-bold text-red-500">$1</span>'
        );

        // Highlight "out" keyword (dismissals) - but not inside "THATS OUT" which is already styled
        result = result.replace(
            /(<b[^>]*>)\s*out\s*(<\/b>)/gi,
            '<b class="text-foreground font-semibold"><span class="font-bold text-red-500">out</span></b>'
        );

        // Highlight "FOUR" and "SIX" keywords
        result = result.replace(/\bFOUR\b/g, '<span class="font-bold text-blue-400">FOUR</span>');
        result = result.replace(/\bSIX\b/g, '<span class="font-bold text-purple-400">SIX</span>');
        result = result.replace(/\bno ball\b/gi, '<span class="font-semibold text-amber-400">no ball</span>');

        // Make <b> tags more prominent with foreground color
        result = result.replace(/<b>/gi, '<b class="text-foreground font-semibold">');

        // Style "When:", "Where:", "What to expect:", "Head to head:", "Probable XII:" etc.
        const sectionLabels = 'When|Where|What to expect|Head to head|Probable XII|Injuries\\/Availability|Tactics &amp; Matchups|Preview|Did you know\\??|What they said|Key stats|Form guide|Last 5 matches|Pitch report|Weather';

        // Remove "Team watch" label entirely - the team name header right after it is enough
        result = result.replace(/<b[^>]*>Team watch<\/b>(?:\s*<br\s*\/?>)*/gi, '');

        result = result.replace(
            new RegExp(`(<b[^>]*>)?(${sectionLabels})(:?)</b>(?:\\s*<br\\s*/?>)*`, 'gi'),
            '<span class="block mt-4 mb-0.5 text-foreground font-bold text-[13px]">$2$3</span>'
        );

        // Also catch these labels without <b> tags
        result = result.replace(
            new RegExp(`(?:^|<br\\s*/?>)\\s*(${sectionLabels}):?\\s*(?:<br\\s*/?>)*`, 'gi'),
            '<span class="block mt-4 mb-0.5 text-foreground font-bold text-[13px]">$1:</span> '
        );

        // Style team names as section headers - remove trailing <br> tags too
        result = result.replace(
            /<br\s*\/?>\s*<b[^>]*>((?:Chennai Super Kings|Mumbai Indians|Royal Challengers Bengaluru|Kolkata Knight Riders|Rajasthan Royals|Delhi Capitals|Punjab Kings|Sunrisers Hyderabad|Lucknow Super Giants|Gujarat Titans)[^<]*)<\/b>(?:\s*<br\s*\/?>)*/gi,
            '<span class="block mt-5 mb-1 text-foreground font-bold text-sm border-b border-border/30 pb-1">$1</span>'
        );

        return result;
    };

    const renderCommentaryItem = (comment: Commentary, index: number) => {
        // Filter out the source promotional/branding text
        const cricbuzzPattern = /cricbuzz|comm\s*box|download\s*app|#cricbuzz/i;
        if (cricbuzzPattern.test(comment.text) || cricbuzzPattern.test(comment.headline || '')) {
            return null;
        }

        if (comment.type === 'user' && comment.author) {
            return (
                <div key={index} className="slide-in-left ml-8 md:ml-12 py-2 px-3 my-1 commentary-item">
                    <div className="flex items-center gap-2 mb-1">
                        <User size={12} className="text-muted-foreground" />
                        <span className="text-xs font-semibold text-primary">{comment.author}</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic" dangerouslySetInnerHTML={{ __html: `"${comment.text}"` }} />
                </div>
            );
        }

        if (comment.type === 'snippet' || comment.headline) {
            // Different styles based on snippetType
            const snippetType = comment.snippetType?.toLowerCase() || '';
            let accentColor = 'text-muted-foreground';
            let bgClass = 'bg-card/50 border-border/30';

            if (snippetType.includes('forecast')) {
                accentColor = 'stat-amber';
                bgClass = 'bg-amber-500/5 border-amber-500/20';
            } else if (snippetType.includes('stat') || snippetType.includes('record')) {
                accentColor = 'stat-blue';
                bgClass = 'bg-blue-500/5 border-blue-500/20';
            } else if (snippetType.includes('milestone') || snippetType.includes('achievement')) {
                accentColor = 'stat-green';
                bgClass = 'bg-green-500/5 border-green-500/20';
            } else if (snippetType.includes('alert') || snippetType.includes('breaking')) {
                accentColor = 'stat-red';
                bgClass = 'bg-red-500/5 border-red-500/20';
            } else if (snippetType.includes('trivia') || snippetType.includes('fun')) {
                accentColor = 'stat-purple';
                bgClass = 'bg-purple-500/5 border-purple-500/20';
            }

            const hasStatKeyword = /\bstat\b/i.test(comment.text) || /\bstat\b/i.test(comment.headline || '');

            return (
                <div key={index} className={`slide-in-left py-3 px-4 my-2 rounded-xl border ${bgClass}${hasStatKeyword ? ' relative group' : ''}`}>
                    {hasStatKeyword && (
                        <button
                            onClick={() => {
                                setStatShareData({
                                    headline: comment.headline,
                                    text: comment.text,
                                    snippetType: comment.snippetType,
                                });
                                setStatShareOpen(true);
                            }}
                            className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-muted/60 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity md:block hidden"
                            aria-label="Share stat"
                        >
                            <Share2 className="w-3 h-3 text-muted-foreground" />
                        </button>
                    )}
                    <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold mb-1 ${accentColor}`}>{comment.headline}</p>
                        {hasStatKeyword && (
                            <button
                                onClick={() => {
                                    setStatShareData({
                                        headline: comment.headline,
                                        text: comment.text,
                                        snippetType: comment.snippetType,
                                    });
                                    setStatShareOpen(true);
                                }}
                                className="shrink-0 p-1 rounded-md hover:bg-muted/60 transition-colors md:hidden"
                                aria-label="Share stat"
                            >
                                <Share2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                        )}
                    </div>
                    {comment.text && (
                        <div className="text-xs text-foreground/90 leading-relaxed [&_b]:text-foreground [&_b]:font-semibold" dangerouslySetInnerHTML={{ __html: formatCommentaryHtml(comment.text) }} />
                    )}
                </div>
            );
        }

        if (comment.type === 'stat') {
            const isShortText = comment.text.length < 100;

            // Check if this is a Playing XI announcement
            const playingXIMatch = comment.text.match(/^(.+?)\s*\(Playing XI\)\s*:\s*(.+)$/i);
            if (playingXIMatch) {
                const teamName = playingXIMatch[1].replace(/<[^>]*>/g, '').trim();
                const playersStr = playingXIMatch[2].replace(/<[^>]*>/g, '').trim();
                const players = playersStr.split(',').map(p => p.trim()).filter(Boolean);

                return (
                    <div key={index} className="slide-in-left my-3">
                        <div className="rounded-xl overflow-hidden bg-primary/5 border border-primary/20">
                            {/* Header */}
                            <div className="px-3 py-2 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
                                <span className="text-sm font-bold text-primary">
                                    {teamName}
                                </span>
                                <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wider">
                                    Playing XI
                                </span>
                            </div>

                            {/* Players */}
                            <div className="p-3 flex flex-wrap gap-1.5">
                                {players.map((player, idx) => {
                                    const isBoth = player.includes('(w/c)') || (player.includes('(c)') && player.includes('(w)'));
                                    const isCaptain = isBoth || player.includes('(c)');
                                    const isWicketkeeper = isBoth || player.includes('(w)');
                                    const cleanName = player.replace(/\(w\/c\)|\([cw]+\)/gi, '').trim();

                                    return (
                                        <span
                                            key={idx}
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                                                isCaptain || isWicketkeeper
                                                    ? 'bg-primary/20 text-primary font-medium'
                                                    : 'bg-muted/60 text-muted-foreground'
                                            }`}
                                        >
                                            {cleanName}
                                            {isBoth && <span className="text-[11px] text-primary">(w/c)</span>}
                                            {isCaptain && !isBoth && <span className="text-[11px] text-amber-400">(c)</span>}
                                            {isWicketkeeper && !isBoth && <span className="text-[11px] text-blue-400">(w)</span>}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            }

            // Check if this is an over summary with bullet points
            const isOverSummary = comment.text.includes('Over Summary') || comment.text.includes('over summary');

            if (isOverSummary) {
                // Parse the over summary text and clean HTML
                const cleanText = (text: string) => text.replace(/<br\s*\/?>/gi, '').replace(/<[^>]*>/g, '').trim();

                // Check if it has bullet markers (* or --)
                const hasBullets = /(?:\*|--)\s*/.test(comment.text);

                let lines: string[];
                if (hasBullets) {
                    // Handle bullet formats (* or --)
                    lines = comment.text.split(/(?:\*|--)\s*/).filter(line => line.trim());
                } else {
                    // Handle plain line format (separated by <br> or newlines)
                    lines = comment.text.split(/<br\s*\/?>/gi).map(l => l.trim()).filter(Boolean);
                    // If no <br> found, try splitting by newlines
                    if (lines.length <= 1) {
                        lines = comment.text.split(/\n/).map(l => l.trim()).filter(Boolean);
                    }
                }

                const headerMatch = lines[0]?.match(/Over Summary\s*\(([^)]+)\)/i);
                const header = headerMatch ? headerMatch[1] : null;
                // Remove the header line and any remaining "Over Summary" text from items
                const summaryItems = lines
                    .slice(headerMatch ? 1 : 0)
                    .map(line => cleanText(line))
                    .filter(line => line && !line.toLowerCase().startsWith('over summary'));

                return (
                    <div key={index} className="slide-in-left my-3">
                        <div className="over-summary">
                            {/* Header */}
                            <div className="over-summary-header">
                                <span className="over-summary-title">
                                    Over Summary
                                </span>
                                {header && (
                                    <span className="over-summary-meta">
                                        {header}
                                    </span>
                                )}
                            </div>

                            {/* Summary Items */}
                            <div className="p-2.5 space-y-1.5">
                                {summaryItems.map((item, idx) => (
                                    <div key={idx} className="over-summary-item">
                                        <span className="over-summary-bullet">•</span>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            }

            const hasStatText = /\bstat\b/i.test(comment.text);

            if (hasStatText) {
                return (
                    <div key={index} className="slide-in-left py-3 px-4 my-2 commentary-item relative group">
                        <button
                            onClick={() => {
                                setStatShareData({ text: comment.text, snippetType: 'stat' });
                                setStatShareOpen(true);
                            }}
                            className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-muted/60 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity md:block hidden"
                            aria-label="Share stat"
                        >
                            <Share2 className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <div className="flex items-start justify-between gap-2">
                            <p className={`text-[13px] md:text-sm leading-relaxed text-muted-foreground flex-1 ${isShortText ? 'text-center font-medium' : ''}`} dangerouslySetInnerHTML={{ __html: formatCommentaryHtml(comment.text) }} />
                            <button
                                onClick={() => {
                                    setStatShareData({ text: comment.text, snippetType: 'stat' });
                                    setStatShareOpen(true);
                                }}
                                className="shrink-0 p-1 rounded-md hover:bg-muted/60 transition-colors md:hidden"
                                aria-label="Share stat"
                            >
                                <Share2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                        </div>
                    </div>
                );
            }

            return (
                <div key={index} className={cn(
                    "slide-in-left my-2",
                    isShortText ? 'py-2 px-4' : 'py-3 px-4 commentary-item'
                )}>
                    <div className={cn(
                        'text-[13px] md:text-sm leading-relaxed',
                        isShortText
                            ? 'text-center font-medium text-muted-foreground italic'
                            : 'text-foreground/90 [&_b]:text-foreground [&_b]:font-semibold'
                    )} dangerouslySetInnerHTML={{ __html: formatCommentaryHtml(comment.text) }} />
                </div>
            );
        }

        const over = comment.text.split(':')[0];
        const text = comment.text.substring(comment.text.indexOf(':') + 1);
        const events = comment.event?.split(',').map(e => e.toUpperCase()) || [];

        const getEventDisplay = (event: string) => {
            switch (event) {
                case 'FOUR': return { text: '4', className: 'bg-blue-500 text-white' };
                case 'SIX': return { text: '6', className: 'bg-purple-600 text-white' };
                case 'WICKET': return { text: 'W', className: 'bg-red-600 text-white' };
                case 'FIFTY': return { text: '50', className: 'bg-green-500 text-white text-[10px] px-1' };
                case 'HUNDRED': return { text: '100', className: 'bg-amber-500 text-white text-[10px] px-1' };
                default: return null;
            }
        }

        // Format ball-by-ball text: split "Bowler to Batsman, result" into styled parts
        const formatBallText = (rawText: string) => {
            // Match pattern: "Bowler to Batsman, rest of commentary"
            const introMatch = rawText.match(/^(\s*)([\w\s.''-]+?\s+to\s+[\w\s.''-]+?),\s*/);
            if (introMatch) {
                const intro = introMatch[2];
                const rest = rawText.substring(introMatch[0].length);
                return `<span class="text-foreground font-medium">${intro}</span>, ${rest}`;
            }
            return rawText;
        };

        return (
            <div key={index} className="slide-in-left">
                {comment.overSummary && (
                    <div className="my-3 p-2.5 md:p-4 rounded-2xl over-summary-gradient border border-primary/15">
                        {(() => {
                            const summaryStr = comment.overSummary || '';
                            const ballsStr = summaryStr.replace(/\(\d+\s*runs?\)/i, '').trim();
                            const overRuns = computeOverRuns(summaryStr, comment.overRuns);

                            return (
                                <>
                                    {/* Mobile layout */}
                                    <div className="flex md:hidden items-start gap-2.5 py-1">
                                        <div className="flex-shrink-0 flex flex-col items-center over-badge-bg rounded-xl px-2.5 py-2 min-w-[44px]">
                                            <span className="text-[11px] text-muted-foreground font-medium">Over</span>
                                            <span className="text-xl font-display text-primary">{Math.floor(comment.overNumber || 0)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {ballsStr.split(/\s+/).map((ball, idx) => {
                                                    const ballStr = ball.trim();
                                                    if (!ballStr || ballStr.includes('(') || ballStr.includes(')') || ballStr.toLowerCase() === 'runs' || ballStr.toLowerCase() === 'run') return null;

                                                    let ballClass = "w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center";
                                                    let ballContent = ballStr;

                                                    if (ballStr === '6') ballClass += " bg-purple-600 text-white";
                                                    else if (ballStr === '4') ballClass += " bg-blue-600 text-white";
                                                    else if (ballStr.toLowerCase().includes('wd') || ballStr.toLowerCase().includes('wide')) { ballClass += " bg-amber-500 text-white text-[11px]"; ballContent = 'Wd'; }
                                                    else if (ballStr.toLowerCase().includes('nb') || ballStr.toLowerCase().includes('noball')) { ballClass += " bg-orange-500 text-white text-[11px]"; ballContent = 'Nb'; }
                                                    else if (ballStr === 'W') ballClass += " bg-red-600 text-white";
                                                    else if (ballStr.toLowerCase().includes('lb') || ballStr.toLowerCase().includes('legbye')) { ballClass += " bg-zinc-500 text-white text-[11px]"; ballContent = 'Lb'; }
                                                    else if (ballStr.toLowerCase().includes('b') && ballStr.length <= 2) { ballClass += " bg-zinc-500 text-white text-[11px]"; ballContent = 'B'; }
                                                    else if (ballStr === '0' || ballStr === '.') { ballClass += " bg-muted text-muted-foreground"; ballContent = '\u2022'; }
                                                    else if (/^\d+$/.test(ballStr)) ballClass += " bg-green-600 text-white";
                                                    else ballClass += " bg-muted text-muted-foreground text-[11px]";

                                                    return <span key={idx} className={ballClass}>{ballContent}</span>;
                                                })}
                                                {overRuns !== undefined && (
                                                    <span className="ml-0.5 font-bold text-[11px] text-primary">
                                                        ({overRuns} {overRuns === 1 ? 'run' : 'runs'})
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 self-start bg-muted/80 px-2.5 py-1 rounded-full border border-border/50">
                                                <span className="font-bold text-xs text-primary">{comment.teamShortName}</span>
                                                <span className="font-display text-sm font-bold text-foreground">{comment.teamScore}/{comment.teamWickets}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop layout */}
                                    <div className="hidden md:flex items-center gap-4">
                                        <div className="flex-shrink-0 flex flex-col items-center over-badge-bg rounded-xl px-3 py-2 min-w-[48px]">
                                            <span className="text-[10px] text-muted-foreground font-medium">Over</span>
                                            <span className="text-xl font-display text-primary">{Math.floor(comment.overNumber || 0)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {ballsStr.split(/\s+/).map((ball, idx) => {
                                                    const ballStr = ball.trim();
                                                    if (!ballStr || ballStr.includes('(') || ballStr.includes(')') || ballStr.toLowerCase() === 'runs' || ballStr.toLowerCase() === 'run') return null;

                                                    let ballClass = "w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center";
                                                    let ballContent = ballStr;

                                                    if (ballStr === '6') ballClass += " bg-purple-600 text-white";
                                                    else if (ballStr === '4') ballClass += " bg-blue-600 text-white";
                                                    else if (ballStr.toLowerCase().includes('wd') || ballStr.toLowerCase().includes('wide')) { ballClass += " bg-amber-500 text-white text-[10px]"; ballContent = 'Wd'; }
                                                    else if (ballStr.toLowerCase().includes('nb') || ballStr.toLowerCase().includes('noball')) { ballClass += " bg-orange-500 text-white text-[10px]"; ballContent = 'Nb'; }
                                                    else if (ballStr === 'W') ballClass += " bg-red-600 text-white";
                                                    else if (ballStr.toLowerCase().includes('lb') || ballStr.toLowerCase().includes('legbye')) { ballClass += " bg-zinc-500 text-white text-[10px]"; ballContent = 'Lb'; }
                                                    else if (ballStr.toLowerCase().includes('b') && ballStr.length <= 2) { ballClass += " bg-zinc-500 text-white text-[10px]"; ballContent = 'B'; }
                                                    else if (ballStr === '0' || ballStr === '.') { ballClass += " bg-muted text-muted-foreground"; ballContent = '\u2022'; }
                                                    else if (/^\d+$/.test(ballStr)) ballClass += " bg-green-600 text-white";
                                                    else ballClass += " bg-muted text-muted-foreground text-[10px]";

                                                    return <span key={idx} className={ballClass}>{ballContent}</span>;
                                                })}
                                                {overRuns !== undefined && (
                                                    <span className="ml-1 font-bold text-sm text-primary">
                                                        ({overRuns} {overRuns === 1 ? 'run' : 'runs'})
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-1.5 ml-auto bg-muted/80 px-3 py-1.5 rounded-full border border-border/50">
                                                    <span className="font-bold text-xs text-primary">{comment.teamShortName}</span>
                                                    <span className="font-display text-base text-foreground">{comment.teamScore}/{comment.teamWickets}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                        {/* Batsmen & Bowler */}
                        {(comment.overBatsmen?.length || comment.overBowler) && (
                            <div className="mt-3 pt-3 border-t border-dashed border-border/30">
                                {/* Mobile: stacked */}
                                <div className="flex flex-col gap-1.5 md:hidden">
                                    {comment.overBatsmen?.map((bat, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <span className="text-foreground/80 truncate">{bat.name}</span>
                                            <span className="text-foreground tabular-nums font-semibold shrink-0 ml-2">{bat.score}</span>
                                        </div>
                                    ))}
                                    {comment.overBowler && (
                                        <>
                                            <div className="border-t border-border/40 my-0.5" />
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-foreground/80 truncate">{comment.overBowler.name}</span>
                                                <span className="text-foreground tabular-nums font-semibold shrink-0 ml-2">{comment.overBowler.figures}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {/* Desktop: side by side */}
                                <div className="hidden md:flex">
                                    {comment.overBatsmen && comment.overBatsmen.length > 0 && (
                                        <div className="flex-1 space-y-1">
                                            {comment.overBatsmen.map((bat, i) => (
                                                <div key={i} className="flex items-center justify-between text-sm">
                                                    <span className="text-foreground/80">{bat.name}</span>
                                                    <span className="text-foreground tabular-nums font-semibold">{bat.score}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {comment.overBowler && (
                                        <div className="flex-1 border-l border-dashed border-border/30 pl-4 ml-4">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-foreground/80">{comment.overBowler.name}</span>
                                                <span className="text-foreground tabular-nums font-semibold">{comment.overBowler.figures}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Over Summary & View Overs buttons */}
                        <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-border/30">
                            <button
                                onClick={() => { setOverSheetData(comment); setOverSheetOpen(true); }}
                                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                                Over Summary
                                <ChevronRight className="w-3 h-3" />
                            </button>
                            <button
                                onClick={() => setView('graphs')}
                                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                                View all overs
                                <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )}
                <div className={cn(
                    "flex gap-3 items-start py-2.5 px-1",
                    events.includes('WICKET') && 'border-l-2 border-red-500/60 pl-2',
                    events.includes('FOUR') && !events.includes('WICKET') && 'border-l-2 border-blue-500/40 pl-2',
                    events.includes('SIX') && !events.includes('WICKET') && 'border-l-2 border-purple-500/40 pl-2',
                )}>
                    <div className="flex flex-col items-center flex-shrink-0 w-10 md:w-12 gap-1">
                        <span className="font-mono text-[11px] text-muted-foreground">{over}</span>
                        {events.map((event, i) => {
                            const eventDisplay = getEventDisplay(event);
                            if (!eventDisplay) return null;
                            const isRound = ['FOUR', 'SIX', 'WICKET'].includes(event);
                            return (
                                <span key={i} className={cn(
                                    "flex items-center justify-center font-bold text-xs",
                                    isRound ? 'w-6 h-6 rounded-full' : 'rounded px-1',
                                    eventDisplay.className
                                )}>
                                    {eventDisplay.text}
                                </span>
                            );
                        })}
                    </div>
                    <div className="text-[13px] md:text-sm text-foreground/60 flex-1 leading-relaxed [&_b]:text-foreground [&_b]:font-semibold">
                        <span dangerouslySetInnerHTML={{ __html: formatCommentaryHtml(formatBallText(text)) }} />
                    </div>
                </div>
            </div>
        );
    };

    const getEventBadgeVariant = (variant: LastEventType['variant']) => {
        switch (variant) {
            case 'destructive': return 'destructive';
            case 'four': return 'default';
            case 'six': return 'secondary';
            default: return 'default';
        }
    }

    const getEventBadgeClass = (variant: LastEventType['variant']) => {
        switch (variant) {
            case 'four': return 'bg-blue-600 hover:bg-blue-700 text-white';
            case 'six': return 'bg-purple-600 hover:bg-purple-700 text-white';
            default: return '';
        }
    }

    const handleProfileClick = (profileId: string | undefined, playerName?: string) => {
        if (profileId) {
            setSelectedProfileId(profileId);
            setSelectedPlayerName(playerName || null);
            setSelectedProfile(null);
            // Track player in recent history
            if (playerName) {
                addPlayer(profileId, playerName);
            }
        }
    }

    const handleHighlightsClick = async (url: string) => {
        setHighlightsUrl(url);
        setHighlightsData(null);
        setHighlightsLoading(true);
        try {
            const result = await getPlayerHighlights(url);
            if (result.success && result.data) {
                setHighlightsData(result.data);
            }
        } catch {
            // silently fail
        } finally {
            setHighlightsLoading(false);
        }
    };

    const handleHighlightsDialogClose = (open: boolean) => {
        if (!open) {
            setHighlightsUrl(null);
            setHighlightsData(null);
        }
    };

    const handleDialogOpenChange = (open: boolean) => {
        if (!open) {
            setSelectedProfileId(null);
            setSelectedPlayerName(null);
            setSelectedProfile(null);
        }
    }

    const hasStat = (v?: string) => !!v && v !== '-' && v !== 'N/A';
    const hasKeyStats = !!(data && (
        hasStat(data.partnership) || hasStat(data.lastWicket) || hasStat(data.recentOvers)
    ));

    // A match that hasn't begun has no score and no batters yet: hide the tabs
    // and the empty scoreboard, and just show the Live (preview) content.
    const notStarted = !!data && (!data.score || data.score === 'N/A') && (data.batsmen?.length ?? 0) === 0;
    // A finished match (result, draw, tie, abandonment, or no-result) — used to
    // hide run rates, which only make sense during a live innings.
    const matchOver = !!data && /\bwon\b|complete|drawn|\btied\b|abandon|no result/i.test(data.status);
    const liveInnings = !!data && !notStarted && !matchOver;

    // The Hundred format uses balls, not overs, and RPB (runs per ball) instead
    // of CRR. Both the score suffix and the run-rate labels are format-aware.
    const isHundred = displayMatchFormat(data?.matchFormat) === '100'
        || /the hundred|\bhundred men|\bhundred women/i.test(`${data?.title || ''} ${data?.seriesName || ''}`);
    // Convert a "(X.Y ov)" fragment into "(N balls)" for The Hundred.
    // The upstream data is inconsistent: the current innings ships as raw
    // ball count with a `.0` suffix (15.0 means 15 balls), while previous
    // innings ship in normal 6-ball-over format (16.4 means 16*6+4 balls).
    // Y=0 signals raw balls; Y>0 signals overs-and-balls.
    const toHundredBalls = (label?: string) => label?.replace(/\((\d+)\.(\d+)\s*ov\)/i, (_m, oversWhole, oversPart) => {
        const whole = Number(oversWhole);
        const part = Number(oversPart);
        const balls = part === 0 ? whole : whole * 6 + part;
        return `(${balls} balls)`;
    });
    const heroScoreLabel = data?.score && isHundred ? toHundredBalls(data.score) : data?.score;
    const rateLabelPrimary = isHundred ? 'RPB' : 'CRR';
    const rateLabelRequired = isHundred ? 'RRPB' : 'REQ';

    const keyStatsBody = (
        <div className="divide-y divide-border/50">
            {data?.partnership && data.partnership !== '-' && (
                <div className="p-3 flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                    <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider stat-blue">Partnership</span>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{data.partnership}</p>
                    </div>
                </div>
            )}
            {data?.lastWicket && data.lastWicket !== '-' && (
                <div className="p-3 flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
                    <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider stat-red">Last Wicket</span>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{data.lastWicket}</p>
                    </div>
                </div>
            )}
            {data?.recentOvers && data.recentOvers !== '-' && (
                <div className="p-3 flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                    <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider stat-amber">Recent Overs</span>
                        <p className="text-sm font-mono font-semibold text-foreground mt-0.5">{data.recentOvers}</p>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full mx-auto px-2 md:px-6 lg:px-8">
            <RainOverlay active={rainActive} duration={5000} onDone={() => setRainActive(false)} />
            {/* Header */}
            <div className="flex flex-col gap-2 mb-4 md:mb-6 py-3 md:py-4 gradient-border">
                {/* Mobile: breadcrumb owns its own full-width row so long
                    series names ("India tour of Zimbabwe 2026") never
                    truncate against the 4-icon action cluster. Row 2 pairs
                    the h1/meta on the left with the icons on the right, and
                    the icon cluster shrinks (shrink-0) so h1 always claims
                    whatever space remains. Desktop keeps the compact single-
                    row header where the breadcrumb sits above the h1 inside
                    the left column. */}
                <div className="lg:hidden">
                    <Breadcrumbs
                        items={[
                            { label: 'Home', href: '/' },
                            ...(data?.seriesName && data?.seriesId
                                ? [{
                                    label: data.seriesName,
                                    href: `/series/${data.seriesId}/${data.seriesName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
                                }]
                                : []),
                        ]}
                    />
                </div>
                <div className="flex items-start gap-2 md:gap-4">
                    <div className="flex-1 min-w-0">
                        <Breadcrumbs
                            className="mb-1 hidden lg:flex"
                            items={[
                                { label: 'Home', href: '/' },
                                ...(data?.seriesName && data?.seriesId
                                    ? [{
                                        label: data.seriesName,
                                        href: `/series/${data.seriesId}/${data.seriesName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
                                    }]
                                    : []),
                            ]}
                        />
                        <h1 className="text-lg md:text-2xl font-display tracking-tight text-foreground leading-tight line-clamp-2 md:truncate">
                            <TitleWithTeamLinks title={data?.title} />
                        </h1>
                        {(() => {
                            const hasVenue = data?.venue && data.venue !== 'N/A' && data.venue.trim() !== '';
                            const venueHref = hasVenue ? buildVenueHref(data.venueUrl) : null;
                            const dateStr = data?.matchStartTimestamp
                                ? new Date(data.matchStartTimestamp).toLocaleDateString('en-US', {
                                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
                                }).replace(/GMT\+5:30/, 'IST').replace(/GMT([+-]\d{1,2}):?(\d{2})?/, 'GMT$1')
                                : null;
                            const hasToss = !!(data?.toss && data.toss !== 'N/A' && data.toss.trim() !== '');
                            if (!hasVenue && !dateStr && !hasToss) return null;
                            return (
                                <div className="mt-2 md:mt-2.5 space-y-1.5">
                                    {/* Single-row meta strip: venue on the left claims remaining
                                        space and truncates with ellipsis; date stays pinned to the
                                        right at its natural width. Prevents the older flex-wrap
                                        layout from bumping the date onto its own row on mobile. */}
                                    {(hasVenue || dateStr) && (
                                        <div className="flex flex-col md:flex-row md:items-center gap-y-1 md:gap-y-0 md:gap-x-3 text-[11px] md:text-xs text-muted-foreground min-w-0">
                                            {hasVenue && (venueHref ? (
                                                <Link href={venueHref} className="flex items-center gap-1.5 min-w-0 hover:text-foreground hover:underline transition-colors">
                                                    <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                                    <span className="truncate">{data!.venue}</span>
                                                </Link>
                                            ) : (
                                                <span className="flex items-center gap-1.5 min-w-0">
                                                    <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                                    <span className="truncate">{data!.venue}</span>
                                                </span>
                                            ))}
                                            {hasVenue && dateStr && <span className="hidden md:inline shrink-0 text-muted-foreground/40" aria-hidden>·</span>}
                                            {dateStr && (
                                                <span className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                                                    <Clock className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                                    {dateStr}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {hasToss && (
                                        <p className="text-[11px] md:text-xs text-muted-foreground truncate">{data!.toss}</p>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                    {/* Desktop: tabs + theme toggle inline with title */}
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                        {!notStarted && (
                        <div className="flex items-center gap-1 tab-container">
                            {views.map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setView(v)}
                                    className={`
                                        px-4 py-2 rounded-lg text-sm font-medium
                                        transition-all duration-200 text-center
                                        ${view === v
                                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }
                                    `}
                                >
                                    {VIEW_LABELS[v]}
                                </button>
                            ))}
                        </div>
                        )}
                        <Link
                            href="/news"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <Newspaper className="w-4 h-4" />
                            <span className="hidden lg:inline">News</span>
                        </Link>
                        <Link
                            href="/rankings"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <Medal className="w-4 h-4" />
                            <span className="hidden lg:inline">Rankings</span>
                        </Link>
                        <CommandPaletteTrigger />
                        <ThemeToggle />
                    </div>
                    {/* Mobile: icon cluster shares row 2 with the h1. shrink-0
                        so h1 always gets the leftover width; icons never
                        squeeze it below the two-line clamp. Tablet+ uses the
                        text-label cluster to the right of the title instead. */}
                    <div className="md:hidden shrink-0 flex items-center gap-1.5">
                        <Link
                            href="/news"
                            aria-label="News"
                            className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 transition-colors text-muted-foreground"
                        >
                            <Newspaper className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/rankings"
                            aria-label="Rankings"
                            className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 transition-colors text-muted-foreground"
                        >
                            <Medal className="w-4 h-4" />
                        </Link>
                        <CommandPaletteTrigger />
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            {/* Mobile: pinned tabs + always-glanceable compact scoreboard */}
            {!notStarted && (
                <MatchStickyBar
                    views={views}
                    view={view}
                    onSelect={setView}
                    labels={VIEW_LABELS}
                    score={data?.score}
                    currentRunRate={data?.currentRunRate}
                    requiredRunRate={data?.requiredRunRate}
                    status={data?.status}
                    live={liveInnings}
                    hasHero={view === 'live'}
                    heroRef={scoreHeroRef}
                    batsmen={data?.batsmen}
                    bowler={data?.bowlers?.find((b) => b.onStrike) ?? data?.bowlers?.[0] ?? null}
                    showBatting={view === 'live' && (data?.batsmen?.length ?? 0) > 0}
                />
            )}

            <div>
                {view === 'live' && (
                    <motion.div className="space-y-4" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
                        {/* Countdown Timer */}
                        {timeLeft && data?.batsmen.length === 0 && (
                            <div className="surface-card p-8 md:p-12 text-center">
                                <div className="flex justify-center gap-2 md:gap-4 mb-4">
                                    {[
                                        { value: timeLeft.hours, label: 'hours' },
                                        { value: timeLeft.minutes, label: 'minutes' },
                                        { value: timeLeft.seconds, label: 'seconds' },
                                    ].map((unit, i) => (
                                        <div key={unit.label} className="flex items-center gap-2 md:gap-4">
                                            <div className="flex flex-col items-center">
                                                <span className="text-4xl md:text-6xl font-display text-primary tabular-nums">
                                                    {String(unit.value).padStart(2, '0')}
                                                </span>
                                                <span className="text-xs text-muted-foreground mt-1">{unit.label}</span>
                                            </div>
                                            {i < 2 && <span className="text-3xl md:text-5xl font-display text-primary/40 mb-5">:</span>}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm text-muted-foreground">{data?.status}</p>
                            </div>
                        )}

                        {/* Score Hero */}
                        {(!timeLeft || (data && data.batsmen.length > 0)) && (
                            <div ref={scoreHeroRef} className="relative overflow-hidden score-hero">
                                {/* Atmospheric background layers */}

                                {/* Share Button */}
                                {data && (
                                    <div className="absolute top-4 right-4 z-10">
                                        <ShareButton
                                            matchTitle={data.title}
                                            cardData={{
                                                title: data.title,
                                                score: data.score,
                                                status: data.status,
                                                seriesName: data.seriesName,
                                                currentRunRate: data.currentRunRate,
                                                requiredRunRate: data.requiredRunRate,
                                                previousInnings: data.previousInnings,
                                                winProbability: data.winProbability?.team1?.name && data.winProbability?.team2?.name ? {
                                                    team1: { name: data.winProbability.team1.name, probability: data.winProbability.team1.probability ?? 0 },
                                                    team2: { name: data.winProbability.team2.name, probability: data.winProbability.team2.probability ?? 0 },
                                                } : undefined,
                                                accent: heroAccent ?? undefined,
                                                flagUrl: battingFlagUrl ?? undefined,
                                                overPoints: heroOvers && heroOvers.length
                                                    ? heroOvers.map((o) => ({ runs: o.runs, wicketFell: o.wicketFell }))
                                                    : undefined,
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Last Event Badge */}
                                {lastEvent && (
                                    <Badge
                                        key={lastEvent.key}
                                        variant={getEventBadgeVariant(lastEvent.variant)}
                                        className={`absolute top-4 right-14 z-10 text-lg font-bold event-animation tabular-nums shadow-lg rounded-xl px-3 py-1 ${getEventBadgeClass(lastEvent.variant)}`}
                                    >
                                        {lastEvent.text}
                                    </Badge>
                                )}

                                <div className="relative z-[1] p-5 md:p-7">
                                    {/* Previous Innings */}
                                    {data?.previousInnings && data.previousInnings.length > 0 && (
                                        <div className="space-y-1 mb-4">
                                            {data.previousInnings.map((inning, index) => {
                                                const invFlag = inning.teamFlagUrl || flagForShortCode(inning.teamShortName || inning.teamName, storedFlags);
                                                return (
                                                <div key={index} className="flex items-baseline gap-2 opacity-50">
                                                    {invFlag && (
                                                        <div className="rounded-[2px] overflow-hidden w-5 h-3.5 flex-shrink-0 relative top-[2px] ring-1 ring-black/5 dark:ring-white/10">
                                                            <Image src={invFlag} alt={inning.teamShortName || inning.teamName} width={20} height={14} unoptimized className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-semibold text-muted-foreground mr-1">{inning.teamShortName || inning.teamName}</span>
                                                    <span className="text-2xl md:text-3xl font-display tracking-tight text-muted-foreground/80">
                                                        {isHundred ? toHundredBalls(inning.score) : inning.score}
                                                    </span>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Current Score - the hero */}
                                    <div>
                                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 lg:gap-8">
                                            <div className="flex items-center gap-2 md:gap-4 min-w-0">
                                                {battingFlagUrl && (
                                                    <Image
                                                        src={battingFlagUrl}
                                                        alt=""
                                                        width={56}
                                                        height={40}
                                                        unoptimized
                                                        className="w-8 h-6 md:w-14 md:h-10 rounded object-cover shrink-0 ring-1 ring-black/5 dark:ring-white/10"
                                                    />
                                                )}
                                                {/* Fluid size + no-wrap keep the score on one line at every width;
                                                    the score is the page's highest-priority element. */}
                                                <AnimatedScore
                                                    value={heroScoreLabel}
                                                    className={`whitespace-nowrap text-[clamp(1.5rem,8vw,2.5rem)] md:text-5xl lg:text-6xl font-display tracking-tight score-breathe ${heroAccent ? '' : 'stat-amber score-glow-effect'}`}
                                                    style={heroAccent ? { color: heroAccent } : undefined}
                                                />
                                            </div>
                                            {liveInnings && (
                                                <HeroMomentum
                                                    overs={heroOvers}
                                                    accent={heroAccent ?? undefined}
                                                />
                                            )}
                                        </div>

                                        {/* Status + Rates row */}
                                        <div className="mt-5 md:mt-6 flex items-center justify-between gap-4 flex-wrap">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {data?.status && (
                                                    <div
                                                        className={`inline-flex items-center px-3.5 py-1.5 rounded-full ring-1 ring-inset ring-white/5 max-w-full ${(scoreColors && scoreColors.length >= 2) || heroAccent ? '' : 'bg-muted/50'}`}
                                                        style={
                                                            scoreColors && scoreColors.length >= 2
                                                                ? { background: `linear-gradient(90deg, ${scoreColors[0]}40, ${scoreColors[1]}1f 50%, transparent)` }
                                                                : heroAccent
                                                                    ? { background: `linear-gradient(90deg, ${heroAccent}55, ${heroAccent}22 55%, transparent)` }
                                                                    : undefined
                                                        }
                                                    >
                                                        <span className={`text-sm font-semibold truncate ${matchOver ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                                                            {data.status}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {/* Run rates only make sense during a live innings, not before
                                                    the start or once the match is over. */}
                                                {liveInnings && (
                                                    <span className="text-base md:text-lg font-display font-semibold tracking-wide">
                                                        <span className="text-muted-foreground">{rateLabelPrimary}</span>{' '}
                                                        <span className="text-foreground">{data?.currentRunRate}</span>
                                                    </span>
                                                )}
                                                {liveInnings && data?.requiredRunRate && (
                                                    <span className="text-base md:text-lg font-display font-semibold tracking-wide">
                                                        <span className="text-muted-foreground">{rateLabelRequired}</span>{' '}
                                                        <span className="stat-amber">{data.requiredRunRate}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom accent line */}
                                <div className="h-px bg-border" />
                            </div>
                        )}

                        {/* Player of the Match / Series */}
                        {(data?.playerOfTheMatch || data?.playerOfTheSeries) && (
                            <div className="flex flex-wrap gap-3">
                                {data.playerOfTheMatch && (
                                    <button
                                        onClick={() => {
                                            if (data.playerOfTheMatch?.profileId) {
                                                setSelectedProfileId(data.playerOfTheMatch.profileId);
                                                setSelectedPlayerName(data.playerOfTheMatch.name);
                                            }
                                        }}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex-1 min-w-[200px]"
                                    >
                                        {data.playerOfTheMatch.imageUrl && (
                                            <Image src={data.playerOfTheMatch.imageUrl} alt={data.playerOfTheMatch.name} width={225} height={225} className="w-10 h-10 rounded-full object-cover" unoptimized />
                                        )}
                                        <div className="text-left">
                                            <p className="text-[10px] uppercase tracking-wider stat-amber font-semibold">Player of the Match</p>
                                            <p className="text-sm font-medium">{data.playerOfTheMatch.name}</p>
                                        </div>
                                    </button>
                                )}
                                {data.playerOfTheSeries && (
                                    <button
                                        onClick={() => {
                                            if (data.playerOfTheSeries?.profileId) {
                                                setSelectedProfileId(data.playerOfTheSeries.profileId);
                                                setSelectedPlayerName(data.playerOfTheSeries.name);
                                            }
                                        }}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors flex-1 min-w-[200px]"
                                    >
                                        {data.playerOfTheSeries.imageUrl && (
                                            <Image src={data.playerOfTheSeries.imageUrl} alt={data.playerOfTheSeries.name} width={225} height={225} className="w-10 h-10 rounded-full object-cover" unoptimized />
                                        )}
                                        <div className="text-left">
                                            <p className="text-[10px] uppercase tracking-wider stat-purple font-semibold">Player of the Series</p>
                                            <p className="text-sm font-medium">{data.playerOfTheSeries.name}</p>
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Win Probability */}
                        {data?.requiredRunRate && data?.previousInnings?.length > 0 && (
                            <WinProbability
                                score={data.score}
                                currentRunRate={data.currentRunRate}
                                requiredRunRate={data.requiredRunRate}
                                previousInnings={data.previousInnings}
                                status={data.status}
                                scrapedProbability={data.winProbability?.team1?.name && data.winProbability?.team2?.name ? {
                                    team1: { name: data.winProbability.team1.name, probability: data.winProbability.team1.probability ?? 0 },
                                    team2: { name: data.winProbability.team2.name, probability: data.winProbability.team2.probability ?? 0 },
                                } : undefined}
                            />
                        )}

                        {/* Main Layout: Scorecard Left + Commentary Right */}
                        <div className={`grid grid-cols-1 gap-4 lg:gap-6 ${data && data.batsmen.length === 0 && data.bowlers.length === 0 ? '' : 'xl:grid-cols-[420px_1fr]'}`}>
                            {/* Left Column: Scorecard + Key Stats */}
                            <div className="min-w-0 space-y-4">
                                {/* Scorecard Tables */}
                                {data && (data.batsmen.length !== 0 || data.bowlers.length !== 0) && (
                                    <div className="surface-card overflow-hidden">
                                        {/* Batting */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs md:text-sm">
                                                <thead>
                                                    <tr className="mini-sc-batting-header">
                                                        <th className="text-left text-xs font-bold mini-sc-batting-text px-2 md:px-4 py-2 md:py-3">Batter</th>
                                                        <th className="text-center text-xs font-bold mini-sc-batting-text px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">R</th>
                                                        <th className="text-center text-xs font-bold mini-sc-batting-text px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">B</th>
                                                        <th className="text-center text-xs font-bold mini-sc-batting-text px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">4s</th>
                                                        <th className="text-center text-xs font-bold mini-sc-batting-text px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">6s</th>
                                                        <th className="text-center text-xs font-bold mini-sc-batting-text px-1 md:px-3 py-2 md:py-3 w-12 md:w-16">SR</th>
                                                        <th className="w-6 md:w-8"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data?.batsmen.map((batsman, index) => {
                                                        const runs = Number(batsman.runs);
                                                        const sr = parseFloat(batsman.strikeRate);
                                                        return (
                                                        <tr key={index} className={`table-row-themed transition-colors ${
                                                            runs >= 50 ? 'row-highlight-batting-50' :
                                                            runs >= 30 ? 'row-highlight-batting-30' : ''
                                                        }`}>
                                                            <td className="px-2 md:px-4 py-2 md:py-3">
                                                                <span
                                                                    className={`text-xs md:text-sm font-medium cursor-pointer hover:text-primary transition-colors whitespace-nowrap ${
                                                                        runs >= 50 ? 'stat-green' : ''
                                                                    }`}
                                                                    onClick={() => handleProfileClick(batsman.profileId, batsman.name)}
                                                                >
                                                                    {batsman.name}{batsman.onStrike ? ' *' : ''}
                                                                </span>
                                                            </td>
                                                            <td className={`text-center text-xs md:text-sm font-bold px-1 md:px-3 py-2 md:py-3 ${runs >= 50 ? 'stat-green' : ''}`}>{batsman.runs}</td>
                                                            <td className="text-center text-xs md:text-sm text-muted-foreground px-1 md:px-3 py-2 md:py-3">{batsman.balls}</td>
                                                            <td className={`text-center text-xs md:text-sm px-1 md:px-3 py-2 md:py-3 ${Number(batsman.fours) > 0 ? 'stat-blue font-medium' : 'text-muted-foreground'}`}>{batsman.fours}</td>
                                                            <td className={`text-center text-xs md:text-sm px-1 md:px-3 py-2 md:py-3 ${Number(batsman.sixes) > 0 ? 'stat-purple font-medium' : 'text-muted-foreground'}`}>{batsman.sixes}</td>
                                                            <td className={`text-center text-xs md:text-sm font-mono px-1 md:px-3 py-2 md:py-3 ${
                                                                sr >= 150 ? 'stat-green font-bold' :
                                                                sr >= 100 ? 'stat-emerald' :
                                                                'text-muted-foreground'
                                                            }`}>{sr.toFixed(2)}</td>
                                                            <td className="text-center px-1 md:px-2 py-2 md:py-3">
                                                                {batsman.highlightsUrl ? (
                                                                    <span
                                                                        className="text-primary hover:text-primary/80 transition-colors text-xs cursor-pointer"
                                                                        title="View Highlights"
                                                                        onClick={() => handleHighlightsClick(batsman.highlightsUrl!)}
                                                                    >▶</span>
                                                                ) : (
                                                                    <span className="text-muted-foreground cursor-pointer" onClick={() => handleProfileClick(batsman.profileId, batsman.name)}>›</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Bowling */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs md:text-sm">
                                                <thead>
                                                    <tr className="mini-sc-bowling-header">
                                                        <th className="text-left text-xs font-bold mini-sc-bowling-text px-2 md:px-4 py-2 md:py-3">Bowler</th>
                                                        <th className="text-center text-xs font-bold mini-sc-bowling-text px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">O</th>
                                                        <th className="text-center text-xs font-bold mini-sc-bowling-text px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">M</th>
                                                        <th className="text-center text-xs font-bold mini-sc-bowling-text px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">R</th>
                                                        <th className="text-center text-xs font-bold mini-sc-bowling-text px-1 md:px-3 py-2 md:py-3 w-8 md:w-12">W</th>
                                                        <th className="text-center text-xs font-bold mini-sc-bowling-text px-1 md:px-3 py-2 md:py-3 w-12 md:w-16">ECO</th>
                                                        <th className="w-6 md:w-8"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data?.bowlers.map((bowler, index) => {
                                                        const wkts = Number(bowler.wickets);
                                                        const eco = parseFloat(bowler.economy);
                                                        return (
                                                        <tr key={index} className={`table-row-themed transition-colors ${
                                                            wkts >= 3 ? 'row-highlight-bowling-3' :
                                                            wkts >= 2 ? 'row-highlight-bowling-2' : ''
                                                        }`}>
                                                            <td className="px-2 md:px-4 py-2 md:py-3">
                                                                <span
                                                                    className={`text-xs md:text-sm font-medium cursor-pointer hover:text-primary transition-colors whitespace-nowrap ${
                                                                        wkts >= 3 ? 'stat-orange' : ''
                                                                    }`}
                                                                    onClick={() => handleProfileClick(bowler.profileId, bowler.name)}
                                                                >
                                                                    {bowler.name}{bowler.onStrike ? ' *' : ''}
                                                                </span>
                                                            </td>
                                                            <td className="text-center text-xs md:text-sm text-muted-foreground px-1 md:px-3 py-2 md:py-3">{bowler.overs}</td>
                                                            <td className={`text-center text-xs md:text-sm px-1 md:px-3 py-2 md:py-3 ${Number(bowler.maidens) > 0 ? 'stat-green font-medium' : 'text-muted-foreground'}`}>{bowler.maidens}</td>
                                                            <td className="text-center text-xs md:text-sm text-muted-foreground px-1 md:px-3 py-2 md:py-3">{bowler.runs}</td>
                                                            <td className={`text-center text-xs md:text-sm font-bold px-1 md:px-3 py-2 md:py-3 ${
                                                                wkts >= 3 ? 'stat-orange' :
                                                                wkts >= 1 ? 'stat-amber' : ''
                                                            }`}>{bowler.wickets}</td>
                                                            <td className={`text-center text-xs md:text-sm font-mono px-1 md:px-3 py-2 md:py-3 ${
                                                                eco <= 4 ? 'stat-green' :
                                                                eco >= 10 ? 'stat-red' :
                                                                'text-muted-foreground'
                                                            }`}>{bowler.economy}</td>
                                                            <td className="text-center px-1 md:px-2 py-2 md:py-3">
                                                                {bowler.highlightsUrl ? (
                                                                    <span
                                                                        className="text-primary hover:text-primary/80 transition-colors text-xs cursor-pointer"
                                                                        title="View Highlights"
                                                                        onClick={() => handleHighlightsClick(bowler.highlightsUrl!)}
                                                                    >▶</span>
                                                                ) : (
                                                                    <span className="text-muted-foreground cursor-pointer" onClick={() => handleProfileClick(bowler.profileId, bowler.name)}>›</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Per-batter scoring breakdown (dot %, run distribution) for the
                                    two batters at the crease, from ball-by-ball data. */}
                                {data?.status && isLive(data.status) && data.batsmen.length > 0 && (
                                    <BatterBreakdown
                                        matchId={matchId}
                                        inningsId={data.currentInningsId || 1}
                                        batsmen={data.batsmen}
                                    />
                                )}

                                {/* Key Stats trigger - mobile; opens Partnership/Last Wicket/Recent Overs as a bottom sheet */}
                                {hasKeyStats && (
                                    <button
                                        onClick={() => setKeyStatsOpen(true)}
                                        className="md:hidden surface-card w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Key Stats
                                        <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                )}

                                {/* Live Stream - inside left column, below scorecard */}
                                {data?.status && isLive(data.status) && data.batsmen.length > 0 && (
                                    <LiveStreamTab
                                        matchTitle={streamTitle}
                                        teams={streamTeams}
                                    />
                                )}

                                {/* Commentary - visible on mobile always, on desktop only when no scorecard.
                                    Content inside is constrained to a readable line-length (65-75 chars)
                                    via `max-w-3xl` — full-viewport commentary at 140+ chars is unreadable.
                                    Height is viewport-relative so the panel always scrolls internally
                                    rather than pushing the whole page down. */}
                                <div className={`surface-card overflow-hidden ${data && (data.batsmen.length !== 0 || data.bowlers.length !== 0) ? 'xl:hidden' : ''}`}>
                                    <div className="px-4 py-3 border-b border-border/50 section-header-gradient">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Commentary</h3>
                                    </div>
                                    <div className="p-3 max-w-3xl mx-auto w-full">
                                        <VirtualCommentaryList
                                            commentary={data?.commentary || []}
                                            renderItem={renderCommentaryItem}
                                            containerClassName="h-[65vh] md:h-[70vh]"
                                            onLoadMore={loadMoreCommentary}
                                            loadingMore={loadingMore}
                                            hasMore={lastTimestamp !== null && lastTimestamp !== 0}
                                            newCommentaryStartIndex={newCommentaryStartIndex}
                                            onNewCommentaryVisible={() => setNewCommentaryStartIndex(null)}
                                        />
                                    </div>
                                </div>

                                {/* Key Stats - desktop inline; mobile opens as a bottom sheet from the sticky bar */}
                                {hasKeyStats && (
                                    <div className="surface-card overflow-hidden hidden md:block">
                                        {keyStatsBody}
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Commentary - Desktop only, sticky.
                                Fixed height (viewport minus sticky top + header
                                + padding) so the panel always fills the desktop
                                viewport regardless of commentary item count. */}
                            {data && (data.batsmen.length !== 0 || data.bowlers.length !== 0) && (
                                <div className="hidden xl:block">
                                    <div className="sticky top-4">
                                        <div className="surface-card overflow-hidden flex flex-col h-[calc(100vh-2rem)]">
                                            {/* Commentary Header with gradient accent */}
                                            <div className="relative px-4 py-3 border-b border-border/50 shrink-0">
                                                <div className="absolute inset-0 commentary-header-gradient"></div>
                                                <div className="relative flex items-center justify-between">
                                                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Commentary</h3>
                                                    {data?.status && isLive(data.status) && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 live-pulse"></div>
                                                            <span className="text-[10px] font-medium text-muted-foreground">LIVE</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Commentary Feed — flex-1 fills the remaining
                                                card height; the list itself handles scrolling. */}
                                            <div className="p-3 flex-1 min-h-0 flex flex-col">
                                                <VirtualCommentaryList
                                                    commentary={data?.commentary || []}
                                                    renderItem={renderCommentaryItem}
                                                    containerClassName="flex-1 min-h-0"
                                                    onLoadMore={loadMoreCommentary}
                                                    loadingMore={loadingMore}
                                                    hasMore={lastTimestamp !== null && lastTimestamp !== 0}
                                                    newCommentaryStartIndex={newCommentaryStartIndex}
                                                    onNewCommentaryVisible={() => setNewCommentaryStartIndex(null)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
                {view === 'scorecard' && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
                        <FullScorecard matchId={matchId} />
                    </motion.div>
                )}
                {view === 'squads' && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
                        <MatchSquadsDisplay matchId={matchId} />
                    </motion.div>
                )}
                {/* Always-mounted so the 6 Report-tab fetches start in the background
                    as soon as the match page loads. Hidden via CSS when not active. */}
                <motion.div
                    initial={false}
                    animate={{ opacity: view === 'graphs' ? 1 : 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ display: view === 'graphs' ? 'block' : 'none' }}
                >
                    <MatchGraphs
                        matchId={matchId}
                        initialTab={graphsInitialTab}
                        matchTitle={data?.title || ''}
                        seriesName={data?.seriesName}
                        live={!!data?.status && isLive(data.status)}
                    />
                </motion.div>
                {view === 'table' && data?.seriesId && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
                        <PointsTableDisplay seriesId={data.seriesId} showTopPerformers seriesName={data.seriesName} />
                    </motion.div>
                )}
            </div>

            {/* Player Profile Dialog */}
            <Dialog open={!!selectedProfileId} onOpenChange={handleDialogOpenChange}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Player Profile</DialogTitle>
                    </DialogHeader>
                    {profileLoading && <PlayerProfileSkeleton />}
                    {selectedProfile && <PlayerProfileDisplay profile={selectedProfile} />}
                    {!profileLoading && !selectedProfile && selectedProfileId && (
                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                                <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">Couldn't load profile</p>
                            <p className="text-xs text-muted-foreground">Please try again in a moment.</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Highlights Dialog */}
            <Dialog open={!!highlightsUrl} onOpenChange={handleHighlightsDialogClose}>
                <DialogContent className="max-w-2xl w-full max-h-[85vh] overflow-y-auto p-0 rounded-2xl">
                    <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/50">
                        <DialogTitle className="font-display text-lg">
                            {highlightsData ? (
                                <span>{highlightsData.playerName} <span className="text-muted-foreground font-mono text-base">{highlightsData.playerScore}</span></span>
                            ) : (
                                'Player Highlights'
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    {highlightsLoading && <HighlightsSkeleton />}
                    {highlightsData && (
                        <div className="p-3 md:p-4">
                            <div className="space-y-0.5">
                                {highlightsData.highlights.map((item, index) => {
                                    const text = item.text;
                                    const textLower = text.toLowerCase();
                                    // Detect events from bold tags and keywords
                                    const hasBold = (kw: string) => text.includes(`<b>${kw}</b>`) || text.includes(`<b>${kw.toUpperCase()}</b>`) || text.includes(`<b>${kw.charAt(0).toUpperCase() + kw.slice(1)}</b>`);
                                    const isFour = hasBold('four') || /\bFOUR\b/.test(text);
                                    const isSix = hasBold('six') || /\bSIX\b/.test(text);
                                    const isWicket = hasBold('out') || /\bOUT\b/.test(text);
                                    const isDot = textLower.includes('no run');
                                    // Wide detection: only detect actual wides via bold tag (the source bolds extras)
                                    const isWide = !isDot && hasBold('wide');
                                    const isNoBall = textLower.includes('no ball') || textLower.includes('no-ball');

                                    // Get run value from text if possible
                                    let runDisplay = '•';
                                    if (isFour) runDisplay = '4';
                                    else if (isSix) runDisplay = '6';
                                    else if (isWicket) runDisplay = 'W';
                                    else if (isWide) runDisplay = 'Wd';
                                    else if (isNoBall) runDisplay = 'Nb';
                                    else if (isDot) runDisplay = '•';
                                    else {
                                        // Try to extract runs from patterns like "1 run" or "2 runs"
                                        const runMatch = text.match(/\b(\d)\s*runs?\b/i);
                                        if (runMatch) runDisplay = runMatch[1];
                                    }

                                    // Ball indicator class matching commentary style
                                    let ballClass = "w-7 h-7 md:w-8 md:h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0";
                                    if (isSix) ballClass += " bg-purple-600 text-white";
                                    else if (isFour) ballClass += " bg-blue-600 text-white";
                                    else if (isWicket) ballClass += " bg-red-600 text-white";
                                    else if (isWide || isNoBall) ballClass += " bg-orange-500 text-white text-[10px]";
                                    else if (isDot) ballClass += " bg-muted text-muted-foreground";
                                    else if (/^\d$/.test(runDisplay)) ballClass += " bg-green-600 text-white";
                                    else ballClass += " bg-muted text-muted-foreground";

                                    return (
                                        <div key={index} className="slide-in-left flex items-start gap-3 py-2.5 px-2 rounded-xl hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="font-mono font-bold text-xs text-muted-foreground w-8 text-right">
                                                    {item.over}
                                                </span>
                                                <span className={ballClass}>{runDisplay}</span>
                                            </div>
                                            <p className="text-sm text-foreground/90 flex-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
                                        </div>
                                    );
                                })}
                                {highlightsData.highlights.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                                            <span className="text-xl">🏏</span>
                                        </div>
                                        <p className="text-sm font-medium text-foreground">No highlights yet</p>
                                        <p className="text-xs text-muted-foreground text-center max-w-[240px]">
                                            Boundaries and wickets from this innings will show up here.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {!highlightsLoading && !highlightsData && highlightsUrl && (
                        <div className="p-8 text-center text-muted-foreground">Failed to load highlights</div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Stat Share Dialog */}
            {statShareData && data && (
                <StatShareDialog
                    open={statShareOpen}
                    onOpenChange={setStatShareOpen}
                    matchTitle={data.title}
                    cardData={{
                        matchTitle: data.title,
                        seriesName: data.seriesName,
                        score: data.score,
                        headline: statShareData.headline,
                        text: statShareData.text,
                        snippetType: statShareData.snippetType,
                    }}
                />
            )}

            {/* Key Stats Sheet - mobile */}
            <Sheet open={keyStatsOpen} onOpenChange={setKeyStatsOpen}>
                <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh] overflow-y-auto px-0 pb-6">
                    <SheetHeader className="px-5 pb-3 border-b border-border/30">
                        <SheetTitle className="text-sm font-bold uppercase tracking-widest text-foreground">Key Stats</SheetTitle>
                    </SheetHeader>
                    <div className="px-2 pt-1">{keyStatsBody}</div>
                </SheetContent>
            </Sheet>

            {/* Over Summary Sheet */}
            <Sheet open={overSheetOpen} onOpenChange={setOverSheetOpen}>
                <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto px-0 pb-6">
                    <SheetHeader className="px-5 pb-3 border-b border-border/30">
                        <SheetTitle className="text-sm font-bold uppercase tracking-widest text-foreground">After this over</SheetTitle>
                    </SheetHeader>
                    {overSheetData && (
                        <div className="pt-4 px-5">
                            {/* Score headline */}
                            <div className="flex items-baseline justify-between mb-4">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-2xl font-display text-foreground tabular-nums">
                                        {overSheetData.teamScore}/{overSheetData.teamWickets}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        ({Math.floor(overSheetData.overNumber || 0)} ov)
                                    </span>
                                </div>
                                {overSheetData.teamScore !== undefined && overSheetData.overNumber && (
                                    <div className="text-right">
                                        <span className="text-xs text-muted-foreground">CRR </span>
                                        <span className="text-sm font-semibold text-foreground tabular-nums">
                                            {(overSheetData.teamScore / Math.floor(overSheetData.overNumber)).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Ball summary */}
                            {overSheetData.overSummary && (() => {
                                const sheetRuns = computeOverRuns(overSheetData.overSummary, overSheetData.overRuns);
                                return (
                                    <div className="flex items-center gap-1.5 mb-5 flex-wrap">
                                        {overSheetData.overSummary.replace(/\(\d+\s*runs?\)/i, '').trim().split(/\s+/).map((ball, idx) => {
                                            const b = ball.trim();
                                            if (!b || b.includes('(') || b.includes(')') || b.toLowerCase() === 'runs' || b.toLowerCase() === 'run') return null;
                                            let cls = 'w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0';
                                            let content: string = b;
                                            if (b.toLowerCase().includes('wd') || b.toLowerCase().includes('wide')) { cls += ' bg-amber-500 text-white text-[10px]'; content = 'Wd'; }
                                            else if (b.toLowerCase().includes('nb') || b.toLowerCase().includes('noball')) { cls += ' bg-orange-500 text-white text-[10px]'; content = 'Nb'; }
                                            else if (b === 'W') cls += ' bg-red-500 text-white';
                                            else if (b === '6') cls += ' bg-purple-600 text-white';
                                            else if (b === '4') cls += ' bg-blue-500 text-white';
                                            else if (b === '0' || b === '.') { cls += ' bg-muted text-muted-foreground'; content = '\u2022'; }
                                            else cls += ' bg-emerald-600 text-white';
                                            return <span key={idx} className={cls}>{content}</span>;
                                        })}
                                        {sheetRuns !== undefined && (
                                            <span className="text-sm text-primary font-semibold ml-1 tabular-nums">
                                                {sheetRuns} {sheetRuns === 1 ? 'run' : 'runs'}
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Batsmen & Bowler */}
                            {(overSheetData.overBatsmen?.length || overSheetData.overBowler) && (
                                <div className="border-t border-border/20 pt-4 mb-4 space-y-2">
                                    {overSheetData.overBatsmen?.map((bat, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <span className="text-sm text-foreground truncate">{bat.name}</span>
                                            <span className="text-sm font-semibold text-foreground tabular-nums shrink-0 ml-3">{bat.score}</span>
                                        </div>
                                    ))}
                                    {overSheetData.overBowler && (
                                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/40">
                                            <span className="text-sm text-foreground truncate">{overSheetData.overBowler.name}</span>
                                            <span className="text-sm font-semibold text-foreground tabular-nums shrink-0 ml-3">{overSheetData.overBowler.figures}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Win Probability */}
                            {data && data.winProbability?.team1?.name && data.winProbability?.team2?.name && (() => {
                                // Match the hero / win-prob strip: colour each side by its
                                // identity (India blue, England red, ...), falling back to the
                                // source colours for teams not in the map.
                                const wp = data.winProbability;
                                const wp1Color = teamColorFor(wp.team1.name, [wp.team1.name]) ?? '#E6A937';
                                const wp2Color = teamColorFor(wp.team2.name, [wp.team2.name]) ?? '#0588F0';
                                return (
                                <div className="border-t border-border/20 pt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Win Probability</span>
                                        <button
                                            onClick={() => { setOverSheetOpen(false); setGraphsInitialTab('winProb'); setView('graphs'); }}
                                            className="flex items-center gap-0.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                                        >
                                            View Graph
                                            <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="relative h-2 rounded-full overflow-hidden bg-muted/50 mb-2">
                                        <div
                                            className="absolute inset-y-0 left-0 rounded-l-full transition-all"
                                            style={{ width: `${wp.team1.probability}%`, backgroundColor: wp1Color }}
                                        />
                                        <div
                                            className="absolute inset-y-0 right-0 rounded-r-full transition-all"
                                            style={{ width: `${wp.team2.probability}%`, backgroundColor: wp2Color }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span style={{ color: wp1Color }} className="font-semibold">{wp.team1.name} {wp.team1.probability}%</span>
                                        <span style={{ color: wp2Color }} className="font-semibold">{wp.team2.name} {wp.team2.probability}%</span>
                                    </div>
                                </div>
                                );
                            })()}
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Swipe indicators */}
            {swiping && swipeDirection === 'right' && currentViewIndex > 0 && (
                <div
                    className="fixed left-0 top-0 bottom-0 w-16 z-50 flex items-center justify-center pointer-events-none"
                    style={{ opacity: swipeProgress }}
                >
                    <div className="bg-primary/20 backdrop-blur-sm rounded-r-2xl h-24 w-10 flex items-center justify-center">
                        <ChevronLeft className="w-5 h-5 text-primary" />
                    </div>
                </div>
            )}
            {swiping && swipeDirection === 'left' && currentViewIndex < views.length - 1 && (
                <div
                    className="fixed right-0 top-0 bottom-0 w-16 z-50 flex items-center justify-center pointer-events-none"
                    style={{ opacity: swipeProgress }}
                >
                    <div className="bg-primary/20 backdrop-blur-sm rounded-l-2xl h-24 w-10 flex items-center justify-center">
                        <ChevronRight className="w-5 h-5 text-primary" />
                    </div>
                </div>
            )}
        </div>
    );
}
