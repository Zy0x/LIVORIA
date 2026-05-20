import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { AnimeItem } from '@/lib/types';

interface AnimeDeleteDialogProps {
  open: boolean;
  deleteItem: AnimeItem | null;
  batchIds: string[];
  deleting: boolean;
  batchDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function AnimeDeleteDialog({
  open,
  deleteItem,
  batchIds,
  deleting,
  batchDeleting,
  onOpenChange,
  onConfirm,
}: AnimeDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-destructive/10 p-6 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center animate-pulse">
            <Trash2 className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground font-display">
              {batchIds.length > 0 ? 'Hapus Batch' : `Hapus ${deleteItem?.is_movie ? 'Film' : 'Anime'}`}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {batchIds.length > 0
                ? `Anda akan menghapus ${batchIds.length} item secara permanen. Tindakan ini tidak dapat dibatalkan.`
                : `Yakin ingin menghapus "${deleteItem?.title}"? Data akan hilang selamanya.`}
            </p>
          </div>
        </div>
        <div className="p-4 bg-card flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={deleting || batchDeleting}
            className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm shadow-lg shadow-destructive/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {deleting || batchDeleting ? 'Sedang Menghapus...' : 'Ya, Hapus Sekarang'}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-semibold text-sm hover:bg-accent transition-all"
          >
            Batalkan
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
