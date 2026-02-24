import { NextRequest, NextResponse } from 'next/server';
import { fetchStreamMatchList, fetchStreamDetail } from '@/lib/stream-fetcher';

const REFERER = process.env.STREAM_REFERER || '';
const ORIGIN = process.env.STREAM_ORIGIN || '';

// Base64url encode a URL to create an opaque token
function encodeToken(url: string): string {
    return Buffer.from(url).toString('base64url');
}

// Rewrite m3u8 content so all URLs go through our segment proxy
function rewriteM3u8(content: string, baseUrl: string): string {
    const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
    return content.replace(/^(?!#)(.+\.(ts|m3u8).*)$/gm, (match) => {
        const absoluteUrl = match.startsWith('http') ? match : `${base}${match}`;
        return `/api/stream-proxy?t=${encodeToken(absoluteUrl)}`;
    });
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    const { matchId } = await params;

    if (!matchId) {
        return NextResponse.json({ error: 'Missing matchId' }, { status: 400 });
    }

    try {
        // First try: matchId is a stream match ID, fetch detail directly
        let playPath: string | null = null;

        const detail = await fetchStreamDetail(matchId);
        if (detail?.playPath) {
            playPath = detail.playPath;
        }

        // Fallback: if no playPath from detail, check match list
        if (!playPath) {
            const matches = await fetchStreamMatchList();
            const match = matches.find(m => m.id === matchId);
            if (match?.playPath) {
                playPath = match.playPath;
            }
        }

        if (!playPath) {
            return NextResponse.json({ error: 'Stream not available' }, { status: 404 });
        }

        // Fetch the m3u8 playlist
        const response = await fetch(playPath, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Referer': REFERER,
                'Origin': ORIGIN,
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Upstream returned ${response.status}` },
                { status: response.status }
            );
        }

        const text = await response.text();
        const rewritten = rewriteM3u8(text, playPath);

        return new NextResponse(rewritten, {
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('[StreamRoute] Error:', error);
        return NextResponse.json({ error: 'Failed to load stream' }, { status: 500 });
    }
}
