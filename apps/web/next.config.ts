import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nurunode/shared"],
  eslint: { ignoreDuringBuilds: true }, // linted from the repo root via `bun run lint`
};

export default nextConfig;
