'use client';

import ScoreDisplay from '@/components/scraper';
import { ThemeToggle } from '@/components/theme-toggle';
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
                <p className="text-lg font-semibold">Match ID not found.</p>
                <p className="text-muted-foreground">Could not load match details.</p>
                <Button asChild variant="outline" className="mt-4">
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
    <main className="container mx-auto p-1 md:p-4">
      <div className="flex justify-end mb-2 md:mb-4 px-1 md:px-0">
        <ThemeToggle />
      </div>
      <div className="w-full">
        <ScoreDisplay matchId={matchId} />
      </div>
    </main>
  );
}
