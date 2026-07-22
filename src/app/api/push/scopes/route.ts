import {
    getAllSubscriptions,
    getScopes,
    updateScopes,
    sendPushTo,
    EMPTY_SCOPES,
    type SubscriptionScopes,
} from '@/lib/push-subscriptions';

export const runtime = 'nodejs';

// GET /api/push/scopes?endpoint=... — read the current scopes for a device.
export async function GET(req: Request) {
    const endpoint = new URL(req.url).searchParams.get('endpoint');
    if (!endpoint) return Response.json({ error: 'Missing endpoint' }, { status: 400 });
    const scopes = await getScopes(endpoint);
    return Response.json({ ok: true, scopes });
}

// POST /api/push/scopes — replace the scopes for a device.
// Body: { endpoint, scopes: { matches, series, teams } }
export async function POST(req: Request) {
    let body: { endpoint?: string; scopes?: Partial<SubscriptionScopes> };
    try { body = await req.json(); } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!body.endpoint) return Response.json({ error: 'Missing endpoint' }, { status: 400 });
    const next: SubscriptionScopes = {
        matches: body.scopes?.matches ?? EMPTY_SCOPES.matches,
        series: body.scopes?.series ?? EMPTY_SCOPES.series,
        teams: body.scopes?.teams ?? EMPTY_SCOPES.teams,
    };
    const prevScopes = await getScopes(body.endpoint);
    const wasEmpty = isEmpty(prevScopes);
    const willBeEmpty = isEmpty(next);

    const res = await updateScopes(body.endpoint, next);
    if (!res.ok) return Response.json({ error: res.error }, { status: 404 });
    const scopes = await getScopes(body.endpoint);

    // If the device just went from following nothing to following something,
    // send a one-off welcome push so the user gets confirmation their choice
    // took effect and their notification pipeline actually delivers.
    if (wasEmpty && !willBeEmpty) {
        const all = await getAllSubscriptions();
        const stored = all.find((s) => s.endpoint === body.endpoint);
        if (stored) {
            sendPushTo(stored, {
                title: 'You’re all set',
                body: describeScopes(next),
                url: '/',
                tag: 'inningz-welcome',
            }).then((r) => {
                console.log('[push/scopes] welcome push result:', r);
            }).catch((e) => {
                console.error('[push/scopes] welcome push threw:', e);
            });
        }
    }
    return Response.json({ ok: true, scopes });
}

function isEmpty(s: SubscriptionScopes): boolean {
    return s.matches.length === 0 && s.series.length === 0 && s.teams.length === 0;
}

function describeScopes(s: SubscriptionScopes): string {
    const parts: string[] = [];
    if (s.teams.length) parts.push(`${s.teams.length} team${s.teams.length > 1 ? 's' : ''}`);
    if (s.series.length) parts.push(`${s.series.length} series`);
    if (s.matches.length) parts.push(`${s.matches.length} match${s.matches.length > 1 ? 'es' : ''}`);
    if (parts.length === 0) return "We'll keep you posted on your selections.";
    return `Now following ${joinWithAnd(parts)}. You'll hear from us when there's news.`;
}

function joinWithAnd(items: string[]): string {
    if (items.length <= 1) return items.join('');
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
