import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "autoassist-l9lr.onrender.com",
      },
    ],
  },
};

export default nextConfig;
