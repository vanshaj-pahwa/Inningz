'use client';

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { GraphsSkeleton } from './match-skeletons';
import { cn } from '@/lib/utils';
import {
  getPartnershipData,
  getBallMapData,
  getWinProbHistory,
  getInningsOverData,
} from '@/app/actions';
import type {
  PartnershipInnings,
  BallMapData,
  WinProbHistory,
  InningsOverData,
} from '@/app/actions';
import BallMap from './graphs/ball-map';
import WinProbabilityChart from './graphs/win-probability-chart';
import PartnershipsChart from './graphs/partnerships-chart';
import OverByOverChart from './over-by-over-chart';
import RunRateChart from './graphs/run-rate-chart';
import WormChart from './graphs/worm-chart';

type SectionId = 'winProb' | 'runRate' | 'worm' | 'overs' | 'partnerships' | 'ballMap';

const SECTIONS: { id: SectionId; num: string; label: string; subtitle: string }[] = [
  { id: 'winProb', num: '01', label: 'Win Probability', subtitle: 'How the match tilted, over by over.' },
  { id: 'runRate', num: '02', label: 'Run Rate', subtitle: 'Scoring pace over the innings.' },
  { id: 'worm', num: '03', label: 'Worm', subtitle: 'Cumulative runs side-by-side.' },
  { id: 'overs', num: '04', label: 'Over by Over', subtitle: 'Runs and wickets in each over.' },
  { id: 'partnerships', num: '05', label: 'Partnerships', subtitle: 'Who built it together.' },
  { id: 'ballMap', num: '06', label: 'Ball Map', subtitle: 'Every shot, every dismissal.' },
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
      // default innings = first available
      const first = Array.from(map.keys())[0];
      setSelectedOversInn(first);
    }
    setOverDataLoading(false);
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
  }, [matchId]);

  // Fetch ball map when its selected innings changes (after first section load)
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
      {/* Sections */}
      <div>
        <GraphSection
          id="winProb"
          section={SECTIONS[0]}
          sectionRefs={sectionRefs}
          onFirstView={fetchWinProb}
          loading={winProbLoading}
        >
          {winProbData ? (
            <WinProbabilityChart data={winProbData} />
          ) : (
            <EmptyState message="Win probability isn't tracked for this match." />
          )}
        </GraphSection>

        <GraphSection
          id="runRate"
          section={SECTIONS[1]}
          sectionRefs={sectionRefs}
          onFirstView={fetchOverData}
          loading={overDataLoading}
        >
          {overInnings.length > 0 ? (
            <RunRateChart allInnings={overInnings} teamColorMap={teamColorMap} />
          ) : (
            <EmptyState message="No run rate data yet." />
          )}
        </GraphSection>

        <GraphSection
          id="worm"
          section={SECTIONS[2]}
          sectionRefs={sectionRefs}
          onFirstView={fetchOverData}
          loading={overDataLoading}
        >
          {overInnings.length > 0 ? (
            <WormChart allInnings={overInnings} teamColorMap={teamColorMap} />
          ) : (
            <EmptyState message="No worm data yet." />
          )}
        </GraphSection>

        <GraphSection
          id="overs"
          section={SECTIONS[3]}
          sectionRefs={sectionRefs}
          onFirstView={fetchOverData}
          loading={overDataLoading}
          innings={overInnings.length > 0 ? overInnings.map((o) => ({
            id: o.inningsId,
            label: inningsLabel(o.inningsId, o.data.teamName),
          })) : undefined}
          selectedInnings={selectedOversInn}
          onInningsChange={setSelectedOversInn}
        >
          {overData.has(selectedOversInn) ? (
            <OverByOverChart data={overData.get(selectedOversInn)!} />
          ) : (
            <EmptyState message="No over data available for this innings." />
          )}
        </GraphSection>

        <GraphSection
          id="partnerships"
          section={SECTIONS[4]}
          sectionRefs={sectionRefs}
          onFirstView={fetchPartnerships}
          loading={partnershipsLoading}
          innings={partnershipData ? partnershipData.map((p) => ({
            id: p.inningsId,
            label: inningsLabel(p.inningsId, p.teamShortName || p.teamName),
          })) : undefined}
          selectedInnings={selectedPshipInn}
          onInningsChange={setSelectedPshipInn}
        >
          {partnershipData && partnershipData.find((p) => p.inningsId === selectedPshipInn) ? (
            <PartnershipsChart data={partnershipData.find((p) => p.inningsId === selectedPshipInn)!} />
          ) : (
            <EmptyState message="No partnership data for this innings." />
          )}
        </GraphSection>

        <GraphSection
          id="ballMap"
          section={SECTIONS[5]}
          sectionRefs={sectionRefs}
          onFirstView={() => {
            fetched.current.add('ballMap-section-visible');
            // Ensure we know how many innings exist before offering selectors
            fetchOverData();
            fetchBallMap(selectedBallMapInn);
          }}
          loading={ballMapLoading.get(selectedBallMapInn) ?? false}
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
          {ballMapData.has(selectedBallMapInn) ? (
            <BallMap data={ballMapData.get(selectedBallMapInn)!} />
          ) : (
            <EmptyState message="No ball map for this innings." />
          )}
        </GraphSection>
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
}

function GraphSection({
  id, section, sectionRefs, onFirstView, loading,
  children, innings, selectedInnings, onInningsChange,
}: GraphSectionProps) {
  const localRef = useRef<HTMLElement>(null);
  const hasFired = useRef(false);

  // Register ref
  useEffect(() => {
    if (localRef.current) {
      sectionRefs.current.set(id, localRef.current);
    }
    return () => {
      sectionRefs.current.delete(id);
    };
  }, [id, sectionRefs]);

  // Fire onFirstView when section enters viewport (with generous root margin)
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
      {/* Section header */}
      <div className="mb-6 md:mb-8 flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-3 md:gap-5 min-w-0">
          <span
            className="font-display text-3xl md:text-5xl text-muted-foreground/25 tabular-nums shrink-0"
            aria-hidden
          >
            {section.num}
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl md:text-3xl text-foreground tracking-tight truncate">
              {section.label}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 truncate">
              {section.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Thin accent rule */}
      <div className="h-px bg-gradient-to-r from-cyan-500/40 via-border/50 to-transparent mb-5 md:mb-6" />

      {/* Innings selector (if applicable) */}
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

      {/* Content */}
      <div className="glass-card p-3 md:p-5 overflow-hidden">
        {loading ? <GraphsSkeleton /> : children}
      </div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-2">
      <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
        <svg className="w-5 h-5 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
