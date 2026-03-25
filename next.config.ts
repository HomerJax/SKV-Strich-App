import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "*.app.github.dev",
    "stunning-orbit-wrpp9j6qpj59hg5p7-3000.app.github.dev",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "*.app.github.dev",
        "stunning-orbit-wrpp9j6qpj59hg5p7-3000.app.github.dev",
      ],
    },
  },
};

export default nextConfig;