import { Edit2, Pill, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ObatItem } from '../types/obat.types';

type ObatDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detailItem: ObatItem | null;
  onEdit: (item: ObatItem) => void;
  onDelete: (item: ObatItem) => void;
};

export function ObatDetailDialog({ open, onOpenChange, detailItem, onEdit, onDelete }: ObatDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Pill className="w-5 h-5 text-success" /> {detailItem?.name}
          </DialogTitle>
          <DialogDescription>{detailItem?.type}</DialogDescription>
        </DialogHeader>
        {detailItem && (
          <div className="space-y-3 mt-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Kegunaan</span>
              <p>{detailItem.usage_info || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground block">Dosis</span>
                <p>{detailItem.dosage || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Frekuensi</span>
                <p>{detailItem.frequency || '-'}</p>
              </div>
            </div>
            {detailItem.side_effects && (
              <div>
                <span className="text-xs text-muted-foreground block">Efek Samping</span>
                <p className="text-warning">{detailItem.side_effects}</p>
              </div>
            )}
            {detailItem.notes && (
              <div>
                <span className="text-xs text-muted-foreground block">Catatan</span>
                <p>{detailItem.notes}</p>
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t border-border">
              <button
                onClick={() => onEdit(detailItem)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => onDelete(detailItem)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
