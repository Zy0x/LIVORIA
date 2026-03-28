import Breadcrumb from '@/components/Breadcrumb';
import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { User, Shield, Moon, Sun, Info, Download, Upload, HardDrive, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import PWASettings from './PWASettings';
import TelegramSettings from '@/components/TelegramSettings';

const IMPORTABLE_TABLES = ['anime', 'donghua', 'waifu', 'obat', 'tagihan', 'tagihan_history', 'struk'] as const;

type ImportMode = 'merge' | 'overwrite';

const Settings = () => {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Record<string, number> | null>(null);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    setExporting(true);
    try {
      const tables = [...IMPORTABLE_TABLES];
      const backup: Record<string, any[]> = {};
      for (const table of tables) {
        const { data } = await supabase.from(table).select('*');
        backup[table] = data || [];
      }
      const blob = new Blob([JSON.stringify({ _meta: { app: 'LIVORIA', exported_at: new Date().toISOString(), user_id: user?.id }, ...backup }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `livoria-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: '✅ Backup Berhasil', description: 'Data akun berhasil di-export.' });
    } catch { toast({ title: 'Gagal', variant: 'destructive' }); }
    setExporting(false);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    try {
      const text = await file.text();
      const data = JSON.parse(text.replace(/^\uFEFF/, ''));
      const preview: Record<string, number> = {};
      for (const table of IMPORTABLE_TABLES) {
        if (Array.isArray(data[table])) preview[table] = data[table].length;
      }
      setImportPreview(preview);
      setImportOpen(true);
    } catch {
      toast({ title: 'File tidak valid', description: 'Pastikan file adalah JSON backup dari LIVORIA.', variant: 'destructive' });
    }
    if (importRef.current) importRef.current.value = '';
  };

  const handleImport = async () => {
    if (!importFile || !user) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      const data = JSON.parse(text.replace(/^\uFEFF/, ''));
      let totalInserted = 0;

      for (const table of IMPORTABLE_TABLES) {
        const rows = data[table];
        if (!Array.isArray(rows) || rows.length === 0) continue;

        if (importMode === 'overwrite') {
          // Delete all existing data for this user in this table
          await supabase.from(table).delete().eq('user_id', user.id);
        }

        // Prepare rows with correct user_id
        const prepared = rows.map((row: any) => {
          const { id, ...rest } = row;
          return { ...rest, user_id: user.id };
        });

        // Insert in batches of 50
        for (let i = 0; i < prepared.length; i += 50) {
          const batch = prepared.slice(i, i + 50);
          const { error } = await supabase.from(table).insert(batch);
          if (error) console.error(`Import ${table} batch error:`, error);
          else totalInserted += batch.length;
        }
      }

      // Invalidate all queries to refresh UI
      qc.invalidateQueries();
      toast({
        title: '✅ Import Berhasil',
        description: `${totalInserted} data berhasil ${importMode === 'overwrite' ? 'ditimpa' : 'digabung'}.`,
      });
      setImportOpen(false);
      setImportFile(null);
      setImportPreview(null);
    } catch (err: any) {
      toast({ title: 'Import Gagal', description: err.message, variant: 'destructive' });
    }
    setImporting(false);
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', next === 'dark');
    setTheme(next);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Breadcrumb />
      <h1 className="page-header">Pengaturan ⚙️</h1>
      <p className="page-subtitle mb-5">Kelola preferensi, tampilan, dan informasi akun pribadimu.</p>

      <div className="space-y-4">
        {/* Account */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pastel-blue flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-info" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Informasi Akun</h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Detail akun yang digunakan untuk login</p>
            </div>
          </div>
          <div className="space-y-2 sm:pl-[52px]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-border/50 gap-1">
              <span className="text-xs sm:text-sm text-muted-foreground">Email</span>
              <span className="text-xs sm:text-sm font-medium text-foreground break-all">{user?.email}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-border/50 gap-1">
              <span className="text-xs sm:text-sm text-muted-foreground">User ID</span>
              <span className="text-[10px] sm:text-xs font-mono text-muted-foreground break-all">{user?.id?.slice(0, 12)}...</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 gap-1">
              <span className="text-xs sm:text-sm text-muted-foreground">Terdaftar Sejak</span>
              <span className="text-xs sm:text-sm text-foreground">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Data & Backup */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pastel-blue flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5 text-info" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Data & Backup</h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Export / import seluruh data akun pribadimu</p>
            </div>
          </div>
          <div className="sm:pl-[52px] flex flex-wrap gap-2">
            <button onClick={handleBackup} disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]">
              <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
              {exporting ? 'Mengekspor...' : 'Backup Data Saya'}
            </button>
            <button onClick={() => importRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-medium border border-amber-500/20 hover:bg-amber-500/20 transition-all min-h-[44px]">
              <Upload className="w-4 h-4" />
              Import Data
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 sm:pl-[52px]">Format: file JSON backup dari LIVORIA (.json)</p>
        </div>

        {/* Theme */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pastel-purple flex items-center justify-center shrink-0">
              {theme === 'light' ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5 text-primary" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Tampilan</h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Atur tema antarmuka sesuai preferensimu</p>
            </div>
          </div>
          <div className="sm:pl-[52px]">
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted text-xs sm:text-sm font-medium hover:bg-accent transition-all min-h-[44px]"
            >
              {theme === 'light'
                ? <><Moon className="w-4 h-4" /> Ganti ke Mode Gelap</>
                : <><Sun className="w-4 h-4" /> Ganti ke Mode Terang</>
              }
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pastel-green flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Keamanan</h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Keluar dari akun atau kelola sesi aktif</p>
            </div>
          </div>
          <div className="sm:pl-[52px]">
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 text-destructive text-xs sm:text-sm font-medium hover:bg-destructive/20 transition-all min-h-[44px]"
            >
              Keluar dari Akun
            </button>
          </div>
        </div>

        <TelegramSettings />

        <PWASettings />

        {/* About */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pastel-yellow flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-warning" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Tentang LIVORIA</h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Living Information & Organized Records Archive</p>
            </div>
          </div>
          <div className="sm:pl-[52px] space-y-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Versi 1.0.0</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
              Aplikasi arsip personal untuk mengelola tagihan, database anime &amp; donghua, koleksi waifu, dan informasi obat-obatan.
              Data tersimpan aman di cloud dengan enkripsi dan row-level security.
            </p>
          </div>
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Import Data Keseluruhan</DialogTitle>
            <DialogDescription>
              Pilih mode import dan konfirmasi data yang akan dimasukkan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Mode Selection */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mode Import</p>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setImportMode('merge')}
                  className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all ${importMode === 'merge' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                >
                  🔀 Gabung (Merge)
                </button>
                <button
                  onClick={() => setImportMode('overwrite')}
                  className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all ${importMode === 'overwrite' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                >
                  ⚠️ Timpa (Overwrite)
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {importMode === 'merge'
                  ? 'Data baru akan ditambahkan ke data yang sudah ada tanpa menghapus data lama.'
                  : 'SEMUA data lama akan dihapus dan diganti dengan data dari file backup. Tindakan ini tidak dapat dibatalkan!'}
              </p>
            </div>

            {/* Warning for overwrite */}
            {importMode === 'overwrite' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive leading-relaxed">
                  <strong>Peringatan:</strong> Mode Timpa akan menghapus seluruh data yang ada dan menggantinya dengan data dari file import.
                  Pastikan Anda sudah membuat backup sebelum melanjutkan.
                </p>
              </div>
            )}

            {/* Preview */}
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

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setImportOpen(false); setImportFile(null); setImportPreview(null); }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleImport}
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
    </div>
  );
};

export default Settings;
