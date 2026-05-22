import { AlertTriangle } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ImportMode } from '../services/settings-import';

interface SettingsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importMode: ImportMode;
  onImportModeChange: (mode: ImportMode) => void;
  importPreview: Record<string, number> | null;
  importing: boolean;
  onCancel: () => void;
  onImport: () => void;
}

export function SettingsImportDialog({
  open,
  onOpenChange,
  importMode,
  onImportModeChange,
  importPreview,
  importing,
  onCancel,
  onImport,
}: SettingsImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Import Data Keseluruhan</DialogTitle>
          <DialogDescription>
            Pilih mode import dan konfirmasi data yang akan dimasukkan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mode Import</p>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => onImportModeChange('merge')}
                className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all ${importMode === 'merge' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >
                Gabung (Merge)
              </button>
              <button
                onClick={() => onImportModeChange('overwrite')}
                className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all ${importMode === 'overwrite' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >
                Timpa (Overwrite)
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {importMode === 'merge'
                ? 'Data baru akan ditambahkan ke data yang sudah ada tanpa menghapus data lama.'
                : 'SEMUA data lama akan dihapus dan diganti dengan data dari file backup. Tindakan ini tidak dapat dibatalkan!'}
            </p>
          </div>

          {importMode === 'overwrite' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive leading-relaxed">
                <strong>Peringatan:</strong> Mode Timpa akan menghapus seluruh data yang ada dan menggantinya dengan data dari file import.
                Pastikan Anda sudah membuat backup sebelum melanjutkan.
              </p>
            </div>
          )}

          {importPreview && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Data Ditemukan</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(importPreview).map(([table, count]) => (
                  <div key={table} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border">
                    <span className="text-xs font-medium text-foreground capitalize">{table.replace('_', ' ')}</span>
                    <span className="text-xs font-bold text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all"
            >
              Batal
            </button>
            <button
              onClick={onImport}
              disabled={importing}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                importMode === 'overwrite'
                  ? 'bg-destructive text-destructive-foreground hover:opacity-90'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {importing ? 'Mengimpor...' : importMode === 'overwrite' ? 'Timpa & Import' : 'Gabung & Import'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
