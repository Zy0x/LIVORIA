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
import { invokeAdminBackup } from '@/features/admin/services/admin-backup.repository';
import { toast } from '@/hooks/use-toast';
import Breadcrumb from '@/components/Breadcrumb';
import { formatCompactIDR, formatCurrencyIDR } from '@/shared/formatters/currency';

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

const fmt = formatCurrencyIDR;
const fmtShort = formatCompactIDR;

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
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const restoreRef = useRef<HTMLInputElement>(null);

  // Auto-backup settings
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [autoBackupTime, setAutoBackupTime] = useState('02:00');
  const [backupSettingsLoading, setBackupSettingsLoading] = useState(false);
  const [backupSettingsSaving, setBackupSettingsSaving] = useState(false);
  const [nextBackupRun, setNextBackupRun] = useState<string | null>(null);
  const [backupLogs, setBackupLogs] = useState<any[]>([]);
  const [countdown, setCountdown] = useState<string>('');

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<Record<string, any>>({});

  const adminSession = getAdminSession();

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
  }, [nextBackupRun, autoBackupEnabled]); // eslint-disable-line

  useEffect(() => {
    if (!adminSession) navigate('/auth', { replace: true });
  }, [adminSession, navigate]);

  const totalRecords = useMemo(() => tableStats.reduce((s, t) => s + Math.max(0, t.count), 0), [tableStats]);

  const fetchStats = useCallback(async () => {
    if (!adminSession) return;
    setStatsLoading(true);
    try {
      const { data, error } = await invokeAdminBackup( {
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

  const fetchBackupSettings = useCallback(async () => {
    if (!adminSession) return;
    setBackupSettingsLoading(true);
    try {
      const { data, error } = await invokeAdminBackup( {
        body: { action: 'get_backup_settings', email: adminSession.email, password: adminSession.key },
      });
      if (!error && data?.settings) {
        setAutoBackupEnabled(data.settings.is_enabled);
        setAutoBackupTime(data.settings.backup_time.substring(0, 5));
        setNextBackupRun(data.next_run);
        setBackupLogs(data.logs || []);
      }
    } catch { /* silent */ }
    setBackupSettingsLoading(false);
  }, [adminSession]);

  const handleSaveBackupSettings = async () => {
    if (!adminSession) return;
    setBackupSettingsSaving(true);
    try {
      const { data, error } = await invokeAdminBackup( {
        body: {
          action: 'update_backup_settings',
          email: adminSession.email,
          password: adminSession.key,
          is_enabled: autoBackupEnabled,
          backup_time: autoBackupTime + ':00',
        },
      });
      if (error) throw new Error('Failed to save settings');
      toast({ title: '✅ Pengaturan Tersimpan', description: 'Jadwal backup telah diperbarui secara dinamis.' });
      fetchBackupSettings(); // Refresh to get accurate next run time
    } catch (e: any) {
      toast({ title: 'Gagal', description: e?.message || 'Terjadi kesalahan saat menyimpan pengaturan.', variant: 'destructive' });
    }
    setBackupSettingsSaving(false);
  };

  const fetchBackups = useCallback(async () => {
    if (!adminSession) return;
    try {
      const { data, error } = await invokeAdminBackup( {
        body: { action: 'list_backups', email: adminSession.email, password: adminSession.key },
      });
      if (!error && data?.backups) setBackups(data.backups);
    } catch { /* silent */ }
  }, [adminSession]);

  const fetchUsers = useCallback(async () => {
    if (!adminSession) return;
    setUsersLoading(true);
    try {
      const { data, error } = await invokeAdminBackup( {
        body: { action: 'list_users', email: adminSession.email, password: adminSession.key },
      });
      if (!error && data?.users) setUsers(data.users);
    } catch { /* silent */ }
    setUsersLoading(false);
  }, [adminSession]);

  const fetchUserDetail = useCallback(async (userId: string) => {
    if (!adminSession || userDetails[userId]) return;
    try {
      const { data, error } = await invokeAdminBackup( {
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
      fetchBackupSettings();
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) fetchUsers();
  }, [activeTab]); // eslint-disable-line

  useEffect(() => {
    const timer = setTimeout(() => {
      if (adminSession) {
        handleSaveBackupSettings();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [autoBackupEnabled, autoBackupTime]); // eslint-disable-line

  const handleBackup = async () => {
    if (!adminSession) return;
    setExporting(true);
    try {
      const { data, error } = await invokeAdminBackup( {
        body: { action: 'backup', email: adminSession.email, password: adminSession.key },
      });
      if (error) throw new Error('Backup failed');
      toast({ title: '✅ Backup Berhasil', description: 'Data berhasil di-backup dan disimpan.' });
      fetchStats();
      fetchBackups();
      fetchBackupSettings(); // Refresh logs
    } catch {
      toast({ title: 'Gagal', description: 'Terjadi kesalahan saat backup.', variant: 'destructive' });
    }
    setExporting(false);
  };

  const handleDownloadBackup = async (backupId: string) => {
    if (!adminSession) return;
    try {
      const { data, error } = await invokeAdminBackup( {
        body: { action: 'get_backup', email: adminSession.email, password: adminSession.key, backupId },
      });
      if (error || !data) throw new Error('Failed to download');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `livoria-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast({ title: 'Gagal download', variant: 'destructive' }); }
  };

  const initiateRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data._meta || data._meta.app !== 'LIVORIA') throw new Error('Invalid backup file');
        setPendingRestoreData(data);
        setRestoreConfirmText('');
        setShowRestoreConfirm(true);
      } catch (err: any) {
        toast({ title: 'File Tidak Valid', description: err.message, variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestore = async () => {
    if (!adminSession || !pendingRestoreData) return;
    setRestoring(true);
    setShowRestoreConfirm(false);
    try {
      const { error: dryRunError } = await invokeAdminBackup( {
        body: { action: 'restore', email: adminSession.email, password: adminSession.key, backupData: pendingRestoreData, dryRun: true },
      });
      if (dryRunError) throw dryRunError;

      const { error } = await invokeAdminBackup( {
        body: {
          action: 'restore',
          email: adminSession.email,
          password: adminSession.key,
          backupData: pendingRestoreData,
          restoreConfirm: restoreConfirmText,
        },
      });
      if (error) throw error;
      toast({ title: '✅ Restore Berhasil', description: 'Data database telah dipulihkan.' });
      fetchStats();
    } catch (e: any) {
      toast({ title: 'Restore Gagal', description: e.message, variant: 'destructive' });
    }
    setRestoring(false);
    setPendingRestoreData(null);
    setRestoreConfirmText('');
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
    { id: 'users', label: 'Pengguna', icon: Users },
  ];

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto p-4 sm:p-6 pb-20">
      <Breadcrumb />
      
      {/* Header */}
      <div className="admin-card mb-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 pt-4 pb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em]">Admin Panel — Pengembang</span>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-all">
              <LogOut className="w-3 h-3" /> Keluar
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-1">Panel Admin 🗄️</h1>
          <p className="text-xs text-muted-foreground">Monitoring, backup otomatis, dan tinjauan pengguna.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="admin-card flex gap-1 p-1 rounded-xl bg-muted/60 border border-border mb-5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}>
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══ DATABASE TAB ═══ */}
      {activeTab === 'database' && (
        <>
          {/* Stats Overview */}
          <div className="admin-card grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-1">
              <Database className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">{statsLoading ? '...' : totalRecords}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Total Record</span>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-1">
              <Table2 className="w-5 h-5 text-info" />
              <span className="text-2xl font-bold text-foreground">{tableStats.length}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Total Tabel</span>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-1 col-span-2 sm:col-span-1">
              <Activity className="w-5 h-5 text-success" />
              <span className="text-2xl font-bold text-success">Online</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Status DB</span>
            </div>
          </div>

          {/* Table Stats Grid */}
          <div className="admin-card mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />Statistik Per Tabel
              </h2>
              <button onClick={fetchStats} disabled={statsLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-xs font-medium hover:bg-accent transition-all disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${statsLoading ? 'animate-spin' : ''}`} />Refresh
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {tableStats.map((t) => (
                <div key={t.name} className={`admin-card rounded-xl border border-border p-3 flex flex-col items-center gap-1.5 ${t.bg}`}>
                  <t.icon className={`w-4 h-4 ${t.color}`} />
                  <span className={`text-xl font-bold ${t.color}`}>{t.count === -1 ? '...' : t.count.toLocaleString('id-ID')}</span>
                  <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══ BACKUP TAB ═══ */}
      {activeTab === 'backup' && (
        <>
          {/* Auto-Backup Settings */}
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
                <button onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${autoBackupEnabled ? 'bg-success' : 'bg-muted-foreground/30'}`}>
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
                      onChange={(e) => setAutoBackupTime(e.target.value)}
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

          {/* Manual Backup & Restore */}
          <div className="admin-card rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6 mb-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-primary" />Backup & Restore Manual
              </h2>
              <div className="flex gap-2">
                <button onClick={handleBackup} disabled={exporting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50">
                  <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce' : ''}`} />
                  Backup Sekarang
                </button>
                <button onClick={() => restoreRef.current?.click()} disabled={restoring}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                  <Upload className={`w-3.5 h-3.5 ${restoring ? 'animate-spin' : ''}`} />
                  Restore File
                </button>
                <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={initiateRestore} />
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
                  {backups.map((b) => {
                    const meta = (() => { try { return JSON.parse(b.meta || '{}'); } catch { return {}; } })();
                    const totalCount = Object.values(meta.counts || {}).reduce((a: any, c: any) => a + c, 0);
                    return (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Database className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {new Date(b.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(b.created_at).toLocaleTimeString('id-ID')} • {meta.tables?.length || 0} Tabel • {totalCount} Record
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleDownloadBackup(b.id)}
                            className="p-2 rounded-lg hover:bg-info/10 text-info transition-colors" title="Download">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={async () => {
                            if (!confirm('Hapus backup ini?')) return;
                            try {
                              const { error } = await invokeAdminBackup( {
                                body: { action: 'delete_backup', email: adminSession!.email, password: adminSession!.key, backupId: b.id },
                              });
                              if (error) throw error;
                              toast({ title: 'Backup dihapus' });
                              fetchBackups();
                            } catch { toast({ title: 'Gagal menghapus', variant: 'destructive' }); }
                          }}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Hapus">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Execution Logs - Moved to bottom */}
          {backupLogs.length > 0 && (
            <div className="admin-card rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6 mb-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Log Eksekusi Backup</h2>
              </div>
              <div className="space-y-1.5">
                {backupLogs.map((log: any) => (
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
      )}

      {/* ═══ USERS TAB ═══ */}
      {activeTab === 'users' && (
        <div className="admin-card rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />Daftar Pengguna
            </h2>
            <button onClick={fetchUsers} disabled={usersLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-xs font-medium hover:bg-accent transition-all disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${usersLoading ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>

          {usersLoading ? (
            <div className="py-12 text-center">
              <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Memuat data pengguna...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-border rounded-xl">
              <p className="text-xs text-muted-foreground">Tidak ada pengguna ditemukan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="rounded-xl border border-border bg-muted/30 overflow-hidden transition-all">
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      if (expandedUser === user.id) setExpandedUser(null);
                      else {
                        setExpandedUser(user.id);
                        fetchUserDetail(user.id);
                      }
                    }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {user.email?.[0].toUpperCase() || <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{user.email}</p>
                        <p className="text-[10px] text-muted-foreground">ID: {user.id.substring(0, 8)}... • Terdaftar: {new Date(user.created_at).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${user.last_sign_in_at ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {user.last_sign_in_at ? 'Aktif' : 'Baru'}
                      </div>
                      {expandedUser === user.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {expandedUser === user.id && (
                    <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-card/50">
                      {userDetails[user.id] ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 rounded-xl bg-card border border-border">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Terakhir Login</p>
                            <p className="text-xs font-medium text-foreground">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('id-ID') : '-'}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-card border border-border">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Total Anime</p>
                            <p className="text-xs font-medium text-foreground">{userDetails[user.id].anime_count || 0}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-card border border-border">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Total Donghua</p>
                            <p className="text-xs font-medium text-foreground">{userDetails[user.id].donghua_count || 0}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-card border border-border">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Total Waifu</p>
                            <p className="text-xs font-medium text-foreground">{userDetails[user.id].waifu_count || 0}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-card border border-border">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Total Tagihan</p>
                            <p className="text-xs font-medium text-foreground">{userDetails[user.id].tagihan_count || 0}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-card border border-border">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Total Obat</p>
                            <p className="text-xs font-medium text-foreground">{userDetails[user.id].obat_count || 0}</p>
                          </div>
                          <div className="col-span-2 flex items-end">
                            <button onClick={async () => {
                              if (!confirm(`Hapus pengguna ${user.email}? Tindakan ini tidak dapat dibatalkan.`)) return;
                              try {
                                const { error } = await invokeAdminBackup( {
                                  body: { action: 'delete_user', email: adminSession!.email, password: adminSession!.key, userId: user.id },
                                });
                                if (error) throw error;
                                toast({ title: 'Pengguna dihapus' });
                                fetchUsers();
                              } catch { toast({ title: 'Gagal menghapus', variant: 'destructive' }); }
                            }}
                              className="w-full py-2 rounded-xl bg-destructive/10 text-destructive text-[10px] font-bold border border-destructive/20 hover:bg-destructive/20 transition-all">
                              Hapus Pengguna
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center">
                          <RefreshCw className="w-4 h-4 text-primary animate-spin mx-auto" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && (
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
                  onChange={(event) => setRestoreConfirmText(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                  autoComplete="off"
                />
              </label>

              <div className="flex gap-3">
                <button onClick={() => { setShowRestoreConfirm(false); setPendingRestoreData(null); setRestoreConfirmText(''); }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-accent transition-all">
                  Batal
                </button>
                <button
                  onClick={handleRestore}
                  disabled={restoreConfirmText !== 'RESTORE LIVORIA'}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ya, Restore Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
