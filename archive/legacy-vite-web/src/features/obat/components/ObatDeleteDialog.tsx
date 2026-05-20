import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ObatItem } from '../types/obat.types';

type ObatDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteItem: ObatItem | null;
  isPending: boolean;
  onConfirm: () => void;
};

export function ObatDeleteDialog({ open, onOpenChange, deleteItem, isPending, onConfirm }: ObatDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-destructive">Hapus Obat</DialogTitle>
          <DialogDescription>Yakin hapus "{deleteItem?.name}" dari arsip?</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isPending ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
