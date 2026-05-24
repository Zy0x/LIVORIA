'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

import { installChunkRecoveryHandlers } from '@/services/platform/chunkRecovery';

const LivoriaApp = dynamic(() => import('@/App'), {
  loading: () => null,
  ssr: false,
});

export function LivoriaClientApp() {
  useEffect(() => {
    installChunkRecoveryHandlers();
    document.getElementById('livoria-boot-fallback')?.remove();
  }, []);

  return <LivoriaApp />;
}
