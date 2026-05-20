import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  title = 'Belum ada data',
  description = 'Data akan tampil di sini setelah tersedia.',
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center ${className}`}>
      <div className="max-w-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Inbox className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
