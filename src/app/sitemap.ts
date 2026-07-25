import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { buildMatchHref, buildNewsHref, buildSeriesHref } from '@/lib/utils';
import {
  getLiveMatches, getRecentMatches, getUpcomingMatches, getCricketNews,
} from '@/app/actions';

// Regenerate at most hourly: matches and news churn, but crawlers don't need
// minute-fresh URLs and this keeps the upstream scrape load bounded.
export const revalidate = 3600;

const abs = (path: string) => `${SITE_URL}${path}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: abs('/'), lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: abs('/news'), lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: abs('/rankings'), lastModified: now, changeFrequency: 'daily', priority: 0.6 },
  ];

  // Every dynamic source is best-effort: a scrape failure must degrade the
  // sitemap to whatever else succeeded, never 500 the whole route.
  const [live, recent, upcoming, news] = await Promise.allSettled([
    getLiveMatches(),
    getRecentMatches(),
    getUpcomingMatches(),
    getCricketNews(),
  ]);

  const matchEntries: MetadataRoute.Sitemap = [];
  const seriesUrls = new Set<string>();
  const seenMatch = new Set<string>();

  for (const result of [live, recent, upcoming]) {
    if (result.status !== 'fulfilled' || !result.value.matches) continue;
    const isLive = result === live;
    for (const m of result.value.matches) {
      if (m.matchId && !seenMatch.has(m.matchId)) {
        seenMatch.add(m.matchId);
        matchEntries.push({
          url: abs(buildMatchHref(m.matchId, m.title)),
          lastModified: now,
          changeFrequency: isLive ? 'always' : 'weekly',
          priority: isLive ? 0.9 : 0.6,
        });
      }
      const seriesHref = buildSeriesHref(m.seriesName, m.seriesUrl);
      if (seriesHref) seriesUrls.add(seriesHref);
    }
  }

  const seriesEntries: MetadataRoute.Sitemap = [...seriesUrls].map((href) => ({
    url: abs(href),
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.5,
  }));

  const newsEntries: MetadataRoute.Sitemap =
    news.status === 'fulfilled' && news.value.data?.items
      ? news.value.data.items
          .filter((n) => n.id)
          .map((n) => ({
            url: abs(buildNewsHref(n.id, n.slug)),
            lastModified: n.publishedAt ? new Date(n.publishedAt) : now,
            changeFrequency: 'weekly' as const,
            priority: 0.5,
          }))
      : [];

  return [...staticEntries, ...matchEntries, ...seriesEntries, ...newsEntries];
}
