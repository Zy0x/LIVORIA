'use client';

import { useEffect } from 'react';

import App from '@/App';
import { installChunkRecoveryHandlers } from '@/services/platform/chunkRecovery';

export function LivoriaClientApp() {
  useEffect(() => {
    installChunkRecoveryHandlers();
  }, []);

  return <App />;
}
