import type { ReactNode } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface DonghuaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function DonghuaDetailDialog({ open, onOpenChange, children }: DonghuaDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {children}
      </DialogContent>
    </Dialog>
  );
}
