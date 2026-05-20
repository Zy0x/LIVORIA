import type { NextConfig } from 'next';

const nativeRouteEnv = process.env.LIVORIA_NEXT_NATIVE_ROUTES ?? '';
const nativeRoutes = new Set(
  nativeRouteEnv
    .split(',')
    .map((route) => route.trim())
    .filter(Boolean),
);

const forceAllNative = nativeRoutes.has('*');

const legacyBridgeRoutes = [
  { source: '/', destination: '/legacy/index.html', route: '/' },
  { source: '/auth', destination: '/legacy/index.html', route: '/auth' },
  { source: '/admin', destination: '/legacy/index.html', route: '/admin' },
  { source: '/tagihan/:path*', destination: '/legacy/index.html', route: '/tagihan' },
  { source: '/anime/:path*', destination: '/legacy/index.html', route: '/anime' },
  { source: '/donghua/:path*', destination: '/legacy/index.html', route: '/donghua' },
  { source: '/settings', destination: '/legacy/index.html', route: '/settings' },
] as const;

const nextConfig: NextConfig = {
  transpilePackages: ['@livoria/core', '@livoria/ui-tokens'],
  async rewrites() {
    return {
      beforeFiles: legacyBridgeRoutes
        .filter((item) => {
          if (forceAllNative) return false;
          return !nativeRoutes.has(item.route);
        })
        .map(({ destination, source }) => ({ destination, source })),
    };
  },
};

export default nextConfig;
