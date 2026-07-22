const CACHE_NAME = 'inningz-v3';
const STATIC_ASSETS = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-full.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Push notifications ---------------------------------------------------------
// Server pushes a JSON payload; render it as a system notification. Falls back
// to a generic message if the payload is missing or malformed. `data.url` is
// used by the click handler below to open/focus the right route.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: 'Inningz', body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'Inningz';
  // Only include fields that are actually set; passing undefined for `image`
  // or `badge` upsets some Chromium builds and silently drops the notification.
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    data: { url: payload.url || '/', ...(payload.data || {}) },
    vibrate: payload.vibrate || [80, 40, 80],
    silent: payload.silent === true,
    requireInteraction: !!payload.requireInteraction,
  };
  if (payload.tag) options.tag = payload.tag;
  if (payload.image) options.image = payload.image;
  if (payload.renotify) options.renotify = true;

  console.log('[sw] push event received:', { title, options });

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[sw] showNotification ok'))
      .catch((err) => console.error('[sw] showNotification failed:', err))
  );
});

// Focus an existing tab if the same URL is already open; otherwise open a new
// tab at the notification's target URL.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const absoluteTarget = new URL(targetUrl, self.location.origin).href;
    for (const client of clientsList) {
      // Match on origin+path so query-string variants still focus an open tab.
      const clientUrl = new URL(client.url);
      const targetParsed = new URL(absoluteTarget);
      if (clientUrl.origin === targetParsed.origin && clientUrl.pathname === targetParsed.pathname) {
        await client.focus();
        return;
      }
    }
    await self.clients.openWindow(absoluteTarget);
  })());
});

// If a user disables notifications from the OS, we get pushsubscriptionchange
// and need to re-subscribe. Post a message to any open clients to trigger a
// re-subscribe via the settings UI.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      client.postMessage({ type: 'push-subscription-changed' });
    }
  })());
});

self.addEventListener('fetch', (event) => {
  // Only handle same-origin http(s) GETs. Skip API/data and non-http schemes
  // (e.g. chrome-extension://), which Cache.put() cannot store.
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    !url.protocol.startsWith('http') ||
    url.origin !== self.location.origin ||
    url.pathname.includes('/api/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful, non-opaque same-origin responses.
        if (response && response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Offline navigation to an uncached route: fall back to the cached app shell.
        if (event.request.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});
