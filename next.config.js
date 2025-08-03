/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.cricbuzz.com",
        pathname: "/a/img/v1/**",
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
