import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const headline = searchParams.get('headline') || 'Cricket News';
    const excerpt = searchParams.get('excerpt') || 'Latest cricket updates and analysis';
    const category = searchParams.get('category') || 'CRICKET';

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '1200px',
            height: '630px',
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            padding: '60px',
            color: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            justifyContent: 'space-between',
          }}
        >
          {/* Top section with category and logo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div
              style={{
                backgroundColor: '#00d9ff',
                color: '#1e3c72',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                letterSpacing: '2px',
              }}
            >
              {category}
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00d9ff' }}>
              INNINGZ
            </div>
          </div>

          {/* Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'center' }}>
            <h1
              style={{
                fontSize: '56px',
                fontWeight: 'bold',
                margin: '0',
                lineHeight: '1.2',
                letterSpacing: '-1px',
              }}
            >
              {headline}
            </h1>
            <p
              style={{
                fontSize: '28px',
                margin: '0',
                opacity: '0.9',
                lineHeight: '1.4',
              }}
            >
              {excerpt}
            </p>
          </div>

          {/* Footer with branding */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '20px',
              borderTop: '2px solid rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ fontSize: '24px', color: '#00d9ff', fontWeight: 'bold' }}>
              inningz.vercel.app
            </div>
            <div style={{ fontSize: '18px', opacity: '0.8' }}>
              Live Cricket Scores & Analytics
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    return new Response('Failed to generate image', { status: 500 });
  }
}
