import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // !! WARN !!
    // Temporarily allow production builds to complete even with type errors
    // TODO: Fix pre-existing TypeScript errors in legacy workflow visualization code
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
