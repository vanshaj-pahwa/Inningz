'use client';

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Share2 } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}
import { GraphsSkeleton, MatchupsSkeleton, VenueSkeleton, AllPlayersSkeleton } from './match-skeletons';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import GraphShareDialog from './share-cards/graph-share-dialog';
import {
  getPartnershipData,
  getBallMapData,
  getWinProbHistory,
  getInningsOverData,
  getMatchups,
  getVenueForecast,
  getAllPlayersForecast,
} from '@/app/actions';
import type {
  PartnershipInnings,
  BallMapData,
  WinProbHistory,
  InningsOverData,
  MatchupsData,
  VenueData,
  AllPlayersData,
} from '@/app/actions';
import BallMap from './graphs/ball-map';
import WinProbabilityChart from './graphs/win-probability-chart';
import { teamColorFor } from '@/lib/team-flags';
import PartnershipsChart from './graphs/partnerships-chart';
import OverByOverChart from './over-by-over-chart';
import RunRateChart from './graphs/run-rate-chart';
import WormChart from './graphs/worm-chart';
import MatchupsSection from './report/matchups-section';
import VenueSection from './report/venue-section';
import AllPlayersSection from './report/all-players-section';

type SectionId = 'winProb' | 'runRate' | 'worm' | 'overs' | 'partnerships' | 'ballMap' | 'matchups' | 'venue' | 'players';

const SECTIONS: { id: SectionId; label: string; subtitle: string }[] = [
  { id: 'winProb', label: 'Win Probability', subtitle: 'How the match tilted, over by over.' },
  { id: 'runRate', label: 'Run Rate', subtitle: 'Scoring pace over the innings.' },
  { id: 'worm', label: 'Worm', subtitle: 'Cumulative runs side-by-side.' },
  { id: 'overs', label: 'Over by Over', subtitle: 'Runs and wickets in each over.' },
  { id: 'partnerships', label: 'Partnerships', subtitle: 'Who built it together.' },
  { id: 'ballMap', label: 'Ball Map', subtitle: 'Every shot, every dismissal.' },
  { id: 'matchups', label: 'Matchups', subtitle: 'Head-to-heads that could swing the match.' },
  { id: 'venue', label: 'Venue', subtitle: 'What the ground tells us.' },
  { id: 'players', label: 'All Players', subtitle: 'The full squad in context.' },
];

interface MatchGraphsProps {
  matchId: string;
  initialTab?: string;
  matchTitle?: string;
  seriesName?: string;
  live?: boolean;
}

interface ShareState {
  sectionLabel: string;
  sectionSubtitle?: string;
  inningsLabel?: string;
  chart: ReactNode;
}

