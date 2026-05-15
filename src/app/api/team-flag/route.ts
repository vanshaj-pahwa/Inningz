import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get('id');
    const name = request.nextUrl.searchParams.get('name');

    if (!id || !/^\d+$/.test(id)) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    if (!name || !/^[a-zA-Z0-9-]{1,40}$/.test(name)) {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    const upstream = `https://static.cricbuzz.com/a/img/v1/72x52/i1/c${id}/${name.toLowerCase()}.jpg`;

    try {
        const res = await fetch(upstream, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            cache: 'force-cache',
        });
        if (!res.ok) {
            return NextResponse.json({ error: 'Upstream error' }, { status: res.status });
        }
        const body = await res.arrayBuffer();
        return new NextResponse(body, {
            status: 200,
            headers: {
                'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=86400, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch {
        return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
    }
}
