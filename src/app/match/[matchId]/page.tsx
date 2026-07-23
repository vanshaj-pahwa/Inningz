'use client';

import ScoreDisplay from '@/components/scraper';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function MatchPage() {
  const params = useParams();
  const matchId = Array.isArray(params.matchId) ? params.matchId[0] : params.matchId;

  if (!matchId) {
    return (
      <main className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-20 border-b border-border/40 bg-background/85 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link href="/" className="font-display text-base tracking-tight">Inningz</Link>
            <div className="w-12" />
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <p className="text-lg font-display">Match ID not found.</p>
          <p className="text-muted-foreground text-sm mt-1">Could not load match details.</p>
          <Button asChild variant="outline" className="mt-6 rounded-xl">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Matches
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-4">
      <ScoreDisplay matchId={matchId} />
    </main>
  );
}
