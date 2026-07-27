import Link from 'next/link';
import {
  getLiveMatches, getRecentMatches, getUpcomingMatches,
  getICCTeamRankings, getCricketNews,
} from '@/app/actions';
import { buildMatchHref, buildNewsHref, buildTeamHref, buildSeriesHref } from '@/lib/utils';

export type SeoInternalLinksProps = {
  /** Which sub-sections to show. `matches` is on by default; the others let
   * a page opt in when relevant (news page shows news, rankings shows teams). */
  sections?: Array<'matches' | 'teams' | 'news' | 'series'>;
};

export default async function SeoInternalLinks({
  sections = ['matches', 'teams', 'news'],
}: SeoInternalLinksProps) {
  const [live, recent, upcoming, teams, news] = await Promise.allSettled([
    sections.includes('matches') ? getLiveMatches() : Promise.resolve(null),
    sections.includes('matches') ? getRecentMatches() : Promise.resolve(null),
    sections.includes('matches') ? getUpcomingMatches() : Promise.resolve(null),
    sections.includes('teams') ? getICCTeamRankings('odi') : Promise.resolve(null),
    sections.includes('news') ? getCricketNews() : Promise.resolve(null),
  ]);

  // Dedupe match cards across live/recent/upcoming — the same fixture can
  // appear in more than one bucket during transitions.
  const matchLinks: Array<{ href: string; title: string }> = [];
  const seriesLinks: Array<{ href: string; title: string }> = [];
  const seenMatch = new Set<string>();
  const seenSeries = new Set<string>();
  const pushMatches = (bucket: PromiseSettledResult<{ success?: boolean; matches?: Array<{ matchId?: string; title?: string; seriesName?: string; seriesUrl?: string }> } | null>) => {
    if (bucket.status !== 'fulfilled' || !bucket.value?.matches) return;
    for (const m of bucket.value.matches) {
      if (m.matchId && m.title && !seenMatch.has(m.matchId)) {
        seenMatch.add(m.matchId);
        matchLinks.push({ href: buildMatchHref(m.matchId, m.title), title: m.title });
      }
      const sHref = buildSeriesHref(m.seriesName, m.seriesUrl);
      if (sHref && m.seriesName && !seenSeries.has(sHref)) {
        seenSeries.add(sHref);
        seriesLinks.push({ href: sHref, title: m.seriesName });
      }
    }
  };
  pushMatches(live);
  pushMatches(upcoming);
  pushMatches(recent);

  const teamLinks: Array<{ href: string; title: string }> = [];
  if (teams.status === 'fulfilled' && teams.value?.data?.entries) {
    for (const t of teams.value.data.entries) {
      const href = buildTeamHref(t.teamId, t.teamName);
      if (href) teamLinks.push({ href, title: t.teamName });
      if (teamLinks.length >= 10) break;
    }
  }

  const newsLinks: Array<{ href: string; title: string }> = [];
  if (news.status === 'fulfilled' && news.value?.data?.items) {
    for (const n of news.value.data.items) {
      newsLinks.push({ href: buildNewsHref(n.id, n.slug), title: n.title });
      if (newsLinks.length >= 12) break;
    }
  }

  const hasAny = matchLinks.length + teamLinks.length + newsLinks.length + seriesLinks.length > 0;
  if (!hasAny) return null;

  return (
    <nav
      aria-label="Explore Inningz"
      className="max-w-7xl mx-auto px-4 md:px-6 pb-10 md:pb-14 pt-8 border-t border-border/40 mt-10"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
        Explore
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {sections.includes('matches') && matchLinks.length > 0 && (
          <LinkColumn heading="Latest matches" items={matchLinks.slice(0, 20)} />
        )}
        {sections.includes('teams') && teamLinks.length > 0 && (
          <LinkColumn heading="Teams" items={teamLinks} />
        )}
        {sections.includes('series') && seriesLinks.length > 0 && (
          <LinkColumn heading="Current series" items={seriesLinks.slice(0, 12)} />
        )}
        {sections.includes('news') && newsLinks.length > 0 && (
          <LinkColumn heading="Latest news" items={newsLinks} />
        )}
      </div>
    </nav>
  );
}

function LinkColumn({ heading, items }: { heading: string; items: Array<{ href: string; title: string }> }) {
  return (
    <div>
      <h2 className="font-display text-sm md:text-base tracking-tight text-foreground/90 mb-3">
        {heading}
      </h2>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              prefetch={false}
              className="text-[13px] leading-snug text-muted-foreground hover:text-primary transition-colors line-clamp-2"
            >
              {it.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
