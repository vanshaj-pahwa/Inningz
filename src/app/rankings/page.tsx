import type { Metadata } from 'next';
import RankingsClient from './rankings-client';
import SeoInternalLinks from '@/components/seo-internal-links';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'ICC Cricket Rankings',
  path: '/rankings',
  description:
    'Official ICC rankings for Test, ODI, and T20I: batting, bowling, all-rounder, and team rankings, updated regularly on Inningz.',
});

export default function RankingsPage() {
  return (
    <>
      <RankingsClient />
      {/* Team-first internal-link block: since rankings lists teams by
          rating, the team pages are the natural crawl targets, then match
          and news as cross-nav for domain-wide discoverability. */}
      <SeoInternalLinks sections={['teams', 'matches', 'news']} />
    </>
  );
}
