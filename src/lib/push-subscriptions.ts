import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import webpush, { type PushSubscription as WebPushSubscription } from 'web-push';

// ─────────────────────────────────────────────────────────────────────────────
// Where subscriptions are stored. JSON on disk keeps this dependency-free for a
// personal project. In serverless (Vercel) the filesystem is ephemeral per
// invocation. Swap this for Upstash Redis or a KV binding for real deployment.
// ─────────────────────────────────────────────────────────────────────────────

const STORE_PATH = path.join(process.cwd(), '.data', 'push-subscriptions.json');

// What a subscription wants to be notified about. Each field is a list of ids
// or names. The server-side watcher filters events against these.
export interface SubscriptionScopes {
    matches: string[];   // matchId list
    series: string[];    // seriesId list
    teams: string[];     // team names (normalized lowercase on match)
}

export const EMPTY_SCOPES: SubscriptionScopes = { matches: [], series: [], teams: [] };

export interface StoredSubscription {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    createdAt: number;
    scopes?: SubscriptionScopes;
    // Legacy free-form prefs, kept so old records still parse.
    prefs?: Record<string, unknown>;
    userAgent?: string;
}

async function readStore(): Promise<StoredSubscription[]> {
    try {
        const raw = await fs.readFile(STORE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e: unknown) {
        // Missing file → empty store.
        if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
        throw e;
    }
}

async function writeStore(items: StoredSubscription[]): Promise<void> {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(items, null, 2), 'utf8');
}

export async function getAllSubscriptions(): Promise<StoredSubscription[]> {
    return readStore();
}

export async function upsertSubscription(sub: WebPushSubscription, meta?: { userAgent?: string; prefs?: Record<string, unknown> }) {
    const store = await readStore();
    const existing = store.findIndex((s) => s.endpoint === sub.endpoint);
    const entry: StoredSubscription = {
        endpoint: sub.endpoint,
        keys: sub.keys as { p256dh: string; auth: string },
        createdAt: existing >= 0 ? store[existing].createdAt : Date.now(),
        prefs: meta?.prefs ?? (existing >= 0 ? store[existing].prefs : undefined),
        userAgent: meta?.userAgent ?? (existing >= 0 ? store[existing].userAgent : undefined),
    };
    if (existing >= 0) store[existing] = entry;
    else store.push(entry);
    await writeStore(store);
    return entry;
}

export async function getScopes(endpoint: string): Promise<SubscriptionScopes> {
    const store = await readStore();
    const s = store.find((x) => x.endpoint === endpoint);
    if (!s?.scopes) return { matches: [], series: [], teams: [] };
    return {
        matches: s.scopes.matches ?? [],
        series: s.scopes.series ?? [],
        teams: s.scopes.teams ?? [],
    };
}

export async function updateScopes(
    endpoint: string,
    scopes: SubscriptionScopes,
): Promise<{ ok: boolean; error?: string }> {
    const store = await readStore();
    const idx = store.findIndex((s) => s.endpoint === endpoint);
    if (idx < 0) return { ok: false, error: 'Subscription not found' };
    store[idx] = {
        ...store[idx],
        scopes: {
            matches: dedupe(scopes.matches),
            series: dedupe(scopes.series),
            teams: dedupe(scopes.teams.map((t) => t.trim()).filter(Boolean)),
        },
    };
    await writeStore(store);
    return { ok: true };
}

function dedupe<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}

export async function removeSubscription(endpoint: string): Promise<boolean> {
    const store = await readStore();
    const next = store.filter((s) => s.endpoint !== endpoint);
    if (next.length === store.length) return false;
    await writeStore(next);
    return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// web-push wiring. VAPID keys must be set at process start.
// ─────────────────────────────────────────────────────────────────────────────

let vapidConfigured = false;
function ensureVapid() {
    if (vapidConfigured) return;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const contact = process.env.VAPID_CONTACT || 'mailto:noreply@example.com';
    if (!publicKey || !privateKey) {
        throw new Error('VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
    }
    webpush.setVapidDetails(contact, publicKey, privateKey);
    vapidConfigured = true;
}

export interface PushPayload {
    title: string;
    body?: string;
    url?: string;
    tag?: string;
    icon?: string;
    badge?: string;
    image?: string;
    renotify?: boolean;
    requireInteraction?: boolean;
    data?: Record<string, unknown>;
}

// Send one payload to one subscription. On 404/410 the endpoint is dead so we
// prune it. Other errors are returned so the caller can log/retry.
export async function sendPushTo(
    sub: StoredSubscription,
    payload: PushPayload,
): Promise<{ ok: boolean; pruned?: boolean; status?: number; error?: string }> {
    ensureVapid();
    try {
        await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            JSON.stringify(payload),
            { TTL: 60 * 60 },
        );
        return { ok: true };
    } catch (e) {
        const err = e as { statusCode?: number; body?: string; message?: string };
        const status = err.statusCode;
        if (status === 404 || status === 410) {
            await removeSubscription(sub.endpoint);
            return { ok: false, pruned: true, status };
        }
        return { ok: false, status, error: err.message ?? err.body ?? 'unknown' };
    }
}

// Broadcast to every stored subscription. Callers can filter with a predicate
// (e.g. by favourite team once we add prefs).
export async function broadcast(
    payload: PushPayload,
    filter?: (s: StoredSubscription) => boolean,
): Promise<{ sent: number; pruned: number; failed: number }> {
    const subs = await getAllSubscriptions();
    const targets = filter ? subs.filter(filter) : subs;
    let sent = 0, pruned = 0, failed = 0;
    await Promise.all(targets.map(async (sub) => {
        const res = await sendPushTo(sub, payload);
        if (res.ok) sent++;
        else if (res.pruned) pruned++;
        else failed++;
    }));
    return { sent, pruned, failed };
}
