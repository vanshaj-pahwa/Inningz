import { NextResponse } from 'next/server';
import { getLiveMatches } from '@/app/actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    const result = await getLiveMatches();
    if (!result.success || !result.matches) {
        return NextResponse.json(
            { success: false, error: result.error ?? 'Unknown error' },
            { status: 500 },
        );
    }

    const matches = result.matches;
    const bySeries: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const summary = matches.map(m => ({
        matchId: m.matchId,
        title: m.title,
        seriesName: m.seriesName,
        matchType: m.matchType,
        status: m.status,
    }));

    for (const m of matches) {
        const s = m.seriesName || '(no series)';
        bySeries[s] = (bySeries[s] || 0) + 1;
        const t = m.matchType || '(none)';
        byType[t] = (byType[t] || 0) + 1;
    }

    return NextResponse.json(
        {
            success: true,
            totalCount: matches.length,
            internationalCount: matches.filter(m => m.matchType === 'International').length,
            byType,
            bySeries,
            matches: summary,
        },
        {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
        },
    );
}
