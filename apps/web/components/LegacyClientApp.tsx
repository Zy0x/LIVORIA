'use client';

import dynamic from 'next/dynamic';

const LegacyApp = dynamic(() => import('../src/App'), {
  loading: () => null,
  ssr: false,
});

export function LegacyClientApp() {
  return <LegacyApp />;
}
