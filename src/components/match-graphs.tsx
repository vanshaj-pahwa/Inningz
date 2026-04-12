'use client';

import { useState, useEffect, useRef } from 'react';
import { LoaderCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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

type SubTab = 'ballMap' | 'winProb' | 'partnerships' | 'overs' | 'runRate' | 'worm';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'overs', label: 'Overs' },
  { key: 'runRate', label: 'Run Rate' },
  { key: 'winProb', label: 'Win Probability' },
  { key: 'partnerships', label: 'Partnerships' },
  { key: 'worm', label: 'Worm' },
  { key: 'ballMap', label: 'Ball Map' },
];

interface MatchGraphsProps {
  matchId: string;
}

export default function MatchGraphs({ matchId }: MatchGraphsProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('overs');
  const [selectedInnings, setSelectedInnings] = useState(1);
  const [loading, setLoading] = useState(false);
  const [overDataLoading, setOverDataLoading] = useState(true);

  const [partnershipData, setPartnershipData] = useState<PartnershipInnings[] | null>(null);
  const [ballMapData, setBallMapData] = useState<Map<number, BallMapData>>(new Map());
  const [winProbData, setWinProbData] = useState<WinProbHistory | null>(null);
  const [overData, setOverData] = useState<Map<number, InningsOverData>>(new Map());
  const fetchedRef = useRef<Set<string>>(new Set());

  // Fetch over data eagerly on mount (shared by overs, runRate, worm tabs)
  useEffect(() => {
    if (fetchedRef.current.has('overData')) return;
    fetchedRef.current.add('overData');
    const fetchOvers = async () => {
      setOverDataLoading(true);
      const ids = [1, 2, 3, 4];
      const results = await Promise.allSettled(ids.map(id => getInningsOverData(matchId, id)));
      const map = new Map<number, InningsOverData>();
      results.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value.success && res.value.data?.overs?.length) {
          map.set(ids[i], res.value.data);
        }
      });
      if (map.size > 0) setOverData(map);
      setOverDataLoading(false);
    };
    fetchOvers();
  }, [matchId]);

  useEffect(() => {
    const fetchTabData = async () => {
      if (activeTab === 'ballMap') {
        const key = `ballMap-${selectedInnings}`;
        if (fetchedRef.current.has(key)) return;
        fetchedRef.current.add(key);
        setLoading(true);
        const result = await getBallMapData(matchId, selectedInnings);
        if (result.success && result.data) {
          setBallMapData(prev => new Map(prev).set(selectedInnings, result.data!));
        }
        setLoading(false);
      } else if (activeTab === 'winProb') {
        if (fetchedRef.current.has('winProb')) return;
        fetchedRef.current.add('winProb');
        setLoading(true);
        const result = await getWinProbHistory(matchId);
        if (result.success && result.data) {
          setWinProbData(result.data);
        }
        setLoading(false);
      } else if (activeTab === 'partnerships') {
        if (fetchedRef.current.has('partnerships')) return;
        fetchedRef.current.add('partnerships');
        setLoading(true);
        const result = await getPartnershipData(matchId);
        if (result.success && result.data) {
          setPartnershipData(result.data);
        }
        setLoading(false);
      }
    };
    fetchTabData();
  }, [activeTab, selectedInnings, matchId]);

  const overInnings = Array.from(overData.entries()).map(([id, d]) => ({
    inningsId: id,
    data: d,
  }));

  const needsInningsSelector = activeTab === 'ballMap' || activeTab === 'overs' || activeTab === 'partnerships';

  return (
    <div className="space-y-3">
      {/* Sub-tab navigation */}
      <GraphTabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content card */}
      <div className="glass-card overflow-hidden">
        {/* Innings selector */}
        {needsInningsSelector && (
          <div className="flex gap-1.5 px-4 pt-4 pb-1">
            {(activeTab === 'partnerships' && partnershipData
              ? partnershipData.map(p => p.inningsId)
              : activeTab === 'ballMap' ? [1, 2, 3, 4] : Array.from(overData.keys())
            ).map(id => {
              const ordinal = id === 1 ? '1st' : id === 2 ? '2nd' : id === 3 ? '3rd' : '4th';
              // Try to get team name from partnership data or over data
              const pInnings = partnershipData?.find(p => p.inningsId === id);
              const oInnings = overData.get(id);
              const teamName = pInnings?.teamShortName || pInnings?.teamName || oInnings?.teamName || '';
              const label = teamName ? `${teamName} (${ordinal} Inn)` : `${ordinal} Inn`;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedInnings(id)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200',
                    selectedInnings === id
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <div className="p-4 md:p-5">
          {(() => {
            const isOverTab = activeTab === 'overs' || activeTab === 'runRate' || activeTab === 'worm';
            const showLoader = loading || (isOverTab && overDataLoading);

            if (showLoader) {
              return (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <LoaderCircle className="w-7 h-7 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground tracking-wide">Loading data...</span>
                </div>
              );
            }

            return (
              <>
                {activeTab === 'ballMap' && (
                  ballMapData.has(selectedInnings) ? (
                    <BallMap data={ballMapData.get(selectedInnings)!} />
                  ) : (
                    <EmptyState message="No ball map data available for this innings" />
                  )
                )}

                {activeTab === 'winProb' && (
                  winProbData ? (
                    <WinProbabilityChart data={winProbData} />
                  ) : (
                    <EmptyState message="No win probability data available" />
                  )
                )}

                {activeTab === 'partnerships' && (
                  partnershipData && partnershipData.find(p => p.inningsId === selectedInnings) ? (
                    <PartnershipsChart data={partnershipData.find(p => p.inningsId === selectedInnings)!} />
                  ) : (
                    <EmptyState message="No partnership data available" />
                  )
                )}

                {activeTab === 'overs' && (
                  overData.has(selectedInnings) ? (
                    <OverByOverChart data={overData.get(selectedInnings)!} />
                  ) : (
                    <EmptyState message="No over data available for this innings" />
                  )
                )}

                {activeTab === 'runRate' && (
                  overInnings.length > 0 ? (
                    <RunRateChart allInnings={overInnings} />
                  ) : (
                    <EmptyState message="No run rate data available" />
                  )
                )}

                {activeTab === 'worm' && (
                  overInnings.length > 0 ? (
                    <WormChart allInnings={overInnings} />
                  ) : (
                    <EmptyState message="No worm data available" />
                  )
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function GraphTabNav({ activeTab, onTabChange }: { activeTab: SubTab; onTabChange: (tab: SubTab) => void }) {
  const activeIdx = SUB_TABS.findIndex(t => t.key === activeTab);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return;
    const activeEl = container.children[activeIdx] as HTMLElement | undefined;
    if (activeEl) {
      const containerRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      if (elRect.left < containerRect.left || elRect.right > containerRect.right) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeIdx]);

  return (
    <div className="flex items-center gap-0">
      {/* Left arrow */}
      <button
        onClick={() => { if (activeIdx > 0) onTabChange(SUB_TABS[activeIdx - 1].key); }}
        disabled={activeIdx === 0}
        className={cn(
          'shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all',
          activeIdx === 0
            ? 'text-muted-foreground/20 cursor-default'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-90'
        )}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Tabs - naturally sized, hidden scrollbar */}
      <div
        ref={tabsRef}
        className="flex-1 flex gap-0.5 p-0.5 bg-muted/40 rounded-xl overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => { if (activeIdx < SUB_TABS.length - 1) onTabChange(SUB_TABS[activeIdx + 1].key); }}
        disabled={activeIdx === SUB_TABS.length - 1}
        className={cn(
          'shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all',
          activeIdx === SUB_TABS.length - 1
            ? 'text-muted-foreground/20 cursor-default'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-90'
        )}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
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
