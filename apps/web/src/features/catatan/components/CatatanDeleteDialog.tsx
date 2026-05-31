import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CatatanItem } from '../types/catatan.types';

type CatatanDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CatatanItem | null;
  isPending: boolean;
  onConfirm: () => void;
};

export function CatatanDeleteDialog({ open, onOpenChange, item, isPending, onConfirm }: CatatanDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display pr-7">Hapus Catatan?</DialogTitle>
          <DialogDescription>
            Catatan "{item?.title}" akan dihapus permanen dari akunmu.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-destructive text-destructive-foreground hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isPending ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
