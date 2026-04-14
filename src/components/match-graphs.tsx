'use client';

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { GraphsSkeleton, MatchupsSkeleton, VenueSkeleton, AllPlayersSkeleton } from './match-skeletons';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
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
}

export default function MatchGraphs({ matchId, initialTab }: MatchGraphsProps) {
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
  const teamColorMap = winProbData
    ? [
      { name: winProbData.team1Name, color: winProbData.team1Color },
      { name: winProbData.team2Name, color: winProbData.team2Color },
    ]
    : undefined;

  return (
    <div className="max-w-6xl mx-auto">
      <div>
        {(!tried.winProb || winProbLoading || winProbData) && (
          <GraphSection
            id="winProb"
            section={SECTIONS[0]}
            sectionRefs={sectionRefs}
            onFirstView={fetchWinProb}
            loading={!tried.winProb || winProbLoading}
          >
            {winProbData && <WinProbabilityChart data={winProbData} />}
          </GraphSection>
        )}

        {(!tried.overData || overDataLoading || overInnings.length > 0) && (
          <GraphSection
            id="runRate"
            section={SECTIONS[1]}
            sectionRefs={sectionRefs}
            onFirstView={fetchOverData}
            loading={!tried.overData || overDataLoading}
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
}

function GraphSection({
  id, section, sectionRefs, onFirstView, loading,
  children, innings, selectedInnings, onInningsChange, skeleton,
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
      { rootMargin: '300px 0px 300px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [onFirstView]);

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
          <>
            <h2 className="font-display text-xl md:text-3xl text-foreground tracking-tight">
              {section.label}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {section.subtitle}
            </p>
          </>
        )}
      </div>

      <div className="h-px bg-gradient-to-r from-cyan-500/40 via-border/50 to-transparent mb-5 md:mb-6" />

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

      <div className="glass-card p-3 md:p-5 overflow-hidden">
        {loading ? (skeleton ?? <GraphsSkeleton />) : children}
      </div>
    </section>
  );
}

