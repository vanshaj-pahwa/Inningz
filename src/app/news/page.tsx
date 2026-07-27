import type { Metadata } from 'next';
import NewsClient from './news-client';
import JsonLd from '@/components/json-ld';
import SeoInternalLinks from '@/components/seo-internal-links';
import { buildMetadata, absoluteUrl, SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Cricket News',
  path: '/news',
  description:
    'The latest cricket news, match previews, reports, and analysis, updated through the day on Inningz.',
});

export default function NewsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Cricket News · ${SITE_NAME}`,
    url: absoluteUrl('/news'),
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
  };
  return (
    <>
      <JsonLd data={jsonLd} />
      <NewsClient />
      {/* News-first internal-link block: article URLs first, then the
          match/team cross-nav so Googlebot can crawl into the deep story
          pages that are otherwise painted in by the client renderer. */}
      <SeoInternalLinks sections={['news', 'matches', 'teams']} />
    </>
  );
}
