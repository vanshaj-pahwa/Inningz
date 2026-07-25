import { ImageResponse } from 'next/og';
import { getCricketNewsArticle } from '@/app/actions';

export const alt = 'Cricket news on Inningz';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Per-article share image: the headline over the hero photo (darkened for
// legibility), with an Inningz footer. Degrades to a text-only branded card if
// the article or its image can't be loaded.
export default async function Image({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id, slug } = await params;

  let title = 'Cricket News';
  let category = '';
  let hero: string | undefined;

  try {
    const res = await getCricketNewsArticle(id, slug);
    const a = res.data;
    if (res.success && a) {
      title = a.title || title;
      category = (a.category || '').replace(/\s+/g, ' ').trim();
      hero = a.heroImageUrl;
    }
  } catch {
    // fall through to branded default
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end', background: '#0A0A0B', color: '#F5F5F6',
          fontFamily: 'sans-serif', position: 'relative',
        }}
      >
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" width={1200} height={630}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'linear-gradient(180deg, rgba(10,10,11,0.25) 0%, rgba(10,10,11,0.75) 62%, rgba(10,10,11,0.96) 100%)',
        }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', padding: 72, gap: 20 }}>
          {category && (
            <div style={{
              display: 'flex', alignSelf: 'flex-start', background: '#E9B949', color: '#141416',
              fontSize: 24, fontWeight: 800, padding: '6px 18px', borderRadius: 999, textTransform: 'uppercase',
            }}>
              {category}
            </div>
          )}
          <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.12, maxWidth: 1040 }}>
            {title.length > 130 ? `${title.slice(0, 129)}…` : title}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#E9B949' }}>Inningz</div>
            <div style={{ fontSize: 24, color: '#C9CAD0' }}>Cricket News</div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
