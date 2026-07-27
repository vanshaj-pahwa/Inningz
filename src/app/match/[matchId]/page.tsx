import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ScoreDisplay from '@/components/scraper';
import { Button } from '@/components/ui/button';
import JsonLd from '@/components/json-ld';
import { getScoreForMatchId } from '@/app/actions';
import { buildMatchHref } from '@/lib/utils';
import { buildMetadata, absoluteUrl, SITE_NAME } from '@/lib/seo';

type Params = { matchId: string };

// Split "England vs India, 1st T20I" into the two competing sides for schema.
function teamsFromTitle(title?: string): string[] {
  if (!title) return [];
  const head = title.split(',')[0];
  const parts = head.split(/\s+vs?\.?\s+/i).map((s) => s.trim()).filter(Boolean);
  return parts.length === 2 ? parts : [];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { matchId } = await params;
  try {
    const res = await getScoreForMatchId(matchId);
    const d = res.data;
    if (!res.success || !d) {
      return buildMetadata({
        title: 'Live Cricket Match',
        path: `/match/${matchId}`,
        description: `Follow this cricket match live on ${SITE_NAME} with ball-by-ball commentary and scorecard.`,
      });
    }
    const scoreLine = d.score ? d.score.replace(/\s+/g, ' ').trim() : '';
    const title = `${d.title}${d.status ? `, ${d.status}` : ''} | Live Score`;
    const description = [d.title, scoreLine, d.status, d.venue]
      .filter(Boolean)
      .join(' · ');
    return buildMetadata({
      title,
      path: buildMatchHref(matchId, d.title),
      description: `${description}. Ball-by-ball commentary, scorecard and live updates on ${SITE_NAME}.`,
      images: [`/match/${matchId}/opengraph-image`],
    });
  } catch {
    return buildMetadata({
      title: 'Live Cricket Match',
      path: `/match/${matchId}`,
    });
  }
}

export default async function MatchPage({ params }: { params: Promise<Params> }) {
  const { matchId } = await params;

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

  // Best-effort schema: rendered from a server scrape, degrades to nothing on
  // failure so the interactive client view still loads.
  let jsonLd: Record<string, unknown> | null = null;
  try {
    const res = await getScoreForMatchId(matchId);
    const d = res.data;
    if (res.success && d) {
      const teams = teamsFromTitle(d.title);
      const startDate = d.matchStartTimestamp ? new Date(d.matchStartTimestamp).toISOString() : undefined;
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: d.title,
        sport: 'Cricket',
        url: absoluteUrl(buildMatchHref(matchId, d.title)),
        ...(startDate ? { startDate } : {}),
        ...(d.status ? { description: d.status } : {}),
        ...(d.venue ? { location: { '@type': 'Place', name: d.venue } } : {}),
        ...(teams.length === 2
          ? { competitor: teams.map((name) => ({ '@type': 'SportsTeam', name })) }
          : {}),
        ...(d.seriesName
          ? { superEvent: { '@type': 'SportsEvent', name: d.seriesName } }
          : {}),
        organizer: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
      };
    }
  } catch {
    // Structured data is a nicety; never block the page on it.
  }

  return (
    <main className="min-h-screen pt-4">
      {jsonLd && <JsonLd data={jsonLd} />}
      <ScoreDisplay matchId={matchId} />
    </main>
  );
}