export default function MatchGraphs({ matchId, initialTab, matchTitle = '', seriesName, live = false }: MatchGraphsProps) {
  const [shareState, setShareState] = useState<ShareState | null>(null);
  const [partnershipData, setPartnershipData] = useState<PartnershipInnings[] | null>(null);
  const [ballMapData, setBallMapData] = useState<Map<number, BallMapData>>(new Map());
  const [winProbData, setWinProbData] = useState<WinProbHistory | null>(null);
  const [overData, setOverData] = useState<Map<number, InningsOverData>>(new Map());
  const [overDataLoading, setOverDataLoading] = useState(true);
  const [winProbLoading, setWinProbLoading] = useState(false);
  const [partnershipsLoading, setPartnershipsLoading] = useState(false);
  const [ballMapLoading, setBallMapLoading] = useState<Map<number, boolean>>(new Map());
  const [matchupsData, setMatchupsData] = useState<MatchupsData | null>(null);
  const [matchupsLoading, setMatchupsLoading] = useState(false);
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [venueLoading, setVenueLoading] = useState(false);
  const [allPlayersData, setAllPlayersData] = useState<AllPlayersData | null>(null);
  const [allPlayersLoading, setAllPlayersLoading] = useState(false);
  // Track which sections have completed a fetch attempt so we can hide them if empty
  const [tried, setTried] = useState({
    winProb: false, overData: false, partnerships: false, ballMap: false,
    matchups: false, venue: false, allPlayers: false,
  });
  const fetched = useRef<Set<string>>(new Set());

  const [selectedOversInn, setSelectedOversInn] = useState(1);
  const [selectedPshipInn, setSelectedPshipInn] = useState(1);
  const [selectedBallMapInn, setSelectedBallMapInn] = useState(1);

  const sectionRefs = useRef<Map<SectionId, HTMLElement>>(new Map());

  // Fetchers — called by each section on first visibility
  const fetchWinProb = useCallback(async () => {
    if (fetched.current.has('winProb')) return;
    fetched.current.add('winProb');
    setWinProbLoading(true);
    const result = await getWinProbHistory(matchId);
    if (result.success && result.data) setWinProbData(result.data);
    setWinProbLoading(false);
    setTried((t) => ({ ...t, winProb: true }));
  }, [matchId]);

  const fetchOverData = useCallback(async () => {
    if (fetched.current.has('overData')) return;
    fetched.current.add('overData');
    setOverDataLoading(true);
    const ids = [1, 2, 3, 4];
    const results = await Promise.allSettled(ids.map((id) => getInningsOverData(matchId, id)));
    const map = new Map<number, InningsOverData>();
    results.forEach((res, i) => {
      if (res.status === 'fulfilled' && res.value.success && res.value.data?.overs?.length) {
        map.set(ids[i], res.value.data);
      }
    });
    if (map.size > 0) {
      setOverData(map);
      const first = Array.from(map.keys())[0];
      setSelectedOversInn(first);
    }
    setOverDataLoading(false);
    setTried((t) => ({ ...t, overData: true }));
  }, [matchId]);

  // For a live match the over data and win probability keep changing, but the
  // fetchers above run only once. Re-pull them on an interval so Run Rate / Worm /
  // Overs / Win Probability track the live feed. Only refreshes sections the user
  // has already opened, and never resets the innings the user has selected.
  const refreshLiveGraphs = useCallback(async () => {
    if (fetched.current.has('overData')) {
      const ids = [1, 2, 3, 4];
      const results = await Promise.allSettled(ids.map((id) => getInningsOverData(matchId, id)));
      const map = new Map<number, InningsOverData>();
      results.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value.success && res.value.data?.overs?.length) {
          map.set(ids[i], res.value.data);
        }
      });
      if (map.size > 0) setOverData(map);
    }
    if (fetched.current.has('winProb')) {
      const wp = await getWinProbHistory(matchId);
      if (wp.success && wp.data) setWinProbData(wp.data);
    }
  }, [matchId]);

  const fetchPartnerships = useCallback(async () => {
    if (fetched.current.has('partnerships')) return;
    fetched.current.add('partnerships');
    setPartnershipsLoading(true);
    const result = await getPartnershipData(matchId);
    if (result.success && result.data) {
      setPartnershipData(result.data);
      const first = result.data[0]?.inningsId;
      if (first) setSelectedPshipInn(first);
    }
    setPartnershipsLoading(false);
    setTried((t) => ({ ...t, partnerships: true }));
  }, [matchId]);

  const fetchMatchups = useCallback(async () => {
    if (fetched.current.has('matchups')) return;
    fetched.current.add('matchups');
    setMatchupsLoading(true);
    const result = await getMatchups(matchId);
    if (result.success && result.data) setMatchupsData(result.data);
    setMatchupsLoading(false);
    setTried((t) => ({ ...t, matchups: true }));
  }, [matchId]);

  const fetchVenue = useCallback(async () => {
    if (fetched.current.has('venue')) return;
    fetched.current.add('venue');
    setVenueLoading(true);
    const result = await getVenueForecast(matchId);
    if (result.success && result.data) setVenueData(result.data);
    setVenueLoading(false);
    setTried((t) => ({ ...t, venue: true }));
  }, [matchId]);

  const fetchAllPlayers = useCallback(async () => {
    if (fetched.current.has('allPlayers')) return;
    fetched.current.add('allPlayers');
    setAllPlayersLoading(true);
    const result = await getAllPlayersForecast(matchId);
    if (result.success && result.data) setAllPlayersData(result.data);
    setAllPlayersLoading(false);
    setTried((t) => ({ ...t, allPlayers: true }));
  }, [matchId]);

  // Eagerly fire every data fetch as soon as the Report tab mounts, in parallel.
  // The IntersectionObserver per section is now belt-and-suspenders only.
  useEffect(() => {
    fetchWinProb();
    fetchOverData();
    fetchPartnerships();
    fetchMatchups();
    fetchVenue();
    fetchAllPlayers();
  }, [fetchWinProb, fetchOverData, fetchPartnerships, fetchMatchups, fetchVenue, fetchAllPlayers]);

  // While the match is live, keep the over-based charts and win probability fresh.
  useEffect(() => {
    if (!live) return;
    const interval = setInterval(refreshLiveGraphs, 40000);
    return () => clearInterval(interval);
  }, [live, refreshLiveGraphs]);

  const fetchBallMap = useCallback(async (inningsId: number) => {
    const key = `ballMap-${inningsId}`;
    if (fetched.current.has(key)) return;
    fetched.current.add(key);
    setBallMapLoading((prev) => new Map(prev).set(inningsId, true));
    const result = await getBallMapData(matchId, inningsId);
    if (result.success && result.data) {
      setBallMapData((prev) => new Map(prev).set(inningsId, result.data!));
    }
    setBallMapLoading((prev) => {
      const next = new Map(prev);
      next.set(inningsId, false);
      return next;
    });
    setTried((t) => ({ ...t, ballMap: true }));
  }, [matchId]);

  useEffect(() => {
    if (fetched.current.has('ballMap-section-visible')) {
      fetchBallMap(selectedBallMapInn);
    }
  }, [selectedBallMapInn, fetchBallMap]);

  // Kick off every section's fetch in parallel on mount so users don't
  // pay a per-section round-trip as they scroll.
  useEffect(() => {
    fetched.current.add('ballMap-section-visible');
    fetchWinProb();
    fetchOverData();
    fetchPartnerships();
    fetchBallMap(selectedBallMapInn);
    fetchMatchups();
    fetchVenue();
    fetchAllPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // Jump to initialTab on mount
  useEffect(() => {
    if (!initialTab) return;
    const map: Record<string, SectionId> = {
      winProb: 'winProb', runRate: 'runRate', worm: 'worm',
      overs: 'overs', partnerships: 'partnerships', ballMap: 'ballMap',
    };
    const id = map[initialTab];
    if (!id) return;
    requestAnimationFrame(() => {
      sectionRefs.current.get(id)?.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  }, [initialTab]);

  const overInnings = Array.from(overData.entries()).map(([id, d]) => ({ inningsId: id, data: d }));
  // Colour priority: the report's own scraped colour first; fall back to our
  // team-identity map (India blue, England red, ...) only when the scrape used
  // its default placeholder (i.e. it had no real colour to give).
  const DEFAULT_WP_COLORS = new Set(['#e6a937', '#0588f0']);
  const reportOrMap = (scraped: string | undefined, name: string) => {
    if (scraped && !DEFAULT_WP_COLORS.has(scraped.toLowerCase())) return scraped;
    return teamColorFor(name, [name]) ?? scraped;
  };
  const winProbColored = winProbData
    ? {
      ...winProbData,
      team1Color: reportOrMap(winProbData.team1Color, winProbData.team1Name),
      team2Color: reportOrMap(winProbData.team2Color, winProbData.team2Name),
    }
    : null;
  const teamColorMap = winProbColored
    ? [
      { name: winProbColored.team1Name, color: winProbColored.team1Color },
      { name: winProbColored.team2Name, color: winProbColored.team2Color },
    ]
    : undefined;

  const overDataShown = !tried.overData || overDataLoading || overInnings.length > 0;
  const show: Record<SectionId, boolean> = {
    winProb: !!(!tried.winProb || winProbLoading || winProbData),
    runRate: overDataShown,
    worm: overDataShown,
    overs: overDataShown,
    partnerships: !!(!tried.partnerships || partnershipsLoading || (partnershipData && partnershipData.length > 0)),
    ballMap: !!(!tried.ballMap || (ballMapLoading.get(selectedBallMapInn) ?? false) || ballMapData.size > 0),
    matchups: !!(!tried.matchups || matchupsLoading || (matchupsData && matchupsData.cards.length > 0)),
    venue: !!(!tried.venue || venueLoading || venueData),
    players: !!(!tried.allPlayers || allPlayersLoading || (allPlayersData && allPlayersData.playersByRole.length > 0)),
  };
  const visibleSections = SECTIONS.filter((s) => show[s.id]);

  const jumpTo = (id: SectionId) =>
    sectionRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="max-w-6xl mx-auto">
      {visibleSections.length > 1 && (
        <div className="md:sticky md:top-4 z-30 mb-4 -mx-2 px-2 py-2 glass-header rounded-none md:rounded-xl">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {visibleSections.map((s) => (
              <button
                key={s.id}
                onClick={() => jumpTo(s.id)}
                className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        {(!tried.winProb || winProbLoading || winProbData) && (
          <GraphSection
            id="winProb"
            section={SECTIONS[0]}
            sectionRefs={sectionRefs}
            onFirstView={fetchWinProb}
            loading={!tried.winProb || winProbLoading}
            onShare={winProbColored ? () => setShareState({
              sectionLabel: SECTIONS[0].label,
              sectionSubtitle: SECTIONS[0].subtitle,
              chart: <WinProbabilityChart data={winProbColored} />,
            }) : undefined}
          >
            {winProbColored && <WinProbabilityChart data={winProbColored} />}
          </GraphSection>
        )}

        {(!tried.overData || overDataLoading || overInnings.length > 0) && (
          <GraphSection
            id="runRate"
            section={SECTIONS[1]}
            sectionRefs={sectionRefs}
            onFirstView={fetchOverData}
            loading={!tried.overData || overDataLoading}
            onShare={overInnings.length > 0 ? () => setShareState({
              sectionLabel: SECTIONS[1].label,
              sectionSubtitle: SECTIONS[1].subtitle,
              chart: <RunRateChart allInnings={overInnings} teamColorMap={teamColorMap} />,
            }) : undefined}
          >
            {overInnings.length > 0 && <RunRateChart allInnings={overInnings} teamColorMap={teamColorMap} />}
          </GraphSection>
        )}

        {(!tried.overData || overDataLoading || overInnings.length > 0) && (
          <GraphSection
            id="worm"
            section={SECTIONS[2]}
            sectionRefs={sectionRefs}
            onFirstView={fetchOverData}
            loading={!tried.overData || overDataLoading}
            onShare={overInnings.length > 0 ? () => setShareState({
              sectionLabel: SECTIONS[2].label,
              sectionSubtitle: SECTIONS[2].subtitle,
              chart: <WormChart allInnings={overInnings} teamColorMap={teamColorMap} />,
            }) : undefined}
          >
            {overInnings.length > 0 && <WormChart allInnings={overInnings} teamColorMap={teamColorMap} />}
          </GraphSection>
        )}

        {(!tried.overData || overDataLoading || overInnings.length > 0) && (
          <GraphSection
            id="overs"
            section={SECTIONS[3]}
            sectionRefs={sectionRefs}
            onFirstView={fetchOverData}
            loading={!tried.overData || overDataLoading}
            innings={overInnings.length > 0 ? overInnings.map((o) => ({
              id: o.inningsId,
              label: inningsLabel(o.inningsId, o.data.teamName),
            })) : undefined}
            selectedInnings={selectedOversInn}
            onInningsChange={setSelectedOversInn}
            onShare={overData.has(selectedOversInn) ? () => setShareState({
              sectionLabel: SECTIONS[3].label,
              sectionSubtitle: SECTIONS[3].subtitle,
              inningsLabel: inningsLabel(selectedOversInn, overData.get(selectedOversInn)?.teamName),
              chart: <OverByOverChart data={overData.get(selectedOversInn)!} />,
            }) : undefined}
          >
            {overData.has(selectedOversInn) && <OverByOverChart data={overData.get(selectedOversInn)!} />}
          </GraphSection>
        )}

        {(!tried.partnerships || partnershipsLoading || (partnershipData && partnershipData.length > 0)) && (
          <GraphSection
            id="partnerships"
            section={SECTIONS[4]}
            sectionRefs={sectionRefs}
            onFirstView={fetchPartnerships}
            loading={!tried.partnerships || partnershipsLoading}
            innings={partnershipData ? partnershipData.map((p) => ({
              id: p.inningsId,
              label: inningsLabel(p.inningsId, p.teamShortName || p.teamName),
            })) : undefined}
            selectedInnings={selectedPshipInn}
            onInningsChange={setSelectedPshipInn}
            onShare={partnershipData && partnershipData.find((p) => p.inningsId === selectedPshipInn) ? () => {
              const p = partnershipData.find((x) => x.inningsId === selectedPshipInn)!;
              setShareState({
                sectionLabel: SECTIONS[4].label,
                sectionSubtitle: SECTIONS[4].subtitle,
                inningsLabel: inningsLabel(selectedPshipInn, p.teamShortName || p.teamName),
                chart: <PartnershipsChart data={p} />,
              });
            } : undefined}
          >
            {partnershipData && partnershipData.find((p) => p.inningsId === selectedPshipInn) && (
              <PartnershipsChart data={partnershipData.find((p) => p.inningsId === selectedPshipInn)!} />
            )}
          </GraphSection>
        )}

        {(!tried.ballMap || (ballMapLoading.get(selectedBallMapInn) ?? false) || ballMapData.size > 0) && (
          <GraphSection
            id="ballMap"
            section={SECTIONS[5]}
            sectionRefs={sectionRefs}
            onFirstView={() => {
              fetched.current.add('ballMap-section-visible');
              fetchOverData();
              fetchBallMap(selectedBallMapInn);
            }}
            loading={!tried.ballMap || (ballMapLoading.get(selectedBallMapInn) ?? false)}
            innings={(() => {
              const fromOvers = overInnings.map((o) => ({
                id: o.inningsId,
                label: inningsLabel(o.inningsId, o.data.teamName),
              }));
              if (fromOvers.length > 0) return fromOvers;
              const fromPship = partnershipData?.map((p) => ({
                id: p.inningsId,
                label: inningsLabel(p.inningsId, p.teamShortName || p.teamName),
              }));
              if (fromPship && fromPship.length > 0) return fromPship;
              return [1, 2].map((id) => ({ id, label: inningsLabel(id) }));
            })()}
            selectedInnings={selectedBallMapInn}
            onInningsChange={setSelectedBallMapInn}
            onShare={ballMapData.has(selectedBallMapInn) ? () => {
              const teamName = overData.get(selectedBallMapInn)?.teamName
                ?? partnershipData?.find((p) => p.inningsId === selectedBallMapInn)?.teamShortName
                ?? partnershipData?.find((p) => p.inningsId === selectedBallMapInn)?.teamName;
              setShareState({
                sectionLabel: SECTIONS[5].label,
                sectionSubtitle: SECTIONS[5].subtitle,
                inningsLabel: inningsLabel(selectedBallMapInn, teamName),
                chart: <BallMap data={ballMapData.get(selectedBallMapInn)!} />,
              });
            } : undefined}
          >
            {ballMapData.has(selectedBallMapInn) && <BallMap data={ballMapData.get(selectedBallMapInn)!} />}
          </GraphSection>
        )}

        {(!tried.matchups || matchupsLoading || (matchupsData && matchupsData.cards.length > 0)) && (
          <GraphSection
            id="matchups"
            section={SECTIONS[6]}
            sectionRefs={sectionRefs}
            onFirstView={fetchMatchups}
            loading={!tried.matchups || matchupsLoading}
            skeleton={<MatchupsSkeleton />}
          >
            {matchupsData && matchupsData.cards.length > 0 && <MatchupsSection data={matchupsData} />}
          </GraphSection>
        )}

        {(!tried.venue || venueLoading || venueData) && (
          <GraphSection
            id="venue"
            section={SECTIONS[7]}
            sectionRefs={sectionRefs}
            onFirstView={fetchVenue}
            loading={!tried.venue || venueLoading}
            skeleton={<VenueSkeleton />}
          >
            {venueData && <VenueSection data={venueData} />}
          </GraphSection>
        )}

        {(!tried.allPlayers || allPlayersLoading || (allPlayersData && allPlayersData.playersByRole.length > 0)) && (
          <GraphSection
            id="players"
            section={SECTIONS[8]}
            sectionRefs={sectionRefs}
            onFirstView={fetchAllPlayers}
            loading={!tried.allPlayers || allPlayersLoading}
            skeleton={<AllPlayersSkeleton />}
          >
            {allPlayersData && allPlayersData.playersByRole.length > 0 && <AllPlayersSection data={allPlayersData} />}
          </GraphSection>
        )}
      </div>

      <GraphShareDialog
        open={shareState !== null}
        onOpenChange={(o) => { if (!o) setShareState(null); }}
        matchTitle={matchTitle}
        seriesName={seriesName}
        sectionLabel={shareState?.sectionLabel ?? ''}
        sectionSubtitle={shareState?.sectionSubtitle}
        inningsLabel={shareState?.inningsLabel}
        chart={shareState?.chart ?? null}
      />
    </div>
  );
}

function inningsLabel(id: number, teamName?: string): string {
  const ordinal = id === 1 ? '1st' : id === 2 ? '2nd' : id === 3 ? '3rd' : '4th';
  return teamName ? `${teamName} · ${ordinal}` : `${ordinal} innings`;
}

interface GraphSectionProps {
  id: SectionId;
  section: typeof SECTIONS[number];
  sectionRefs: React.MutableRefObject<Map<SectionId, HTMLElement>>;
  onFirstView: () => void;
  loading: boolean;
  children: ReactNode;
  innings?: { id: number; label: string }[];
  selectedInnings?: number;
  onInningsChange?: (id: number) => void;
  skeleton?: ReactNode;
  onShare?: () => void;
}

function GraphSection({
  id, section, sectionRefs, onFirstView, loading,
  children, innings, selectedInnings, onInningsChange, skeleton, onShare,
}: GraphSectionProps) {
  const localRef = useRef<HTMLElement>(null);
  const hasFired = useRef(false);

  useEffect(() => {
    if (localRef.current) {
      sectionRefs.current.set(id, localRef.current);
    }
    return () => {
      sectionRefs.current.delete(id);
    };
  }, [id, sectionRefs]);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    // Generous rootMargin so charts start fetching ~1 viewport ahead — by the time
    // the user scrolls them in, the data is already there and the reveal can play.
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasFired.current) {
            hasFired.current = true;
            onFirstView();
            obs.disconnect();
          }
        });
      },
      { rootMargin: '900px 0px 900px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [onFirstView]);

  // Subtle slide-up on scroll-in. No opacity drop so sections remain visible
  // even if ScrollTrigger doesn't fire (timing, tab switch, layout shifts).
  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        y: 22,
        duration: 0.5,
        ease: 'power3.out',
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={localRef}
      data-section={id}
      className="scroll-mt-24 py-10 md:py-14 border-b border-border/30 last:border-b-0"
    >
      <div className="mb-6 md:mb-8">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 md:h-9 w-48 md:w-64 rounded-md" />
            <Skeleton className="h-3 md:h-4 w-64 md:w-80 rounded-md" />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-xl md:text-3xl text-foreground tracking-tight">
                {section.label}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                {section.subtitle}
              </p>
            </div>
            {onShare && (
              <button
                onClick={onShare}
                className="shrink-0 h-9 w-9 rounded-xl bg-muted/50 hover:bg-muted border border-border flex items-center justify-center transition-colors"
                aria-label={`Share ${section.label}`}
                title={`Share ${section.label}`}
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-border mb-5 md:mb-6" />

      {innings && innings.length > 1 && onInningsChange && selectedInnings !== undefined && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {innings.map((inn) => (
            <button
              key={inn.id}
              onClick={() => onInningsChange(inn.id)}
              className={cn(
                'px-3 py-1 rounded-full text-[11px] md:text-xs font-medium transition-all duration-200 border',
                selectedInnings === inn.id
                  ? 'bg-primary/15 text-primary border-primary/40'
                  : 'text-muted-foreground border-border/50 hover:text-foreground hover:border-border'
              )}
            >
              {inn.label}
            </button>
          ))}
        </div>
      )}

      <div className="surface-card p-3 md:p-5 overflow-hidden">
        {loading ? (skeleton ?? <GraphsSkeleton />) : children}
      </div>
    </section>
  );
}

