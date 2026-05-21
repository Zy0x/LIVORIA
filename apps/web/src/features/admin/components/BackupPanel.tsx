import type { RefObject } from 'react';
import { Activity, CheckCircle2, Clock, Database, Download, HardDrive, RefreshCw, Trash2, Upload, XCircle } from 'lucide-react';

interface BackupPanelProps {
  backups: any[];
  backupLogs: any[];
  exporting: boolean;
  restoring: boolean;
  restoreRef: RefObject<HTMLInputElement | null>;
  onBackup: () => void;
  onDownloadBackup: (backupId: string) => void;
  onDeleteBackup: (backupId: string) => void;
  onRestoreFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BackupPanel({
  backups,
  backupLogs,
  exporting,
  restoring,
  restoreRef,
  onBackup,
  onDownloadBackup,
  onDeleteBackup,
  onRestoreFileChange,
}: BackupPanelProps) {
  return (
    <>
      <div className="admin-card rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary" />Backup & Restore Manual
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onBackup}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce' : ''}`} />
              Backup Sekarang
            </button>
            <button
              onClick={() => restoreRef.current?.click()}
              disabled={restoring}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50"
            >
              <Upload className={`w-3.5 h-3.5 ${restoring ? 'animate-spin' : ''}`} />
              Restore File
            </button>
            <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={onRestoreFileChange} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Riwayat Backup (7 Hari Terakhir)</span>
          </div>

          {backups.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-border rounded-xl">
              <p className="text-xs text-muted-foreground">Belum ada riwayat backup.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {backups.map(backup => (
                <BackupListItem
                  key={backup.id}
                  backup={backup}
                  onDownloadBackup={onDownloadBackup}
                  onDeleteBackup={onDeleteBackup}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {backupLogs.length > 0 && (
        <div className="admin-card rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Log Eksekusi Backup</h2>
          </div>
          <div className="space-y-1.5">
            {backupLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/50 text-[11px]">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-success' : 'bg-destructive'}`} />
                  <span className="text-muted-foreground font-mono">{new Date(log.execution_time).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-foreground font-medium">{log.message}</span>
                </div>
                {log.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />}
                {log.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

interface BackupListItemProps {
  backup: any;
  onDownloadBackup: (backupId: string) => void;
  onDeleteBackup: (backupId: string) => void;
}

function BackupListItem({ backup, onDownloadBackup, onDeleteBackup }: BackupListItemProps) {
  const meta = (() => {
    try {
      return JSON.parse(backup.meta || '{}');
    } catch {
      return {};
    }
  })();
  const totalCount = Object.values(meta.counts || {}).reduce((sum: any, count: any) => sum + count, 0);

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Database className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">
            {new Date(backup.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {new Date(backup.created_at).toLocaleTimeString('id-ID')} &bull; {meta.tables?.length || 0} Tabel &bull; {totalCount} Record
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onDownloadBackup(backup.id)}
          className="p-2 rounded-lg hover:bg-info/10 text-info transition-colors"
          title="Download"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDeleteBackup(backup.id)}
          className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
          title="Hapus"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
