import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@signal-sandbox/shared-types'],
  typedRoutes: true,
};

export default nextConfig;
