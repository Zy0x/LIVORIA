import type { ReactNode } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface DonghuaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function DonghuaFormDialog({ open, onOpenChange, children }: DonghuaFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[64rem] sm:max-w-4xl max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden">
        {children}
      </DialogContent>
    </Dialog>
  );
}
