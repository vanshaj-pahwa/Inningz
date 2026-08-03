import type { Metadata } from 'next';
import NewsArticleClient from './news-article-client';
import JsonLd from '@/components/json-ld';
import { getCricketNewsArticle } from '@/app/actions';
import { buildNewsHref } from '@/lib/utils';
import { buildMetadata, absoluteUrl, SITE_NAME } from '@/lib/seo';

type Params = { id: string; slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id, slug } = await params;
  try {
    const res = await getCricketNewsArticle(id, slug);
    const a = res.data;
    if (!res.success || !a) {
      return buildMetadata({ title: 'Cricket News', path: buildNewsHref(id, slug), type: 'article' });
    }

    // Use hero image if available, otherwise generate one via API
    const images = a.heroImageUrl
      ? [a.heroImageUrl]
      : [
          `/api/og-image?headline=${encodeURIComponent(a.title)}&excerpt=${encodeURIComponent(a.description || a.paragraphs?.[0] || '')}&category=${encodeURIComponent(a.category || 'CRICKET')}`,
        ];

    return buildMetadata({
      title: a.title,
      path: buildNewsHref(a.id || id, a.slug || slug),
      description: a.description || a.paragraphs?.[0],
      images,
      type: 'article',
      publishedTime: a.publishedAt,
    });
  } catch {
    return buildMetadata({ title: 'Cricket News', path: buildNewsHref(id, slug), type: 'article' });
  }
}

export default async function NewsArticlePage({ params }: { params: Promise<Params> }) {
  const { id, slug } = await params;

  let jsonLd: Record<string, unknown> | null = null;
  try {
    const res = await getCricketNewsArticle(id, slug);
    const a = res.data;
    if (res.success && a) {
      const url = absoluteUrl(buildNewsHref(a.id || id, a.slug || slug));
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: a.title,
        url,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        ...(a.description ? { description: a.description } : {}),
        ...(a.heroImageUrl ? { image: [a.heroImageUrl] } : {}),
        ...(a.publishedAt ? { datePublished: a.publishedAt } : {}),
        ...(a.author ? { author: { '@type': 'Person', name: a.author } } : {}),
        ...(a.category ? { articleSection: a.category } : {}),
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          logo: { '@type': 'ImageObject', url: absoluteUrl('/icon-512.png') },
        },
      };
    }
  } catch {
    // Structured data is optional; render the article regardless.
  }

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <NewsArticleClient />
    </>
  );
}
