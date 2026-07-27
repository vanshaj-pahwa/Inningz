import HomeClient from './home-client';
import JsonLd from '@/components/json-ld';
import SeoInternalLinks from '@/components/seo-internal-links';
import { SITE_NAME, SITE_TAGLINE, SITE_URL, absoluteUrl } from '@/lib/seo';

// Home inherits the root layout's default title/description; here we add the
// site-level WebSite + Organization graph so search engines can attach a name,
// logo, and (where supported) a sitelinks search box.
export default function HomePage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      alternateName: SITE_TAGLINE,
      url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl('/icon-512.png'),
    },
  ];
  return (
    <>
      <JsonLd data={jsonLd} />
      <HomeClient />
      {/* Server-rendered anchor block so Googlebot can discover deep pages
          via crawling on the first pass — the client SPA doesn't paint them
          into the initial HTML. */}
      <SeoInternalLinks sections={['matches', 'teams', 'news']} />
    </>
  );
}
