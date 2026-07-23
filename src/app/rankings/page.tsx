'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getICCRankings, getICCTeamRankings, getPlayerProfile } from '@/app/actions';
import type { RankingsData, RankingEntry, PlayerProfile, TeamRankingsData } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ThemeToggle } from '@/components/theme-toggle';
import PlayerProfileDisplay from '@/components/player-profile';
import { ArrowLeft, ArrowUp, ArrowDown, Minus } from 'lucide-react';

type Format = 'test' | 'odi' | 't20';
type Category = 'batting' | 'bowling' | 'all-rounder' | 'teams';

const formats: { value: Format; label: string }[] = [
  { value: 'test', label: 'Test' },
  { value: 'odi', label: 'ODI' },
  { value: 't20', label: 'T20' },
];

const categories: { value: Category; label: string }[] = [
  { value: 'batting', label: 'Batting' },
  { value: 'bowling', label: 'Bowling' },
  { value: 'all-rounder', label: 'All-Rounder' },
  { value: 'teams', label: 'Teams' },
];

// Movement is computed against a snapshot from the user's previous visit
// (stored in localStorage). "new" means the player wasn't in the last snapshot;
// a numeric delta means their rank moved by that many places.
type RankMovement = { kind: 'up' | 'down'; delta: number } | { kind: 'same' } | { kind: 'new' };

const SNAPSHOT_PREFIX = 'inningz:rankings:snapshot:';

function loadSnapshot(key: string): Map<string, number> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_PREFIX + key);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as { ranks: Record<string, number> };
    return new Map(Object.entries(parsed.ranks || {}));
  } catch { return new Map(); }
}

function saveSnapshot(key: string, ranks: Map<string, number>) {
  if (typeof window === 'undefined') return;
  try {
    const obj = Object.fromEntries(ranks);
    window.localStorage.setItem(SNAPSHOT_PREFIX + key, JSON.stringify({ ranks: obj, ts: Date.now() }));
  } catch { /* storage blocked */ }
}

