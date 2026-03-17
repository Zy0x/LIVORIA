import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Settings as SettingsIcon, User, Shield, Database, Moon, Sun, Info } from 'lucide-react';

const Settings = () => {
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', next === 'dark');
    setTheme(next);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
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
              <span className="text-xs sm:text-sm text-foreground">{user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
            </div>
          </div>
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
            <button onClick={toggleTheme} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted text-xs sm:text-sm font-medium hover:bg-accent transition-all min-h-[44px]">
              {theme === 'light' ? <><Moon className="w-4 h-4" /> Ganti ke Mode Gelap</> : <><Sun className="w-4 h-4" /> Ganti ke Mode Terang</>}
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
            <button onClick={signOut} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 text-destructive text-xs sm:text-sm font-medium hover:bg-destructive/20 transition-all min-h-[44px]">
              Keluar dari Akun
            </button>
          </div>
        </div>

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
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">Aplikasi arsip personal untuk mengelola tagihan, database anime & donghua, koleksi waifu, dan informasi obat-obatan. Data tersimpan aman di cloud dengan enkripsi dan row-level security.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;