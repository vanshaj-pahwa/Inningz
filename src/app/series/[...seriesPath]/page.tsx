import type { Metadata } from 'next';
import SeriesClient from './series-client';
import JsonLd from '@/components/json-ld';
import { buildMetadata, absoluteUrl, SITE_NAME } from '@/lib/seo';

type Params = { seriesPath: string[] };

// The slug segment carries the series name reliably (e.g.
// "india-tour-of-england-2026"); series-match scrapes don't echo it back, so we
// title-case the slug rather than pay for a scrape just to name the page.
function seriesNameFromPath(seriesPath: string[]): string {
  const slug = seriesPath.slice(1).join('-');
  if (!slug) return 'Cricket Series';
  const name = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  return name || 'Cricket Series';
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { seriesPath } = await params;
  const seriesId = seriesPath.join('/');
  const name = seriesNameFromPath(seriesPath);
  return buildMetadata({
    title: `${name} | Schedule, Scores & Points Table`,
    path: `/series/${seriesId}`,
    description: `${name}: full schedule, live scores, results, points table, and series stats on ${SITE_NAME}.`,
  });
}

export default async function SeriesPage({ params }: { params: Promise<Params> }) {
  const { seriesPath } = await params;
  const seriesId = seriesPath.join('/');
  const name = seriesNameFromPath(seriesPath);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name,
    sport: 'Cricket',
    url: absoluteUrl(`/series/${seriesId}`),
    organizer: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
  };
  return (
    <>
      <JsonLd data={jsonLd} />
      <SeriesClient />
    </>
  );
}
