import { Component, ReactNode } from 'react';
import ErrorState from '@/shared/components/ErrorState';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  scope?: 'app' | 'route';
  onReset?: () => void;
}
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('[ErrorBoundary]', error, info);
  }

  handleReset = () => {
    this.props.onReset?.();
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
    return (
      <ErrorState
        error={this.state.error}
        fullScreen={this.props.scope !== 'route'}
        onRetry={this.handleReset}
        onReload={this.handleReload}
        onClearCache={this.handleClearCacheAndReload}
      />
    );
  }
}

export default ErrorBoundary;
