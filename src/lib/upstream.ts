// Centralised upstream endpoints. Override in `.env.local` to point at a
// staging mirror or a proxy; leave unset in production. Two hosts because the
// upstream splits its HTML/API pages (WWW) from its image CDN (STATIC/IMG),
// and both can be routed independently.
// These are `NEXT_PUBLIC_*` because the URLs are embedded in image `src`
// attributes on client components — Next.js only ships variables with that
// prefix to the browser. Not secret, and safe to expose.
function requireEnv(name: string, value: string | undefined): string {
    if (!value) throw new Error(`Missing required env var: ${name} — set it in .env.local`);
    return value;
}

export const UPSTREAM_BASE_URL = requireEnv('NEXT_PUBLIC_UPSTREAM_BASE_URL', process.env.NEXT_PUBLIC_UPSTREAM_BASE_URL);
export const UPSTREAM_STATIC_URL = requireEnv('NEXT_PUBLIC_UPSTREAM_STATIC_URL', process.env.NEXT_PUBLIC_UPSTREAM_STATIC_URL);
export const UPSTREAM_IMG_URL = requireEnv('NEXT_PUBLIC_UPSTREAM_IMG_URL', process.env.NEXT_PUBLIC_UPSTREAM_IMG_URL);
export const NEWS_FEED_URL = requireEnv('NEXT_PUBLIC_NEWS_FEED_URL', process.env.NEXT_PUBLIC_NEWS_FEED_URL);
export const NEWS_IMG_URL = requireEnv('NEXT_PUBLIC_NEWS_IMG_URL', process.env.NEXT_PUBLIC_NEWS_IMG_URL);

// News article hosts — comma-separated list of URL bases tried in order.
// The first response that carries the article block wins. Multiple candidates
// because the source publishes at more than one subdomain and datacenter IPs
// (Vercel / AWS) can be blocked on some combinations but not others.
export const NEWS_ARTICLE_BASE_URLS = requireEnv(
    'NEXT_PUBLIC_NEWS_ARTICLE_BASE_URLS',
    process.env.NEXT_PUBLIC_NEWS_ARTICLE_BASE_URLS,
).split(',').map(s => s.trim()).filter(Boolean);

// Shortcuts for the most common URL shapes used across the app.
export const upstreamUrl = (path: string) => `${UPSTREAM_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
export const staticUrl = (path: string) => `${UPSTREAM_STATIC_URL}${path.startsWith('/') ? '' : '/'}${path}`;

// Player face image (225x225 profile crop).
export const playerFaceImageUrl = (faceImageId: string | number) =>
    `${UPSTREAM_STATIC_URL}/a/img/v1/225x225/i1/c${faceImageId}/player.jpg`;

// Team flag (72x52 badge, used everywhere the app shows a flag).
export const teamFlagImageUrl = (imageId: string | number, teamShortName: string) =>
    `${UPSTREAM_STATIC_URL}/a/img/v1/72x52/i1/c${imageId}/${teamShortName.toLowerCase()}.jpg`;
