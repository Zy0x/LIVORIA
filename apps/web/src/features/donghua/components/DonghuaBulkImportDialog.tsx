import { lazy, Suspense } from 'react';
import LoadingState from '@/shared/components/LoadingState';

const BulkImportDialog = lazy(() => import('@/components/shared/BulkImportDialog'));

interface DonghuaBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function DonghuaBulkImportDialog({ open, onOpenChange, onImportComplete }: DonghuaBulkImportDialogProps) {
  return (
    <Suspense fallback={<LoadingState label="Memuat import massal..." />}>
      <BulkImportDialog
        open={open}
        onOpenChange={onOpenChange}
        mediaType="donghua"
        onImportComplete={onImportComplete}
      />
    </Suspense>
  );
}
