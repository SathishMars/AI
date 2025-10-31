import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  output: 'standalone', // this for the creation of a docker image
  basePath: '', // Set your desired base path here oif you want to change from default
  /* config options here */
  typescript: {
    // !! WARN !!
    // Temporarily allow production builds to complete even with type errors
    // TODO: Fix pre-existing TypeScript errors in legacy workflow visualization code
    ignoreBuildErrors: true,
  },
  
  // Redirects for backward compatibility with old URL structure
  // The [id] route now handles both "new"/"create" and existing template IDs
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
