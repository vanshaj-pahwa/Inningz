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
};

module.exports = nextConfig;
