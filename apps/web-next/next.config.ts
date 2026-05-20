import type { NextConfig } from 'next';

const nativeRouteEnv = process.env.LIVORIA_NEXT_NATIVE_ROUTES ?? '';
const nativeRoutes = new Set(
  nativeRouteEnv
    .split(',')
    .map((route) => route.trim())
    .filter(Boolean),
);

const forceAllNative = nativeRoutes.has('*');

type LegacyBridgeRoute = {
  destination: string;
  route: string;
  source: string;
};

const legacyBridgeRoutes: LegacyBridgeRoute[] = [
  // All production routes now have native Next shells. Keep the bridge machinery
  // empty for rollback-only use without sending live traffic to legacy Vite.
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
