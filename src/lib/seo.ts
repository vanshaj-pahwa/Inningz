// Central SEO configuration. Every canonical URL, sitemap entry, and Open Graph
// tag derives from SITE_URL so a single env var moves the whole app between
// environments (preview, production) with no hardcoded hostnames.

import type { Metadata } from 'next';

export const SITE_NAME = 'Inningz';
export const SITE_TAGLINE = 'Live Cricket Scores & Analytics';

// The production origin. Overridable per-environment; falls back to the deployed
// Vercel URL. No trailing slash.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://inningz.vercel.app'
).replace(/\/$/, '');

export const DEFAULT_DESCRIPTION =
  'Live cricket scores, ball-by-ball commentary, scorecards, points tables, ICC rankings, and the latest cricket news. Follow every match with Inningz.';

// Turn any app-relative path into an absolute URL for canonical/OG/sitemap use.
export function absoluteUrl(path = ''): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

// Collapse whitespace and clamp a description to a search-friendly length so
// scraped copy doesn't blow past what Google renders (~160 chars).
export function clampDescription(text: string | undefined, max = 160): string {
  if (!text) return DEFAULT_DESCRIPTION;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

// Shared metadata builder so every page emits a consistent, canonical-anchored
// set of tags. Pass a page-relative `path` and the OG/Twitter cards inherit the
// right absolute URL. `images` are relative or absolute; metadataBase resolves
// relative ones.
export function buildMetadata(opts: {
  title: string;
  description?: string;
  path: string;
  images?: (string | undefined)[];
  type?: 'website' | 'article';
  publishedTime?: string;
  noIndex?: boolean;
}): Metadata {
  const description = clampDescription(opts.description);
  const url = absoluteUrl(opts.path);
  const list = (opts.images?.filter(Boolean) as string[] | undefined) ?? [];
  // Only pin an explicit image when we have one; otherwise let the route's
  // file-based opengraph-image (or the root default) supply it.
  const imageProps = list.length ? { images: list.map((u) => ({ url: u })) } : {};

  return {
    title: opts.title,
    description,
    alternates: { canonical: url },
    robots: opts.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: opts.type ?? 'website',
      siteName: SITE_NAME,
      title: opts.title,
      description,
      url,
      ...imageProps,
      ...(opts.publishedTime ? { publishedTime: opts.publishedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description,
      ...imageProps,
    },
  };
}
