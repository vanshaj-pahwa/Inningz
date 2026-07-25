import type { Metadata } from 'next';
import VenueClient from './venue-client';
import JsonLd from '@/components/json-ld';
import { getVenue } from '@/app/actions';
import { buildMetadata, absoluteUrl, SITE_NAME } from '@/lib/seo';

type Params = { venuePath: string[] };

async function venueInfo(venuePath: string): Promise<{ name: string; location?: string; imageUrl?: string } | null> {
  try {
    const res = await getVenue(venuePath);
    if (res.data?.name) return { name: res.data.name, location: res.data.location, imageUrl: res.data.imageUrl };
  } catch {
    // ignore
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { venuePath } = await params;
  const path = venuePath.join('/');
  const info = await venueInfo(path);
  const name = info?.name || 'Cricket Venue';
  const where = info?.location ? `, ${info.location}` : '';
  return buildMetadata({
    title: `${name}${where} | Cricket Stats & Records`,
    path: `/venue/${path}`,
    description: `${name}${where}: pitch and ground records, hosted matches, and format-wise stats on ${SITE_NAME}.`,
    images: [info?.imageUrl],
  });
}

export default async function VenuePage({ params }: { params: Promise<Params> }) {
  const { venuePath } = await params;
  const path = venuePath.join('/');
  const info = await venueInfo(path);
  const jsonLd = info
    ? {
        '@context': 'https://schema.org',
        '@type': 'StadiumOrArena',
        name: info.name,
        url: absoluteUrl(`/venue/${path}`),
        ...(info.location ? { address: info.location } : {}),
        ...(info.imageUrl ? { image: info.imageUrl } : {}),
      }
    : null;
  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <VenueClient />
    </>
  );
}
