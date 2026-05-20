import { AlertTriangle } from 'lucide-react';

interface AdminRestoreConfirmModalProps {
  open: boolean;
  pendingRestoreData: any;
  restoreConfirmText: string;
  onRestoreConfirmTextChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function AdminRestoreConfirmModal({
  open,
  pendingRestoreData,
  restoreConfirmText,
  onRestoreConfirmTextChange,
  onCancel,
  onConfirm,
}: AdminRestoreConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4 mx-auto">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-foreground text-center mb-2">Konfirmasi Restore Data</h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Tindakan ini akan <strong>menghapus data saat ini</strong> dan menggantinya dengan data dari file backup.
            Pastikan Anda telah mem-backup data saat ini jika diperlukan.
          </p>

          <div className="p-3 rounded-xl bg-muted/50 border border-border mb-6">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Detail File Backup:</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aplikasi:</span>
                <span className="font-bold text-foreground">{pendingRestoreData?._meta?.app}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tanggal Export:</span>
                <span className="font-bold text-foreground">{new Date(pendingRestoreData?._meta?.exported_at).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Tabel:</span>
                <span className="font-bold text-foreground">{pendingRestoreData?._meta?.tables?.length || 0}</span>
              </div>
            </div>
          </div>

          <label className="block text-xs font-semibold text-foreground mb-3">
            Ketik <span className="font-mono">RESTORE LIVORIA</span> untuk melanjutkan
            <input
              value={restoreConfirmText}
              onChange={(event) => onRestoreConfirmTextChange(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
              autoComplete="off"
            />
          </label>

          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-accent transition-all">
              Batal
            </button>
            <button
              onClick={onConfirm}
              disabled={restoreConfirmText !== 'RESTORE LIVORIA'}
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ya, Restore Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
