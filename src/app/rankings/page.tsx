'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getICCRankings, getPlayerProfile } from '@/app/actions';
import type { RankingsData, RankingEntry, PlayerProfile } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ThemeToggle } from '@/components/theme-toggle';
import PlayerProfileDisplay from '@/components/player-profile';
import { ArrowLeft } from 'lucide-react';

type Format = 'test' | 'odi' | 't20';
type Category = 'batting' | 'bowling' | 'all-rounder';

const formats: { value: Format; label: string }[] = [
  { value: 'test', label: 'Test' },
  { value: 'odi', label: 'ODI' },
  { value: 't20', label: 'T20' },
];

const categories: { value: Category; label: string }[] = [
  { value: 'batting', label: 'Batting' },
  { value: 'bowling', label: 'Bowling' },
  { value: 'all-rounder', label: 'All-Rounder' },
];

export default function RankingsPage() {
  const router = useRouter();
  const [format, setFormat] = useState<Format>('test');
  const [category, setCategory] = useState<Category>('batting');
  const [data, setData] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Player profile dialog
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PlayerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getICCRankings(format, category);
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch rankings');
      }
    } catch {
      setError('Failed to fetch rankings');
    } finally {
      setLoading(false);
    }
  }, [format, category]);

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
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full gradient-border">
        <div className="bg-background/90 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between h-14 md:h-16">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl h-9 w-9"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Link href="/">
                  <h1 className="text-xl md:text-2xl font-display tracking-tight">
                    <span className="text-primary">Inningz</span>
                  </h1>
                </Link>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Page Title + Tabs */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-4">
        <h2 className="text-2xl md:text-4xl font-display tracking-tight mb-1">ICC Rankings</h2>
        <p className="text-sm text-muted-foreground mb-5">Current ICC player rankings</p>

        {/* Format Tabs (pill style) */}
        <nav className="flex items-center gap-1 tab-container w-fit mb-4">
          {formats.map((f) => (
            <button
              key={f.value}
              onClick={() => setFormat(f.value)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${format === f.value
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </nav>

        {/* Category Tabs (underline style, like series page) */}
        <div className="flex gap-1 border-b border-border -mb-px">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`
                px-4 py-2.5 text-sm font-medium transition-colors border-b-2
                ${category === c.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {c.label}
            </button>
          ))}
        </div>
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

        {!loading && !error && data && data.entries.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <p className="text-lg font-display text-muted-foreground">No rankings data available</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different format or category</p>
          </div>
        )}

        {!loading && !error && data && data.entries.length > 0 && (
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
                {/* Rank */}
                <span className={`w-6 md:w-8 text-center font-display text-sm md:text-base ${i < 3 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  {entry.rank}
                </span>

                {/* Player Image */}
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                  {entry.imageUrl ? (
                    <Image
                      src={entry.imageUrl}
                      alt={entry.playerName}
                      width={40}
                      height={40}
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
