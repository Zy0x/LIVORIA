'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

import { installChunkRecoveryHandlers } from '@/services/platform/chunkRecovery';

function LivoriaLoadingFallback() {
  return (
    <div
      className="min-h-screen bg-background text-foreground flex items-center justify-center"
      style={{
        minHeight: '100vh',
        background: '#f6f8f4',
        color: '#1f2a24',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ display: 'grid', justifyItems: 'center', gap: 14, textAlign: 'center' }}>
        <div
          className="h-10 w-10 rounded-full border-2 border-primary/25 border-t-primary animate-spin"
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: '2px solid rgba(45, 80, 64, 0.22)',
            borderTopColor: '#2d5040',
          }}
        />
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>Memuat LIVORIA</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#66736b' }}>
            Menyiapkan aplikasi terbaru...
          </p>
        </div>
      </div>
    </div>
  );
}

const LivoriaApp = dynamic(() => import('@/App'), {
  loading: () => <LivoriaLoadingFallback />,
  ssr: false,
});

export function LivoriaClientApp() {
  useEffect(() => {
    installChunkRecoveryHandlers();
  }, []);

  return <LivoriaApp />;
}
