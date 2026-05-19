import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { WaifuItem } from '../types/waifu.types';

type WaifuDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteItem: WaifuItem | null;
  isPending: boolean;
  onConfirm: () => void;
};

export function WaifuDeleteDialog({ open, onOpenChange, deleteItem, isPending, onConfirm }: WaifuDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-destructive">Hapus Waifu</DialogTitle>
          <DialogDescription>Yakin hapus "{deleteItem?.name}" dari koleksi?</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]"
          >
            {isPending ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
