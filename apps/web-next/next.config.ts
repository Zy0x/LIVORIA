import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@livoria/core', '@livoria/ui-tokens'],
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/legacy/index.html' },
        { source: '/auth', destination: '/legacy/index.html' },
        { source: '/admin', destination: '/legacy/index.html' },
        { source: '/tagihan/:path*', destination: '/legacy/index.html' },
        { source: '/anime/:path*', destination: '/legacy/index.html' },
        { source: '/donghua/:path*', destination: '/legacy/index.html' },
        { source: '/waifu/:path*', destination: '/legacy/index.html' },
        { source: '/obat/:path*', destination: '/legacy/index.html' },
        { source: '/settings', destination: '/legacy/index.html' },
      ],
    };
  },
};

export default nextConfig;
