import type { Metadata } from 'next';
import TeamClient from './team-client';
import JsonLd from '@/components/json-ld';
import { getTeamSchedule } from '@/app/actions';
import { buildTeamHref } from '@/lib/utils';
import { buildMetadata, absoluteUrl, SITE_NAME } from '@/lib/seo';

type Params = { teamId: string; slug: string };

function titleCase(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function teamName(teamId: string, slug: string): Promise<string> {
  try {
    const res = await getTeamSchedule(teamId, slug);
    if (res.data?.teamName) return res.data.teamName;
  } catch {
    // fall back to the slug below
  }
  return titleCase(slug);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { teamId, slug } = await params;
  const name = await teamName(teamId, slug);
  return buildMetadata({
    title: `${name} | Fixtures, Results & Schedule`,
    path: buildTeamHref(teamId, name) || `/team/${teamId}/${slug}`,
    description: `${name} cricket team: upcoming fixtures, live scores, recent results, and full schedule on ${SITE_NAME}.`,
  });
}

export default async function TeamPage({ params }: { params: Promise<Params> }) {
  const { teamId, slug } = await params;
  const name = await teamName(teamId, slug);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name,
    sport: 'Cricket',
    url: absoluteUrl(buildTeamHref(teamId, name) || `/team/${teamId}/${slug}`),
  };
  return (
    <>
      <JsonLd data={jsonLd} />
      <TeamClient />
    </>
  );
}
