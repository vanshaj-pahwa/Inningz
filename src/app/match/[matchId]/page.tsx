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
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="text-center">
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
    <main className="min-h-screen py-4">
      <ScoreDisplay matchId={matchId} />
    </main>
  );
}
