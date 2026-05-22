import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { toast } from '@/hooks/use-toast';
import { adminService, type AdminSession } from '../services/admin.service';
import type { AdminBackup, AdminBackupLog, AdminBackupPayload } from '../types/admin.types';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isLivoriaBackupPayload(value: unknown): value is AdminBackupPayload {
  if (!value || typeof value !== 'object') return false;
  const meta = (value as { _meta?: unknown })._meta;
  return Boolean(meta && typeof meta === 'object' && (meta as { app?: unknown }).app === 'LIVORIA');
}

export function useAdminBackup(adminSession: AdminSession | null, afterDataChange: () => void) {
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backups, setBackups] = useState<AdminBackup[]>([]);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<AdminBackupPayload | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [autoBackupTime, setAutoBackupTime] = useState('02:00');
  const [backupSettingsLoading, setBackupSettingsLoading] = useState(false);
  const [backupSettingsSaving, setBackupSettingsSaving] = useState(false);
  const [nextBackupRun, setNextBackupRun] = useState<string | null>(null);
  const [backupLogs, setBackupLogs] = useState<AdminBackupLog[]>([]);
  const [countdown, setCountdown] = useState('');

  const fetchBackupSettings = useCallback(async () => {
    if (!adminSession) return;
    setBackupSettingsLoading(true);
    try {
      const { data, error } = await adminService.fetchBackupSettings(adminSession);
      if (!error && data?.settings) {
        setAutoBackupEnabled(data.settings.is_enabled);
        setAutoBackupTime(data.settings.backup_time.substring(0, 5));
        setNextBackupRun(data.next_run ?? null);
        setBackupLogs(data.logs || []);
      }
    } catch {
      // Keep legacy silent behavior.
    }
    setBackupSettingsLoading(false);
  }, [adminSession]);

  const fetchBackups = useCallback(async () => {
    if (!adminSession) return;
    try {
      const { data, error } = await adminService.fetchBackups(adminSession);
      if (!error && data?.backups) setBackups(data.backups);
    } catch {
      // Keep legacy silent behavior.
    }
  }, [adminSession]);

  const handleSaveBackupSettings = useCallback(async () => {
    if (!adminSession) return;
    setBackupSettingsSaving(true);
    try {
      const { error } = await adminService.updateBackupSettings(adminSession, {
        is_enabled: autoBackupEnabled,
        backup_time: `${autoBackupTime}:00`,
      });
      if (error) throw new Error('Failed to save settings');
      toast({ title: '\u2705 Pengaturan Tersimpan', description: 'Jadwal backup telah diperbarui secara dinamis.' });
      fetchBackupSettings();
    } catch (error) {
      toast({
        title: 'Gagal',
        description: getErrorMessage(error, 'Terjadi kesalahan saat menyimpan pengaturan.'),
        variant: 'destructive',
      });
    }
    setBackupSettingsSaving(false);
  }, [adminSession, autoBackupEnabled, autoBackupTime, fetchBackupSettings]);

  const handleBackup = useCallback(async () => {
    if (!adminSession) return;
    setExporting(true);
    try {
      const { error } = await adminService.createBackup(adminSession);
      if (error) throw new Error('Backup failed');
      toast({ title: '\u2705 Backup Berhasil', description: 'Data berhasil di-backup dan disimpan.' });
      afterDataChange();
      fetchBackups();
      fetchBackupSettings();
    } catch {
      toast({ title: 'Gagal', description: 'Terjadi kesalahan saat backup.', variant: 'destructive' });
    }
    setExporting(false);
  }, [adminSession, afterDataChange, fetchBackupSettings, fetchBackups]);

  const handleDownloadBackup = useCallback(async (backupId: string) => {
    if (!adminSession) return;
    try {
      const { data, error } = await adminService.downloadBackup(adminSession, backupId);
      if (error || !data) throw new Error('Failed to download');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `livoria-backup-${new Date().toISOString().split('T')[0]}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Gagal download', variant: 'destructive' });
    }
  }, [adminSession]);

  const handleDeleteBackup = useCallback(async (backupId: string) => {
    if (!adminSession) return;
    if (!confirm('Hapus backup ini?')) return;
    try {
      const { error } = await adminService.deleteBackup(adminSession, backupId);
      if (error) throw error;
      toast({ title: 'Backup dihapus' });
      fetchBackups();
    } catch {
      toast({ title: 'Gagal menghapus', variant: 'destructive' });
    }
  }, [adminSession, fetchBackups]);

  const initiateRestore = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = readEvent => {
      try {
        const data: unknown = JSON.parse(readEvent.target?.result as string);
        if (!isLivoriaBackupPayload(data)) throw new Error('Invalid backup file');
        setPendingRestoreData(data);
        setRestoreConfirmText('');
        setShowRestoreConfirm(true);
      } catch (error) {
        toast({ title: 'File Tidak Valid', description: getErrorMessage(error, 'Format file backup tidak valid.'), variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  const handleRestore = useCallback(async () => {
    if (!adminSession || !pendingRestoreData) return;
    setRestoring(true);
    setShowRestoreConfirm(false);
    try {
      const { error: dryRunError } = await adminService.restoreDryRun(adminSession, pendingRestoreData);
      if (dryRunError) throw dryRunError;

      const { error } = await adminService.restore(adminSession, pendingRestoreData, restoreConfirmText);
      if (error) throw error;
      toast({ title: '\u2705 Restore Berhasil', description: 'Data database telah dipulihkan.' });
      afterDataChange();
    } catch (error) {
      toast({ title: 'Restore Gagal', description: getErrorMessage(error, 'Terjadi kesalahan saat restore.'), variant: 'destructive' });
    }
    setRestoring(false);
    setPendingRestoreData(null);
    setRestoreConfirmText('');
  }, [adminSession, afterDataChange, pendingRestoreData, restoreConfirmText]);

  const cancelRestore = useCallback(() => {
    setShowRestoreConfirm(false);
    setPendingRestoreData(null);
    setRestoreConfirmText('');
  }, []);

  useEffect(() => {
    if (!nextBackupRun || !autoBackupEnabled) {
      setCountdown('');
      return;
    }
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(nextBackupRun).getTime();
      const diff = target - now;
      if (diff <= 0) {
        setCountdown('Sedang Berjalan...');
        fetchBackupSettings();
        return;
      }
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${hours}j ${minutes}m ${seconds}d`);
    }, 1000);
    return () => clearInterval(timer);
  }, [nextBackupRun, autoBackupEnabled, fetchBackupSettings]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (adminSession) {
        handleSaveBackupSettings();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [adminSession, autoBackupEnabled, autoBackupTime, handleSaveBackupSettings]);

  return {
    exporting,
    restoring,
    backups,
    showRestoreConfirm,
    pendingRestoreData,
    restoreConfirmText,
    autoBackupEnabled,
    autoBackupTime,
    backupSettingsLoading,
    backupSettingsSaving,
    nextBackupRun,
    backupLogs,
    countdown,
    setRestoreConfirmText,
    setAutoBackupEnabled,
    setAutoBackupTime,
    fetchBackupSettings,
    fetchBackups,
    handleSaveBackupSettings,
    handleBackup,
    handleDownloadBackup,
    handleDeleteBackup,
    initiateRestore,
    handleRestore,
    cancelRestore,
  };
}
