/**
 * Admin.tsx — LIVORIA
 *
 * Panel admin (pengembang) dengan autentikasi via Supabase secrets.
 * Fitur: Database monitoring, backup otomatis 7 hari, per-user review, Telegram settings.
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  Database, Tv, Film, Heart, Pill, Receipt,
  RefreshCw, Download, Clock, Shield, HardDrive,
  Activity, Settings, Upload,
  Table2, BarChart3, LogOut, AlertTriangle, Trash2,
  CheckCircle2, XCircle, Users, Eye, ChevronRight,
  Timer, CalendarClock, User, Mail, CreditCard,
  TrendingUp, Wallet, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import Breadcrumb from '@/components/Breadcrumb';

interface TableStat { name: string; label: string; icon: any; count: number; color: string; bg: string }

const TABLE_CONFIG_MAP: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  'anime':            { label: 'Anime',           icon: Tv,      color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-400/15' },
  'donghua':          { label: 'Donghua',         icon: Film,    color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-400/15' },
  'waifu':            { label: 'Waifu',           icon: Heart,   color: 'text-pink-600 dark:text-pink-400',      bg: 'bg-pink-50 dark:bg-pink-400/15' },
  'obat':             { label: 'Obat',            icon: Pill,    color: 'text-sky-600 dark:text-sky-400',        bg: 'bg-sky-50 dark:bg-sky-400/15' },
  'tagihan':          { label: 'Tagihan',         icon: Receipt, color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-400/15' },
  'tagihan_history':  { label: 'Riwayat Bayar',   icon: Clock,   color: 'text-teal-600 dark:text-teal-400',      bg: 'bg-teal-50 dark:bg-teal-400/15' },
  'struk':            { label: 'Struk',           icon: Receipt, color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-400/15' },
  'user_preferences': { label: 'Preferensi',      icon: Settings, color: 'text-slate-600 dark:text-slate-400',    bg: 'bg-slate-50 dark:bg-slate-400/15' },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return String(Math.round(n));
};

function getAdminSession(): { email: string; key: string } | null {
  try {
    const raw = sessionStorage.getItem('livoria_admin');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > 2 * 60 * 60 * 1000) {
      sessionStorage.removeItem('livoria_admin');
      return null;
    }
    return { email: parsed.email, key: parsed.key };
  } catch { return null; }
}

type AdminTab = 'database' | 'backup' | 'users';

export default function Admin() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('database');
  const [tableStats, setTableStats] = useState<TableStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);
  const restoreRef = useRef<HTMLInputElement>(null);

  // Auto-backup settings
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('livoria_auto_backup_enabled') || 'true'); } catch { return true; }
  });
  const [autoBackupTime, setAutoBackupTime] = useState(() =>
    localStorage.getItem('livoria_auto_backup_time') || '02:00'
  );

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<Record<string, any>>({});

  const adminSession = getAdminSession();

  useEffect(() => {
    if (!adminSession) navigate('/auth', { replace: true });
  }, [adminSession, navigate]);

  const totalRecords = useMemo(() => tableStats.reduce((s, t) => s + Math.max(0, t.count), 0), [tableStats]);

  const fetchStats = useCallback(async () => {
    if (!adminSession) return;
    setStatsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'stats', email: adminSession.email, password: adminSession.key },
      });
      if (!error && data?.counts) {
        const stats = Object.keys(data.counts).map(name => {
          const cfg = TABLE_CONFIG_MAP[name] || { label: name, icon: Database, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-400/15' };
          return { name, ...cfg, count: data.counts[name] ?? -1 };
        });
        setTableStats(stats);
      }
    } catch { /* silent */ }
    setStatsLoading(false);
  }, [adminSession]);

  const fetchBackups = useCallback(async () => {
    if (!adminSession) return;
    try {
      const { data, error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'list_backups', email: adminSession.email, password: adminSession.key },
      });
      if (!error && data?.backups) setBackups(data.backups);
    } catch { /* silent */ }
  }, [adminSession]);

  const fetchUsers = useCallback(async () => {
    if (!adminSession) return;
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'list_users', email: adminSession.email, password: adminSession.key },
      });
      if (!error && data?.users) setUsers(data.users);
    } catch { /* silent */ }
    setUsersLoading(false);
  }, [adminSession]);

  const fetchUserDetail = useCallback(async (userId: string) => {
    if (!adminSession || userDetails[userId]) return;
    try {
      const { data, error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'user_detail', email: adminSession.email, password: adminSession.key, userId },
      });
      if (!error && data) {
        setUserDetails(prev => ({ ...prev, [userId]: data }));
      }
    } catch { /* silent */ }
  }, [adminSession, userDetails]);

  useEffect(() => {
    if (adminSession) {
      fetchStats();
      fetchBackups();
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) fetchUsers();
  }, [activeTab]); // eslint-disable-line

  // Save auto-backup settings
  useEffect(() => {
    localStorage.setItem('livoria_auto_backup_enabled', JSON.stringify(autoBackupEnabled));
    localStorage.setItem('livoria_auto_backup_time', autoBackupTime);
  }, [autoBackupEnabled, autoBackupTime]);

  const handleBackup = async () => {
    if (!adminSession) return;
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'backup', email: adminSession.email, password: adminSession.key },
      });
      if (error) throw new Error('Backup failed');
      toast({ title: '✅ Backup Berhasil', description: 'Data berhasil di-backup dan disimpan.' });
      fetchStats();
      fetchBackups();
    } catch {
      toast({ title: 'Gagal', description: 'Terjadi kesalahan saat backup.', variant: 'destructive' });
    }
    setExporting(false);
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!adminSession || !confirm('Hapus file backup ini secara permanen?')) return;
    try {
      const { error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'delete_backup', email: adminSession.email, password: adminSession.key, backupId },
      });
      if (error) throw new Error('Failed to delete backup');
      toast({ title: 'Backup Dihapus' });
      fetchBackups();
    } catch {
      toast({ title: 'Gagal hapus backup', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!adminSession || !confirm('Hapus akun ini secara permanen? Semua data user akan ikut terhapus.')) return;
    try {
      const { error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'delete_user', email: adminSession.email, password: adminSession.key, userId },
      });
      if (error) throw new Error('Failed to delete user');
      toast({ title: 'User Dihapus' });
      fetchUsers();
    } catch {
      toast({ title: 'Gagal hapus user', variant: 'destructive' });
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    if (!adminSession) return;
    try {
      const { data, error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'get_backup', email: adminSession.email, password: adminSession.key, backupId },
      });
      if (error || !data) throw new Error('Failed');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `livoria-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Gagal download backup', variant: 'destructive' });
    }
  };

  const initiateRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setPendingRestoreData(data);
      setShowRestoreConfirm(true);
    } catch {
      toast({ title: 'Gagal', description: 'File backup tidak valid.', variant: 'destructive' });
    }
    if (restoreRef.current) restoreRef.current.value = '';
  };

  const handleRestore = async () => {
    if (!adminSession || !pendingRestoreData) return;
    setRestoring(true);
    setShowRestoreConfirm(false);
    try {
      const { data, error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'restore', email: adminSession.email, password: adminSession.key, data: pendingRestoreData },
      });
      if (error) throw new Error('Restore failed');
      toast({ title: '✅ Restore Berhasil', description: 'Seluruh data database berhasil dipulihkan.' });
      fetchStats();
    } catch {
      toast({ title: 'Gagal', description: 'Terjadi kesalahan saat restore.', variant: 'destructive' });
    }
    setRestoring(false);
    setPendingRestoreData(null);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('livoria_admin');
    navigate('/auth', { replace: true });
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.admin-card', { y: 20, opacity: 0, stagger: 0.06, duration: 0.5, ease: 'power3.out' });
    }, containerRef);
    return () => ctx.revert();
  }, [tableStats, activeTab]);

  if (!adminSession) return null;

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'database', label: 'Database', icon: Database },
    { id: 'backup', label: 'Backup', icon: HardDrive },
    { id: 'users', label: 'Users', icon: Users },
  ];

  return (
    <div ref={containerRef} className="space-y-6">
      <Breadcrumb />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-header leading-tight">Admin Control Panel 🛡️</h1>
          <p className="text-xs text-muted-foreground font-medium">Monitoring dan manajemen data LIVORIA</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" /> Keluar Panel
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex p-1 rounded-2xl bg-muted/50 border border-border/50 w-full sm:w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'database' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {tableStats.map((stat) => (
                <div key={stat.name} className="admin-card p-5 rounded-3xl bg-card border border-border shadow-sm group hover:shadow-md transition-all">
                  <div className={`w-10 h-10 rounded-2xl ${stat.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-black text-foreground">{stat.count === -1 ? '—' : stat.count.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
              <div className="admin-card p-5 rounded-3xl bg-primary/5 border border-primary/10 shadow-sm flex flex-col justify-center">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-black text-primary">{totalRecords.toLocaleString('id-ID')}</p>
                <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest">Total Records</p>
              </div>
            </div>

            <div className="admin-card p-6 rounded-3xl bg-card border border-border shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Aksi Cepat</h3>
                    <p className="text-[10px] text-muted-foreground">Maintenance dan sinkronisasi data</p>
                  </div>
                </div>
                {statsLoading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={fetchStats}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50 border border-border/50 text-left hover:bg-muted transition-all group"
                >
                  <RefreshCw className="w-5 h-5 text-muted-foreground group-hover:rotate-180 transition-transform duration-500" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Refresh Statistik</p>
                    <p className="text-[10px] text-muted-foreground">Update jumlah data terbaru</p>
                  </div>
                </button>
                <button
                  onClick={handleBackup}
                  disabled={exporting}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 text-left hover:bg-primary/20 transition-all group"
                >
                  <Upload className={`w-5 h-5 text-primary ${exporting ? 'animate-bounce' : ''}`} />
                  <div>
                    <p className="text-xs font-bold text-primary">Backup Manual</p>
                    <p className="text-[10px] text-primary/70">Ekspor seluruh database sekarang</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 space-y-6">
            <div className="admin-card p-6 rounded-3xl bg-card border border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Timer className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Auto-Backup</h3>
                  <p className="text-[10px] text-muted-foreground">Pengaturan jadwal otomatis</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/50 border border-border/50">
                  <span className="text-xs font-bold text-foreground">Status</span>
                  <button
                    onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
                    className={`w-12 h-6 rounded-full transition-all relative ${autoBackupEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${autoBackupEnabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Waktu Eksekusi</label>
                  <input
                    type="time"
                    value={autoBackupTime}
                    onChange={(e) => setAutoBackupTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-600 leading-relaxed font-medium">
                      Backup otomatis akan dijalankan setiap hari pada waktu yang ditentukan jika ada sesi aktif.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-card p-6 rounded-3xl bg-card border border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-sky-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Storage Info</h3>
                  <p className="text-[10px] text-muted-foreground">Kapasitas dan penggunaan</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-muted-foreground">DATABASE SIZE</span>
                    <span className="text-foreground">~2.4 MB</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-sky-500 w-[15%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-muted-foreground">STORAGE ASSETS</span>
                    <span className="text-foreground">~148 MB</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-violet-500 w-[45%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="admin-card p-6 rounded-3xl bg-card border border-border shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <HardDrive className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Manajemen Backup</h2>
                  <p className="text-xs text-muted-foreground">Daftar file backup yang tersimpan di cloud storage</p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => restoreRef.current?.click()}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-all"
                >
                  <Upload className="w-4 h-4" /> Import JSON
                </button>
                <input type="file" ref={restoreRef} onChange={initiateRestore} accept=".json" className="hidden" />
                <button
                  onClick={handleBackup}
                  disabled={exporting}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                  {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Backup Sekarang
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {backups.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-border/50 rounded-3xl">
                  <HardDrive className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm font-bold text-muted-foreground">Belum ada file backup</p>
                </div>
              ) : (
                backups.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                        <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(file.created_at).toLocaleString('id-ID')} • {(file.metadata?.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadBackup(file.id)}
                        className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(file.id)}
                        className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-card p-6 rounded-3xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Manajemen Pengguna</h2>
                <p className="text-xs text-muted-foreground">Daftar akun dan statistik penggunaan</p>
              </div>
            </div>
            <button
              onClick={fetchUsers}
              className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {usersLoading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
              <p className="text-sm font-bold text-muted-foreground">Memuat data pengguna...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const isExpanded = expandedUser === u.id;
                const detail = userDetails[u.id];
                
                // Get providers from app_metadata and identities
                const providers = new Set<string>();
                if (u.app_metadata?.provider) providers.add(u.app_metadata.provider);
                if (u.identities) {
                  u.identities.forEach((id: any) => providers.add(id.provider));
                }
                const providerList = Array.from(providers);

                return (
                  <div key={u.id} className="rounded-xl border border-border overflow-hidden">
                    <div className="flex items-center">
                      <button
                        onClick={() => {
                          setExpandedUser(isExpanded ? null : u.id);
                          if (!isExpanded) fetchUserDetail(u.id);
                        }}
                        className="flex-1 text-left flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{u.email || u.id.slice(0, 12)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            {providerList.map(p => (
                              <span key={p} className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground uppercase font-black tracking-tighter">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <div className="px-4 flex items-center gap-2 border-l border-border/50">
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border/50 bg-muted/10">
                        {!detail ? (
                          <div className="py-4 text-center">
                            <RefreshCw className="w-4 h-4 text-muted-foreground/30 animate-spin mx-auto" />
                          </div>
                        ) : (
                          <div className="pt-3 space-y-3">
                            {/* User Info */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2.5 rounded-lg bg-card border border-border">
                                <p className="text-[10px] text-muted-foreground mb-0.5">User ID</p>
                                <p className="font-mono text-[10px] text-foreground break-all">{u.id}</p>
                              </div>
                              <div className="p-2.5 rounded-lg bg-card border border-border">
                                <p className="text-[10px] text-muted-foreground mb-0.5">Email & Auth</p>
                                <p className="font-semibold text-foreground truncate">{u.email}</p>
                                <div className="flex gap-1 mt-1">
                                  {providerList.map(p => (
                                    <span key={p} className="text-[8px] px-1 rounded bg-primary/10 text-primary uppercase font-bold">{p}</span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Data Summary */}
                            {detail.counts && (
                              <>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pt-1">Data Pengguna</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {Object.entries(detail.counts as Record<string, number>).map(([table, count]) => {
                                    const cfg = TABLE_CONFIG_MAP[table];
                                    if (!cfg) return null;
                                    return (
                                      <div key={table} className={`p-2.5 rounded-lg ${cfg.bg} border border-border/50 text-center`}>
                                        <p className={`text-lg font-bold ${cfg.color}`}>{count}</p>
                                        <p className="text-[9px] font-semibold text-muted-foreground">{cfg.label}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}

                            {/* Tagihan Summary */}
                            {detail.tagihanSummary && (
                              <>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pt-1">Ringkasan Tagihan</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {[
                                    { label: 'Total Modal', value: fmtShort(detail.tagihanSummary.totalModal || 0), color: 'text-primary', bg: 'bg-primary/8', icon: Wallet },
                                    { label: 'Terkumpul', value: fmtShort(detail.tagihanSummary.totalDibayar || 0), color: 'text-success', bg: 'bg-success/8', icon: CreditCard },
                                    { label: 'Sisa Piutang', value: fmtShort(detail.tagihanSummary.totalSisa || 0), color: 'text-warning', bg: 'bg-warning/8', icon: Receipt },
                                    { label: 'Keuntungan', value: fmtShort(detail.tagihanSummary.totalKeuntungan || 0), color: 'text-info', bg: 'bg-info/8', icon: TrendingUp },
                                  ].map((s, i) => {
                                    const Icon = s.icon;
                                    return (
                                      <div key={i} className={`p-2.5 rounded-lg ${s.bg} text-center`}>
                                        <Icon className={`w-3.5 h-3.5 ${s.color} mx-auto mb-1`} />
                                        <p className={`text-xs font-bold ${s.color}`}>{s.value}</p>
                                        <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Konfirmasi Restore Data</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Tindakan ini akan <strong>menimpa</strong> data saat ini dengan data dari file backup.
              </p>
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted">
                  <span className="text-muted-foreground">Tanggal Backup:</span>
                  <span className="font-bold text-foreground">{pendingRestoreData?._meta?.exported_at ? new Date(pendingRestoreData._meta.exported_at).toLocaleString('id-ID') : 'Tidak diketahui'}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted">
                  <span className="text-muted-foreground">Jumlah Tabel:</span>
                  <span className="font-bold text-foreground">{pendingRestoreData?._meta?.tables?.length || 0} Tabel</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowRestoreConfirm(false); setPendingRestoreData(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-bold hover:bg-muted transition-all">
                  Batal
                </button>
                <button onClick={handleRestore}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-amber-500/20">
                  Ya, Restore Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for Restore */}
      {restoring && (
        <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
          <div className="relative w-20 h-20 mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Memulihkan Data...</h2>
          <p className="text-sm text-muted-foreground">Mohon tunggu, jangan tutup halaman ini.</p>
        </div>
      )}
    </div>
  );
}

const FileText = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
