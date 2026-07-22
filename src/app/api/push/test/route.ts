import { getAllSubscriptions, sendPushTo } from '@/lib/push-subscriptions';

export const runtime = 'nodejs';

// POST /api/push/test
// Body: { endpoint?: string, title?, body?, url? }
// If endpoint is given, sends only to that subscription (used by the settings
// "Send test" button so the tester's own device gets the notification). If
// omitted, broadcasts to every stored subscription (dev-only convenience).
export async function POST(req: Request) {
    let body: { endpoint?: string; title?: string; body?: string; url?: string } = {};
    try { body = await req.json(); } catch { /* empty body is fine */ }

    const payload = {
        title: body.title || 'Inningz test notification',
        body: body.body || 'If you see this, push is wired up correctly.',
        url: body.url || '/',
        tag: 'inningz-test',
    };

    const subs = await getAllSubscriptions();
    const targets = body.endpoint ? subs.filter((s) => s.endpoint === body.endpoint) : subs;
    if (targets.length === 0) {
        return Response.json({ ok: false, error: 'No matching subscription' }, { status: 404 });
    }

    let sent = 0, pruned = 0, failed = 0;
    const results = await Promise.all(targets.map(async (s) => {
        const r = await sendPushTo(s, payload);
        if (r.ok) sent++;
        else if (r.pruned) pruned++;
        else failed++;
        return { endpoint: s.endpoint, ...r };
    }));

    return Response.json({ ok: sent > 0, sent, pruned, failed, results });
}
