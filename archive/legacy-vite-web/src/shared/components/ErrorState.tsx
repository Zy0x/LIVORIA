import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: unknown;
  fullScreen?: boolean;
  onRetry?: () => void;
  onReload?: () => void;
  onClearCache?: () => void | Promise<void>;
}

function getErrorMessage(error: unknown) {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  return String(error);
}

export default function ErrorState({
  title = 'Terjadi Kesalahan',
  description,
  error,
  fullScreen = false,
  onRetry,
  onReload,
  onClearCache,
}: ErrorStateProps) {
  const message = description || getErrorMessage(error) || 'Aplikasi mengalami error tidak terduga.';
  const isChunkError = /chunk|dynamically imported|module script|failed to fetch/i.test(message);

  return (
    <div className={`${fullScreen ? 'min-h-screen' : 'min-h-[55vh]'} flex items-center justify-center bg-background p-6`}>
      <div className="glass-card w-full max-w-md p-6 text-center sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          {isChunkError
            ? 'File aplikasi lama masih tersimpan di cache. Muat ulang aplikasi untuk mengambil versi terbaru.'
            : message}
        </p>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-muted/70"
            >
              <RotateCcw className="h-4 w-4" />
              Coba Lagi
            </button>
          )}
          {onReload && (
            <button
              type="button"
              onClick={onReload}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              Muat Ulang
            </button>
          )}
        </div>
        {isChunkError && onClearCache && (
          <button
            type="button"
            onClick={onClearCache}
            className="mt-3 text-xs font-medium text-primary hover:underline"
          >
            Bersihkan cache dan muat ulang
          </button>
        )}
      </div>
    </div>
  );
}
