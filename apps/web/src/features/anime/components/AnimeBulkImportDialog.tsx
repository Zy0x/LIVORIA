import { lazy, Suspense } from 'react';
import LoadingState from '@/shared/components/LoadingState';

const BulkImportDialog = lazy(() => import('@/components/shared/BulkImportDialog'));

interface AnimeBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function AnimeBulkImportDialog({ open, onOpenChange, onImportComplete }: AnimeBulkImportDialogProps) {
  return (
    <Suspense fallback={<LoadingState label="Memuat import massal..." />}>
      <BulkImportDialog
        open={open}
        onOpenChange={onOpenChange}
        mediaType="anime"
        onImportComplete={onImportComplete}
      />
    </Suspense>
  );
}
