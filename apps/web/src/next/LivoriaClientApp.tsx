'use client';

import { useEffect } from 'react';

import App from '@/App';
import { installChunkRecoveryHandlers } from '@/services/platform/chunkRecovery';

export function LivoriaClientApp() {
  useEffect(() => {
    installChunkRecoveryHandlers();
    document.getElementById('livoria-boot-fallback')?.remove();
  }, []);

  return <App />;
}
