/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.cricbuzz.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.cricbuzz.com",
        pathname: "/**",
      },
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
