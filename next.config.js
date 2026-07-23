/** @type {import('next').NextConfig} */

function upstreamHost(envVar, fallback) {
  try { return new URL(process.env[envVar] || fallback).hostname; } catch { return fallback; }
}

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: upstreamHost('NEXT_PUBLIC_UPSTREAM_STATIC_URL', 'static.cricbuzz.com'), pathname: '/**' },
      { protocol: 'https', hostname: upstreamHost('NEXT_PUBLIC_UPSTREAM_BASE_URL', 'www.cricbuzz.com'), pathname: '/**' },
      { protocol: 'https', hostname: upstreamHost('NEXT_PUBLIC_UPSTREAM_IMG_URL', 'img1.cricbuzz.com'), pathname: '/**' },
      { protocol: 'https', hostname: upstreamHost('NEXT_PUBLIC_NEWS_IMG_URL', 'p.imgci.com'), pathname: '/**' },
      { protocol: 'https', hostname: 'img1.hscicdn.com', pathname: '/**' },
      { protocol: 'https', hostname: 'wassets.hscicdn.com', pathname: '/**' },
      { protocol: 'https', hostname: 'img1.hotstarext.com', pathname: '/**' },
    ],
  },
  // Match URLs support an optional slug for readability + share previews:
  //   /match/144673/southern-brave-vs-welsh-fire-2nd-match
  // The slug is ignored server-side; the route handler only reads the id.
  async rewrites() {
    return [
      { source: '/match/:matchId/:slug*', destination: '/match/:matchId' },
    ];
  },
};

module.exports = nextConfig;
