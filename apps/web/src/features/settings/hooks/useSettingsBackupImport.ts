import { useRef, useState, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { toast } from '@/hooks/use-toast';
import {
  deleteSettingsRowsForUser,
  exportSettingsTable,
  upsertSettingsTagihan,
} from '../services/settings-backup.repository';
import {
  asRows,
  IMPORT_DELETE_ORDER,
  IMPORT_INVALIDATE_KEYS,
  IMPORT_STANDALONE_TABLES,
  IMPORTABLE_TABLES,
  insertPreparedRows,
  isUuid,
  prepareImportRow,
  type ImportMode,
} from '../services/settings-import';

const parseBackupJson = (text: string) => JSON.parse(text.replace(/^\uFEFF/, '')) as Record<string, unknown>;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses data.';

export function useSettingsBackupImport(userId?: string) {
  const qc = useQueryClient();
  const importRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Record<string, number> | null>(null);
  const [importing, setImporting] = useState(false);

  const resetImport = () => {
    setImportOpen(false);
    setImportFile(null);
    setImportPreview(null);
  };

  const handleBackup = async () => {
    setExporting(true);
    try {
      const backup: Record<string, unknown> = {};
      for (const table of IMPORTABLE_TABLES) {
        backup[table] = await exportSettingsTable(table);
      }
      const blob = new Blob([
        JSON.stringify({
          _meta: { app: 'LIVORIA', exported_at: new Date().toISOString(), user_id: userId },
          ...backup,
        }, null, 2),
      ], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `livoria-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Backup berhasil', description: 'Data akun berhasil di-export.' });
    } catch {
      toast({ title: 'Gagal', variant: 'destructive' });
    }
    setExporting(false);
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    try {
      const data = parseBackupJson(await file.text());
      const preview: Record<string, number> = {};
      for (const table of IMPORTABLE_TABLES) {
        if (Array.isArray(data[table])) preview[table] = data[table].length;
      }
      setImportPreview(preview);
      setImportOpen(true);
    } catch {
      toast({
        title: 'File tidak valid',
        description: 'Pastikan file adalah JSON backup dari LIVORIA.',
        variant: 'destructive',
      });
    }
    if (importRef.current) importRef.current.value = '';
  };

  const handleImport = async () => {
    if (!importFile || !userId) return;
    setImporting(true);
    try {
      const data = parseBackupJson(await importFile.text());
      if (data?._meta && (data._meta as { app?: string }).app !== 'LIVORIA') {
        throw new Error('File backup bukan format LIVORIA yang valid.');
      }

      let totalInserted = 0;
      const tagihanIdMap = new Map<string, string>();

      if (importMode === 'overwrite') {
        for (const table of IMPORT_DELETE_ORDER) {
          await deleteSettingsRowsForUser(table, userId);
        }
      }

      const tagihanRows = asRows(data, 'tagihan');
      for (const row of tagihanRows) {
        const oldId = isUuid(row.id) ? row.id : null;
        const prepared = prepareImportRow(row, userId, { keepId: true });
        const saved = await upsertSettingsTagihan(prepared);
        if (oldId && saved?.id) tagihanIdMap.set(oldId, saved.id);
        totalInserted++;
      }

      for (const table of ['tagihan_history', 'struk'] as const) {
        const rows = asRows(data, table)
          .filter((row) => !row.tagihan_id || tagihanIdMap.has(String(row.tagihan_id)) || tagihanRows.length === 0)
          .map((row) => prepareImportRow(row, userId, { keepId: true, tagihanIdMap }));
        totalInserted += await insertPreparedRows(table, rows);
      }

      for (const table of IMPORT_STANDALONE_TABLES) {
        const rows = asRows(data, table).map((row) => prepareImportRow(row, userId, { keepId: true }));
        totalInserted += await insertPreparedRows(table, rows);
      }

      for (const key of IMPORT_INVALIDATE_KEYS) {
        qc.invalidateQueries({ queryKey: [key] });
      }

      toast({
        title: 'Import berhasil',
        description: `${totalInserted} data berhasil ${importMode === 'overwrite' ? 'ditimpa' : 'digabung'}.`,
      });
      resetImport();
    } catch (error) {
      toast({ title: 'Import Gagal', description: getErrorMessage(error), variant: 'destructive' });
    }
    setImporting(false);
  };

  return {
    exporting,
    importRef,
    importOpen,
    setImportOpen,
    importMode,
    setImportMode,
    importPreview,
    importing,
    handleBackup,
    handleImportFile,
    handleImport,
    resetImport,
  };
}
