import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  scope?: 'app' | 'route';
}
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndReload = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      const registrations = await navigator.serviceWorker?.getRegistrations?.();
      await Promise.all((registrations || []).map((registration) => registration.update().catch(() => undefined)));
    } finally {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const message = this.state.error?.message || 'Aplikasi mengalami error tidak terduga.';
    const isChunkError = /chunk|dynamically imported|module script|failed to fetch/i.test(message);

    return (
      <div className={`${this.props.scope === 'route' ? 'min-h-[55vh]' : 'min-h-screen'} flex items-center justify-center bg-background p-6`}>
        <div className="glass-card max-w-md w-full p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10 text-destructive mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Terjadi Kesalahan</h2>
          <p className="text-sm text-muted-foreground mb-5">
            {isChunkError
              ? 'File aplikasi lama masih tersimpan di cache. Muat ulang aplikasi untuk mengambil versi terbaru.'
              : message}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/70 transition-all"
            >
              Coba Lagi
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Muat Ulang
            </button>
          </div>
          {isChunkError && (
            <button
              onClick={this.handleClearCacheAndReload}
              className="mt-3 text-xs font-medium text-primary hover:underline"
            >
              Bersihkan cache dan muat ulang
            </button>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
