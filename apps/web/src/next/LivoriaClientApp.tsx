'use client';

import dynamic from 'next/dynamic';

const LivoriaApp = dynamic(() => import('@/App'), {
  loading: () => null,
  ssr: false,
});

export function LivoriaClientApp() {
  return <LivoriaApp />;
}
