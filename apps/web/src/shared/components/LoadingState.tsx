import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  label?: string;
  description?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingState({
  label = 'Memuat data...',
  description,
  fullScreen = false,
  className = '',
}: LoadingStateProps) {
  return (
    <div
      className={`${fullScreen ? 'min-h-screen' : 'min-h-[40vh]'} flex items-center justify-center bg-background p-6 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
