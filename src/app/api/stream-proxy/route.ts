import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_DOMAINS = (process.env.STREAM_ALLOWED_DOMAINS || '').split(',').filter(Boolean);

function encodeToken(url: string): string {
    return Buffer.from(url).toString('base64url');
}

function decodeToken(token: string): string {
    return Buffer.from(token, 'base64url').toString('utf-8');
}

// Rewrite segment URLs in m3u8 to go through our proxy with opaque tokens
function rewriteM3u8(content: string, baseUrl: string): string {
    const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
    return content.replace(/^(?!#)(.+\.(ts|m3u8).*)$/gm, (match) => {
        const absoluteUrl = match.startsWith('http') ? match : `${base}${match}`;
        return `/api/stream-proxy?t=${encodeToken(absoluteUrl)}`;
    });
}

export async function GET(request: NextRequest) {
    // Accept either ?t=<base64token> or ?url=<plainUrl> for backward compat
    const token = request.nextUrl.searchParams.get('t');
    const plainUrl = request.nextUrl.searchParams.get('url');
    const streamUrl = token ? decodeToken(token) : plainUrl;

    if (!streamUrl) {
        return NextResponse.json({ error: 'Missing parameter' }, { status: 400 });
    }

    try {
        const urlObj = new URL(streamUrl);
        const isAllowed = ALLOWED_DOMAINS.some(d => urlObj.hostname.endsWith(d));

        if (!isAllowed) {
            return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
        }

        const response = await fetch(streamUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Referer': process.env.STREAM_REFERER || '',
                'Origin': process.env.STREAM_ORIGIN || '',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Upstream returned ${response.status}` },
                { status: response.status }
            );
        }

        const contentType = response.headers.get('Content-Type') || 'application/vnd.apple.mpegurl';
        const isM3u8 = streamUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('x-mpegURL');

        if (isM3u8) {
            const text = await response.text();
            const rewritten = rewriteM3u8(text, streamUrl);

            return new NextResponse(rewritten, {
                headers: {
                    'Content-Type': 'application/vnd.apple.mpegurl',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                },
            });
        }

        // For .ts segments, stream directly without buffering
        return new NextResponse(response.body, {
            headers: {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Cache-Control': 'public, max-age=30',
            },
        });
    } catch (error) {
        console.error('[StreamProxy] Error:', error);
        return NextResponse.json({ error: 'Failed to proxy stream' }, { status: 500 });
    }
}
