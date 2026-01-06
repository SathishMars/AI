import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  output: 'standalone', // this for the creation of a docker image
  basePath: '/aime',
  assetPrefix: '/aime',
  trailingSlash: true,
  serverExternalPackages: ["pg"], // Required for PostgreSQL support in insights
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_BASE_PATH: '/aime',
  },
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

  async rewrites() {
    return [
      {
        source: '/accounts/:accountId/orgs/:orgId/:rest*',
        destination: '/:rest*',
      },
      {
        source: '/accounts/:accountId/:rest*',
        destination: '/:rest*',
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
