'use client';

import { useCallback, useEffect, useState } from 'react';

export type PushStatus =
    | 'unsupported'
    | 'blocked'
    | 'unknown'
    | 'ready-to-subscribe'
    | 'subscribing'
    | 'subscribed'
    | 'unsubscribing'
    | 'error';

interface PushState {
    status: PushStatus;
    error?: string;
    endpoint?: string;
}

// Web-push public key is base64url. Convert to a fresh ArrayBuffer so it
// satisfies pushManager.subscribe's `applicationServerKey: BufferSource` type.
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const buf = new ArrayBuffer(raw.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < raw.length; ++i) view[i] = raw.charCodeAt(i);
    return buf;
}

export function usePushNotifications() {
    const [state, setState] = useState<PushState>({ status: 'unknown' });

    // Detect current subscription status on mount.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (typeof window === 'undefined') return;
            if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
                if (!cancelled) setState({ status: 'unsupported' });
                return;
            }
            if (Notification.permission === 'denied') {
                if (!cancelled) setState({ status: 'blocked' });
                return;
            }
            try {
                const reg = await navigator.serviceWorker.ready;
                const existing = await reg.pushManager.getSubscription();
                if (cancelled) return;
                if (existing) setState({ status: 'subscribed', endpoint: existing.endpoint });
                else setState({ status: 'ready-to-subscribe' });
            } catch (e) {
                if (!cancelled) setState({ status: 'error', error: (e as Error).message });
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Refresh subscription state after a pushsubscriptionchange from the SW.
    useEffect(() => {
        if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
        const onMessage = async (event: MessageEvent) => {
            if (event.data?.type !== 'push-subscription-changed') return;
            try {
                const reg = await navigator.serviceWorker.ready;
                const existing = await reg.pushManager.getSubscription();
                setState(existing
                    ? { status: 'subscribed', endpoint: existing.endpoint }
                    : { status: 'ready-to-subscribe' });
            } catch { /* ignore */ }
        };
        navigator.serviceWorker.addEventListener('message', onMessage);
        return () => navigator.serviceWorker.removeEventListener('message', onMessage);
    }, []);

    const subscribe = useCallback(async () => {
        setState((s) => ({ ...s, status: 'subscribing', error: undefined }));
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setState({ status: permission === 'denied' ? 'blocked' : 'ready-to-subscribe' });
                return;
            }
            const keyRes = await fetch('/api/push/vapid-public-key');
            const { publicKey } = await keyRes.json();
            if (!publicKey) throw new Error('Server has no VAPID public key');
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToArrayBuffer(publicKey),
            });
            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub.toJSON() }),
            });
            if (!res.ok) throw new Error(`Server refused subscription (${res.status})`);
            setState({ status: 'subscribed', endpoint: sub.endpoint });
        } catch (e) {
            setState({ status: 'error', error: (e as Error).message });
        }
    }, []);

    const unsubscribe = useCallback(async () => {
        setState((s) => ({ ...s, status: 'unsubscribing', error: undefined }));
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await fetch('/api/push/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: sub.endpoint }),
                }).catch(() => {});
                await sub.unsubscribe();
            }
            setState({ status: 'ready-to-subscribe' });
        } catch (e) {
            setState({ status: 'error', error: (e as Error).message });
        }
    }, []);

    const sendTest = useCallback(async () => {
        if (state.status !== 'subscribed' || !state.endpoint) return { ok: false, error: 'Not subscribed' };
        try {
            const res = await fetch('/api/push/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: state.endpoint }),
            });
            const data = await res.json();
            return { ok: res.ok && data.ok, error: data.error };
        } catch (e) {
            return { ok: false, error: (e as Error).message };
        }
    }, [state.status, state.endpoint]);

    return { ...state, subscribe, unsubscribe, sendTest };
}
