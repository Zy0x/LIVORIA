import { AlertTriangle, CalendarClock, Clock, RefreshCw, Timer } from 'lucide-react';

interface BackupSettingsPanelProps {
  autoBackupEnabled: boolean;
  autoBackupTime: string;
  backupSettingsSaving: boolean;
  nextBackupRun: string | null;
  countdown: string;
  onAutoBackupEnabledChange: (enabled: boolean) => void;
  onAutoBackupTimeChange: (time: string) => void;
}

export function BackupSettingsPanel({
  autoBackupEnabled,
  autoBackupTime,
  backupSettingsSaving,
  nextBackupRun,
  countdown,
  onAutoBackupEnabledChange,
  onAutoBackupTimeChange,
}: BackupSettingsPanelProps) {
  return (
    <div className="admin-card rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6 mb-5">
      <div className="flex items-center gap-2 mb-5">
        <CalendarClock className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Pengaturan Backup Otomatis</h2>
      </div>

      <div className="space-y-4">
        {autoBackupEnabled && nextBackupRun && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Timer className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Backup Berikutnya Dalam</p>
                <p className="text-sm font-mono font-bold text-foreground">{countdown || '...'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground">Jadwal (Lokal):</p>
              <p className="text-[10px] font-bold text-foreground">{new Date(nextBackupRun).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${autoBackupEnabled ? 'bg-success/10' : 'bg-muted'}`}>
              <Timer className={`w-4 h-4 ${autoBackupEnabled ? 'text-success' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Backup Otomatis Harian</p>
              <p className="text-[10px] text-muted-foreground">Data disimpan 7 hari terakhir, otomatis dihapus jika lewat</p>
            </div>
          </div>
          <button
            onClick={() => onAutoBackupEnabledChange(!autoBackupEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${autoBackupEnabled ? 'bg-success' : 'bg-muted-foreground/30'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${autoBackupEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {autoBackupEnabled && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">Waktu Backup</p>
              <p className="text-[10px] text-muted-foreground">Backup dijalankan setiap hari pada waktu ini (perubahan otomatis disimpan)</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={autoBackupTime}
                onChange={event => onAutoBackupTimeChange(event.target.value)}
                disabled={backupSettingsSaving}
                className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-mono text-foreground disabled:opacity-50"
              />
              {backupSettingsSaving && <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />}
            </div>
          </div>
        )}

        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
          <div className="flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Cara Kerja (Dinamis)</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Backup otomatis menggunakan <strong>pg_cron</strong> di Supabase dengan sistem <strong>dinamis</strong>.
                Jadwal dan status backup akan otomatis menyesuaikan berdasarkan pengaturan di panel admin ini.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
