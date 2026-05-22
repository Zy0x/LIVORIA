import type { User } from '@supabase/supabase-js';
import type { ChangeEvent, RefObject } from 'react';
import { Download, HardDrive, Info, Moon, Shield, Sun, Upload, User as UserIcon } from 'lucide-react';

interface AccountCardProps {
  user: User | null;
}

interface DataBackupCardProps {
  exporting: boolean;
  importRef: RefObject<HTMLInputElement>;
  onBackup: () => void;
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => void;
}

interface ThemeCardProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

interface SecurityCardProps {
  onSignOut: () => void;
}

export function SettingsAccountCard({ user }: AccountCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-pastel-blue flex items-center justify-center shrink-0">
          <UserIcon className="w-5 h-5 text-info" />
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
  );
}

export function SettingsDataBackupCard({
  exporting,
  importRef,
  onBackup,
  onImportFile,
}: DataBackupCardProps) {
  return (
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
        <button
          onClick={onBackup}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]"
        >
          <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
          {exporting ? 'Mengekspor...' : 'Backup Data Saya'}
        </button>
        <button
          onClick={() => importRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-medium border border-amber-500/20 hover:bg-amber-500/20 transition-all min-h-[44px]"
        >
          <Upload className="w-4 h-4" />
          Import Data
        </button>
        <input ref={importRef} type="file" accept=".json" className="hidden" onChange={onImportFile} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 sm:pl-[52px]">Format: file JSON backup dari LIVORIA (.json)</p>
    </div>
  );
}

export function SettingsThemeCard({ theme, onToggleTheme }: ThemeCardProps) {
  return (
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
          onClick={onToggleTheme}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted text-xs sm:text-sm font-medium hover:bg-accent transition-all min-h-[44px]"
        >
          {theme === 'light'
            ? <><Moon className="w-4 h-4" /> Ganti ke Mode Gelap</>
            : <><Sun className="w-4 h-4" /> Ganti ke Mode Terang</>}
        </button>
      </div>
    </div>
  );
}

export function SettingsSecurityCard({ onSignOut }: SecurityCardProps) {
  return (
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
          onClick={onSignOut}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 text-destructive text-xs sm:text-sm font-medium hover:bg-destructive/20 transition-all min-h-[44px]"
        >
          Keluar dari Akun
        </button>
      </div>
    </div>
  );
}

export function SettingsAboutCard() {
  return (
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
          Aplikasi arsip personal untuk mengelola tagihan, koleksi anime &amp; donghua, koleksi waifu, dan informasi obat-obatan.
          Data tersimpan aman di cloud dengan enkripsi dan row-level security.
        </p>
      </div>
    </div>
  );
}
