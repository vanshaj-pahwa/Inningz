import type { Metadata } from 'next';
import RankingsClient from './rankings-client';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'ICC Cricket Rankings',
  path: '/rankings',
  description:
    'Official ICC rankings for Test, ODI, and T20I: batting, bowling, all-rounder, and team rankings, updated regularly on Inningz.',
});

export default function RankingsPage() {
  return <RankingsClient />;
}