export default function RankingsPage() {
  const router = useRouter();
  const [format, setFormat] = useState<Format>('test');
  const [category, setCategory] = useState<Category>('batting');
  const [data, setData] = useState<RankingsData | null>(null);
  const [teamsData, setTeamsData] = useState<TeamRankingsData | null>(null);
  const [movements, setMovements] = useState<Map<string, RankMovement>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isTeams = category === 'teams';

  // Player profile dialog
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMovements(new Map());
    try {
      if (isTeams) {
        setData(null);
        const result = await getICCTeamRankings(format);
        if (result.success && result.data) {
          setTeamsData(result.data);
          // Snapshot movement for teams by teamId.
          const key = `teams:${format}`;
          const previous = loadSnapshot(key);
          const nextMovements = new Map<string, RankMovement>();
          const nextRanks = new Map<string, number>();
          for (const entry of result.data.entries) {
            const rankNum = Number(entry.rank);
            if (!Number.isFinite(rankNum)) continue;
            nextRanks.set(entry.teamId, rankNum);
            const prevRank = previous.get(entry.teamId);
            if (prevRank === undefined) nextMovements.set(entry.teamId, { kind: 'new' });
            else if (prevRank === rankNum) nextMovements.set(entry.teamId, { kind: 'same' });
            else if (prevRank > rankNum) nextMovements.set(entry.teamId, { kind: 'up', delta: prevRank - rankNum });
            else nextMovements.set(entry.teamId, { kind: 'down', delta: rankNum - prevRank });
          }
          setMovements(nextMovements);
          saveSnapshot(key, nextRanks);
        } else {
          setError(result.error || 'Failed to fetch team rankings');
        }
      } else {
        setTeamsData(null);
        const result = await getICCRankings(format, category as 'batting' | 'bowling' | 'all-rounder');
        if (result.success && result.data) {
          setData(result.data);
          const key = `${format}:${category}`;
          const previous = loadSnapshot(key);
          const nextMovements = new Map<string, RankMovement>();
          const nextRanks = new Map<string, number>();
          for (const entry of result.data.entries) {
            const rankNum = Number(entry.rank);
            const id = entry.profileId || entry.playerName;
            if (!Number.isFinite(rankNum)) continue;
            nextRanks.set(id, rankNum);
            const prevRank = previous.get(id);
            if (prevRank === undefined) nextMovements.set(id, { kind: 'new' });
            else if (prevRank === rankNum) nextMovements.set(id, { kind: 'same' });
            else if (prevRank > rankNum) nextMovements.set(id, { kind: 'up', delta: prevRank - rankNum });
            else nextMovements.set(id, { kind: 'down', delta: rankNum - prevRank });
          }
          setMovements(nextMovements);
          saveSnapshot(key, nextRanks);
        } else {
          setError(result.error || 'Failed to fetch rankings');
        }
      }
    } catch {
      setError('Failed to fetch rankings');
    } finally {
      setLoading(false);
    }
  }, [format, category, isTeams]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  // Fetch player profile when dialog opens
  useEffect(() => {
    if (!selectedProfileId) return;
    setProfileLoading(true);
    setSelectedProfile(null);
    getPlayerProfile(selectedProfileId, selectedPlayerName || undefined)
      .then((result) => {
        if (result.success && result.data) {
          setSelectedProfile(result.data);
        }
      })
      .finally(() => setProfileLoading(false));
  }, [selectedProfileId, selectedPlayerName]);

  const handlePlayerClick = (entry: RankingEntry) => {
    if (entry.profileId) {
      setSelectedProfileId(entry.profileId);
      setSelectedPlayerName(entry.playerName);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Sticky Header — matches the home/series glass-nav treatment so the
          navbar background is consistent app-wide. */}
      <header className="sticky top-0 z-50 w-full glass-nav">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-14 md:h-16">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-9 w-9"
                onClick={() => router.back()}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Link href="/" aria-label="Inningz home">
                <Image
                  src="/logo-full-transparent.png"
                  alt="Inningz"
                  width={400}
                  height={120}
                  priority
                  className="hidden dark:block h-9 md:h-11 w-auto"
                />
                <Image
                  src="/logo-full-dark.png"
                  alt="Inningz"
                  width={400}
                  height={120}
                  priority
                  className="block dark:hidden h-9 md:h-11 w-auto"
                />
              </Link>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Page Title + Tabs */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-4">
        <h2 className="text-2xl md:text-4xl font-display tracking-tight mb-1">ICC Rankings</h2>
        <p className="text-sm text-muted-foreground mb-5">Current ICC {isTeams ? 'team' : 'player'} rankings</p>

        {/* Format tabs — segmented pill style (previous look) */}
        <nav className="flex items-center gap-1 tab-container w-fit max-w-full overflow-x-auto no-scrollbar mb-3">
          {formats.map((f) => (
            <button
              key={f.value}
              onClick={() => setFormat(f.value)}
              aria-current={format === f.value ? 'page' : undefined}
              className={`shrink-0 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap ${
                format === f.value
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </nav>

        {/* Category tabs — same treatment */}
        <nav className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {categories.map((c) => {
            const active = category === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap ${
                  active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-muted/30 animate-pulse"
              >
                <div className="w-6 md:w-8 h-4 bg-muted rounded" />
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="w-32 h-3.5 bg-muted rounded" />
                  <div className="w-16 h-2.5 bg-muted rounded" />
                </div>
                <div className="w-12 h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <p className="text-lg font-display text-muted-foreground mb-3">Unable to fetch rankings</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchRankings} variant="outline" className="rounded-xl">
              Try Again
            </Button>
          </div>
        )}

        {!loading && !error && !isTeams && data && data.entries.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <p className="text-lg font-display text-muted-foreground">No rankings data available</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different format or category</p>
          </div>
        )}

        {!loading && !error && isTeams && teamsData && teamsData.entries.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <p className="text-lg font-display text-muted-foreground">No team rankings data available</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different format</p>
          </div>
        )}

        {!loading && !error && isTeams && teamsData && teamsData.entries.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span className="w-8 md:w-10 text-center">#</span>
              <span className="w-8 md:w-10" />
              <span className="flex-1">Team</span>
              <span className="w-14 md:w-20 text-right">Rating</span>
              <span className="hidden sm:inline w-16 md:w-20 text-right">Points</span>
            </div>
            {teamsData.entries.map((entry, i) => (
              <div
                key={entry.teamId}
                className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl transition-all ${
                  i < 3 ? 'bg-primary/5 dark:bg-primary/10' : i % 2 === 0 ? 'bg-muted/20' : ''
                }`}
              >
                <div className="w-8 md:w-10 flex flex-col items-center">
                  <span className={`font-display text-sm md:text-base ${i < 3 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                    {entry.rank}
                  </span>
                  <MovementBadge movement={movements.get(entry.teamId)} />
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                  {entry.imageUrl ? (
                    <Image
                      src={entry.imageUrl}
                      alt={entry.teamName}
                      width={72}
                      height={54}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground font-bold">{entry.teamName.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm md:text-base font-medium truncate ${i < 3 ? 'text-foreground' : ''}`}>
                    {entry.teamName}
                  </p>
                  {entry.matches && (
                    <p className="text-[11px] md:text-xs text-muted-foreground">Matches: {entry.matches}</p>
                  )}
                </div>
                <span className={`w-14 md:w-20 text-right font-display text-sm md:text-base tabular-nums ${i < 3 ? 'text-primary font-bold' : 'font-semibold'}`}>
                  {entry.rating}
                </span>
                <span className="hidden sm:inline w-16 md:w-20 text-right font-display text-sm md:text-base tabular-nums text-muted-foreground">
                  {entry.points}
                </span>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && !isTeams && data && data.entries.length > 0 && (
          <div className="space-y-1">
            {/* Table Header */}
            <div className="flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span className="w-6 md:w-8 text-center">#</span>
              <span className="w-8 md:w-10" /> {/* Avatar space */}
              <span className="flex-1">Player</span>
              <span className="w-14 md:w-20 text-right">Rating</span>
            </div>

            {/* Ranking Rows */}
            {data.entries.map((entry, i) => (
              <div
                key={`${entry.rank}-${entry.playerName}`}
                onClick={() => handlePlayerClick(entry)}
                className={`
                  flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl transition-all
                  ${entry.profileId ? 'cursor-pointer hover:bg-muted/50' : ''}
                  ${i < 3 ? 'bg-primary/5 dark:bg-primary/10' : i % 2 === 0 ? 'bg-muted/20' : ''}
                `}
              >
                {/* Rank + movement vs last visit */}
                <div className="w-8 md:w-10 flex flex-col items-center">
                  <span className={`font-display text-sm md:text-base ${i < 3 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                    {entry.rank}
                  </span>
                  <MovementBadge movement={movements.get(entry.profileId || entry.playerName)} />
                </div>

                {/* Player Image */}
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                  {entry.imageUrl ? (
                    <Image
                      src={entry.imageUrl}
                      alt={entry.playerName}
                      width={225}
                      height={225}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-bold">
                      {entry.playerName.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm md:text-base font-medium truncate ${i < 3 ? 'text-foreground' : ''}`}>
                    {entry.playerName}
                  </p>
                  {entry.country && (
                    <p className="text-[11px] md:text-xs text-muted-foreground">{entry.country}</p>
                  )}
                </div>

                {/* Rating */}
                <span className={`w-14 md:w-20 text-right font-display text-sm md:text-base tabular-nums ${i < 3 ? 'text-primary font-bold' : 'font-semibold'}`}>
                  {entry.rating}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Player Profile Dialog */}
      <Dialog
        open={!!selectedProfileId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProfileId(null);
            setSelectedPlayerName(null);
            setSelectedProfile(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
          <VisuallyHidden><DialogTitle>Player Profile</DialogTitle></VisuallyHidden>
          {profileLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
          {selectedProfile && <PlayerProfileDisplay profile={selectedProfile} />}
          {!profileLoading && !selectedProfile && selectedProfileId && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              Failed to load player profile
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MovementBadge({ movement }: { movement: RankMovement | undefined }) {
  if (!movement) return null;
  if (movement.kind === 'new') return null;
  if (movement.kind === 'same') {
    return (
      <span className="inline-flex items-center text-[10px] text-muted-foreground/60 leading-none mt-0.5" title="Same rank as your last visit">
        <Minus className="w-2.5 h-2.5" />
      </span>
    );
  }
  const color = movement.kind === 'up' ? 'text-emerald-500' : 'text-red-500';
  const Arrow = movement.kind === 'up' ? ArrowUp : ArrowDown;
  const label = movement.kind === 'up'
    ? `Up ${movement.delta} since your last visit`
    : `Down ${movement.delta} since your last visit`;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold leading-none mt-0.5 tabular-nums ${color}`} title={label}>
      <Arrow className="w-2.5 h-2.5" />
      {movement.delta}
    </span>
  );
}
