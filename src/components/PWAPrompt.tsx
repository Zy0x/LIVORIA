import { usePWA } from '@/hooks/usePWA';
import { Download, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function PWAPrompt() {
  const { canInstall, promptInstall, needsUpdate, applyUpdate } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed && !needsUpdate) return null;

  return (
    <>
      {/* Install Banner */}
      {canInstall && !dismissed && (
        <div className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Install LIVORIA</p>
              <p className="text-xs text-muted-foreground truncate">Akses cepat dari home screen</p>
            </div>
            <Button size="sm" onClick={promptInstall} className="shrink-0">
              Install
            </Button>
            <button onClick={() => setDismissed(true)} className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Update Banner */}
      {needsUpdate && (
        <div className="fixed top-4 left-4 right-4 z-[9999] mx-auto max-w-md animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20">
              <RefreshCw className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Update Tersedia</p>
              <p className="text-xs text-muted-foreground">Versi baru LIVORIA siap digunakan</p>
            </div>
            <Button size="sm" onClick={applyUpdate} className="shrink-0">
              Update
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
