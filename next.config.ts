import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  /* config options here */
  
  // This workflows micro-app serves from /aime/aimeworkflows
  basePath: '/aime/aimeworkflows',
  assetPrefix: '/aime/aimeworkflows',
  trailingSlash: true,
  typescript: {
    // !! WARN !!
    // Temporarily allow production builds to complete even with type errors
    // TODO: Fix pre-existing TypeScript errors in legacy workflow visualization code
    ignoreBuildErrors: true,
  },
  
  async redirects() {
    return [
      {
        source: '/configureMyWorkflow/:id',
        destination: '/workflows/configure/:id',
        permanent: true,
      },
    ];
  },
  turbopack: {
    rules: {
      '*.md': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },  
};

export default nextConfig;
