import { removeSubscription } from '@/lib/push-subscriptions';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    let body: { endpoint?: string };
    try {
        body = await req.json();
    } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!body.endpoint) {
        return Response.json({ error: 'Missing endpoint' }, { status: 400 });
    }
    const removed = await removeSubscription(body.endpoint);
    return Response.json({ ok: true, removed });
}
