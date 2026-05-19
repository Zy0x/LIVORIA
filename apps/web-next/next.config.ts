import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@livoria/core', '@livoria/ui-tokens'],
};

export default nextConfig;
