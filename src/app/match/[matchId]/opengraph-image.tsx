import { ImageResponse } from 'next/og';
import { getScoreForMatchId } from '@/app/actions';
import { teamColorFor } from '@/lib/team-flags';

export const alt = 'Live cricket score on Inningz';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Per-match share image: the scoreline in the batting side's identity colour on
// the app's dark canvas. Rendered on request; falls back to a branded card when
// the scrape is unavailable so a preview always renders.
export default async function Image({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;

  let title = 'Live Cricket';
  let scoreLine = '';
  let overs = '';
  let status = '';
  let series = '';
  let accent = '#E9B949';

  try {
    const res = await getScoreForMatchId(matchId);
    const d = res.data;
    if (res.success && d) {
      title = d.title || title;
      status = (d.status || '').replace(/\s+/g, ' ').trim();
      series = (d.seriesName || '').replace(/\s+/g, ' ').trim();
      const raw = (d.score || '').replace(/\s+/g, ' ').trim();
      const m = raw.match(/^([A-Za-z]+)\s+(\d+\/\d+)/);
      if (m) {
        scoreLine = `${m[1]} ${m[2]}`;
        const color = teamColorFor(m[1], [title]);
        if (color) accent = color;
      } else {
        scoreLine = raw;
      }
      const ov = raw.match(/\(([^)]+)\s*[Oo]v\)/);
      if (ov) overs = `${ov[1]} ov`;
    }
  } catch {
    // fall through to the branded default below
  }

  const isLive = /live|need|require|elect|opt|innings|break|drink|stump/i.test(status);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #0A0A0B 0%, #14141a 100%)',
          padding: 72, color: '#F5F5F6', fontFamily: 'sans-serif', position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {isLive && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, background: '#E5484D',
              color: '#fff', fontSize: 26, fontWeight: 700, padding: '8px 22px', borderRadius: 999,
            }}>
              ● LIVE
            </div>
          )}
          {series && <div style={{ fontSize: 28, color: '#A1A1A6' }}>{series}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 600, color: '#F5F5F6', marginBottom: 8 }}>{title}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>
            <div style={{ fontSize: 128, fontWeight: 800, color: accent, lineHeight: 1 }}>{scoreLine}</div>
            {overs && <div style={{ fontSize: 40, color: '#8f8f97', paddingBottom: 16 }}>{overs}</div>}
          </div>
          {status && (
            <div style={{ fontSize: 32, color: '#C9CAD0', marginTop: 24, maxWidth: 1000 }}>{status}</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: '#E9B949' }}>Inningz</div>
            <div style={{ fontSize: 24, color: '#6E6E76' }}>Live Cricket Scores</div>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 0, bottom: 0, height: 8, width: '100%', background: accent }} />
      </div>
    ),
    size
  );
}
