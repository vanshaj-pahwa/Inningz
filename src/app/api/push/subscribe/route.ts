import { upsertSubscription, sendPushTo } from '@/lib/push-subscriptions';

export const runtime = 'nodejs';

interface SubscribeBody {
    subscription?: {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
    };
    prefs?: Record<string, unknown>;
}

export async function POST(req: Request) {
    let body: SubscribeBody;
    try {
        body = await req.json();
    } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const sub = body.subscription;
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys.auth) {
        return Response.json({ error: 'Missing subscription fields' }, { status: 400 });
    }
    try {
        const stored = await upsertSubscription(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
            { userAgent: req.headers.get('user-agent') || undefined, prefs: body.prefs },
        );
        // Fire a welcome push on every successful subscribe. The notification
        // uses a `tag` so a rapid re-subscribe just replaces the tray entry
        // rather than stacking. Fire-and-forget so the API responds fast.
        sendPushTo(stored, {
            title: 'Welcome to Inningz',
            body: "We'll keep you posted on the matches and teams you follow.",
            url: '/',
            tag: 'inningz-welcome',
        }).then((r) => {
            console.log('[push/subscribe] welcome push result:', r);
        }).catch((e) => {
            console.error('[push/subscribe] welcome push threw:', e);
        });
        return Response.json({ ok: true, subscribedAt: stored.createdAt });
    } catch (e) {
        return Response.json({ error: (e as Error).message || 'Failed to save subscription' }, { status: 500 });
    }
}
