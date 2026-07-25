import { ImageResponse } from 'next/og';
import { SITE_TAGLINE } from '@/lib/seo';

export const alt = 'Inningz: Live Cricket Scores & Analytics';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Default share image for every route that doesn't ship its own opengraph-image
// (home, series, team, venue, rankings). Match and news routes override this.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #0A0A0B 0%, #14141a 55%, #1a1710 100%)',
          color: '#F5F5F6', fontFamily: 'sans-serif', position: 'relative',
        }}
      >
        <div style={{ fontSize: 150, fontWeight: 800, color: '#E9B949', letterSpacing: -2 }}>Inningz</div>
        <div style={{ fontSize: 40, color: '#C9CAD0', marginTop: 12 }}>{SITE_TAGLINE}</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, height: 10, width: '100%', background: '#E9B949' }} />
      </div>
    ),
    size
  );
}
