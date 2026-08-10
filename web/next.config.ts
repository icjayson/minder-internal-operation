import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        source: "/alerts",
        destination: "/alert-log",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
