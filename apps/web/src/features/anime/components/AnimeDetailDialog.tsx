import type { ReactNode } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface AnimeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function AnimeDetailDialog({ open, onOpenChange, children }: AnimeDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {children}
      </DialogContent>
    </Dialog>
  );
}
