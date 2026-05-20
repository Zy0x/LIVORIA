import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import type { Tagihan } from '../types/tagihan.types';

interface TagihanDeleteDialogProps {
  open: boolean;
  item: Tagihan | null;
  isPending: boolean;
  detailCopy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function TagihanDeleteDialog({
  open,
  item,
  isPending,
  detailCopy = false,
  onOpenChange,
  onConfirm,
}: TagihanDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={detailCopy ? 'sm:max-w-sm' : 'w-full sm:max-w-sm'}>
        <DialogHeader>
          <DialogTitle className="font-display text-destructive text-base">Hapus Tagihan</DialogTitle>
          <DialogDescription className="text-xs">
            Hapus "{item?.debitur_nama} - {item?.barang_nama}"? {detailCopy
              ? 'Semua struk dan history terkait juga akan terhapus.'
              : 'Tindakan ini akan menghapus tagihan dan semua data terkait.'}
          </DialogDescription>
        </DialogHeader>
        {!detailCopy && (
          <div className="rounded-xl border border-border p-3 mt-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Akan dihapus:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Semua struk/bukti pembayaran terkait</li>
              <li>Semua riwayat pembayaran dan perubahan</li>
              <li>Semua metadata terkait tagihan ini</li>
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Penghapusan ini permanen dan tidak akan meminta konfirmasi lagi per entri struk atau history.
            </p>
          </div>
        )}
        <div className={detailCopy ? 'flex justify-end gap-2 mt-4' : 'flex flex-col gap-2 sm:flex-row sm:justify-end mt-4'}>
          <button onClick={() => onOpenChange(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]">
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

