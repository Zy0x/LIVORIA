'use client';

import dynamic from 'next/dynamic';

const LivoriaApp = dynamic(() => import('@/App'), {
  loading: () => (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
    </div>
  ),
  ssr: false,
});

export function LivoriaClientApp() {
  return <LivoriaApp />;
}
