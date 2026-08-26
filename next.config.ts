import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: Do NOT set output: "standalone" here — Vercel manages its own
  // output format and needs the .nft.json trace file for file tracing.
  // Standalone mode is only for self-hosting (Docker / bare-metal).
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
