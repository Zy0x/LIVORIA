/**
 * Admin.tsx — LIVORIA
 *
 * Panel admin (pengembang) dengan autentikasi via Supabase secrets.
 * Diakses melalui halaman Auth dengan mode admin login.
 * Menggunakan edge function admin-auth dan admin-backup.
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  Database, Tv, Film, Heart, Pill, Receipt,
  RefreshCw, Download, Clock, Shield, HardDrive,
  Activity, Settings, Upload,
  Table2, BarChart3, LogOut, AlertTriangle, Trash2,
  CheckCircle2, XCircle
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
  'user_preferences': { label: 'Preferensi',      icon: Settings,color: 'text-slate-600 dark:text-slate-400',    bg: 'bg-slate-50 dark:bg-slate-400/15' },
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

export default function Admin() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tableStats, setTableStats] = useState<TableStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);
  const restoreRef = useRef<HTMLInputElement>(null);

  const adminSession = getAdminSession();

  useEffect(() => {
    if (!adminSession) {
      navigate('/auth', { replace: true });
    }
  }, [adminSession, navigate]);

  const totalRecords = useMemo(() => tableStats.reduce((s, t) => s + Math.max(0, t.count), 0), [tableStats]);

  const fetchStats = async () => {
    if (!adminSession) return;
    setStatsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'stats', email: adminSession.email, password: adminSession.key },
      });
      if (!error && data?.counts) {
        const stats = Object.keys(data.counts).map(name => {
          const cfg = TABLE_CONFIG_MAP[name] || { 
            label: name, 
            icon: Database, 
            color: 'text-slate-600 dark:text-slate-400', 
            bg: 'bg-slate-50 dark:bg-slate-400/15' 
          };
          return {
            name,
            ...cfg,
            count: data.counts[name] ?? -1,
          };
        });
        setTableStats(stats);
      }
    } catch { /* silent */ }
    setStatsLoading(false);
  };

  const fetchBackups = async () => {
    if (!adminSession) return;
    try {
      const { data, error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'list_backups', email: adminSession.email, password: adminSession.key },
      });
      if (!error && data?.backups) {
        setBackups(data.backups);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (adminSession) {
      fetchStats();
      fetchBackups();
    }
  }, []); // eslint-disable-line

  const handleBackup = async () => {
    if (!adminSession) return;
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'backup', email: adminSession.email, password: adminSession.key },
      });
      if (error) throw new Error('Backup failed');
      
      toast({ title: '✅ Backup Berhasil', description: 'Data berhasil di-backup dan disimpan di Supabase.' });
      fetchStats();
      fetchBackups();
    } catch {
      toast({ title: 'Gagal', description: 'Terjadi kesalahan saat backup.', variant: 'destructive' });
    }
    setExporting(false);
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
  }, [tableStats]);

  if (!adminSession) return null;

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
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-all"
            >
              <LogOut className="w-3 h-3" /> Keluar
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-1">Database Monitor 🗄️</h1>
          <p className="text-xs text-muted-foreground">Monitoring lengkap, backup otomatis &amp; restore data LIVORIA.</p>
        </div>
      </div>

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
      <div className="admin-card mb-8">
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

      {/* Backup & Restore Management */}
      <div className="admin-card rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6 mb-5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary" />Backup & Restore System
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
                const meta = JSON.parse(b.meta || '{}');
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
                          {new Date(b.created_at).toLocaleTimeString('id-ID')} • {meta.tables?.length || 0} Tabel • {Object.values(meta.counts || {}).reduce((a: any, b: any) => a + b, 0)} Record
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        // In a real app, we'd fetch the full content and restore
                        toast({ title: 'Info', description: 'Fitur restore dari riwayat akan segera hadir. Gunakan Restore File untuk saat ini.' });
                      }}
                      className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                      title="Restore dari sini"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
          <div className="flex gap-3">
            <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Informasi Sistem</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Sistem melakukan backup otomatis setiap hari. Data disimpan selama 7 hari terakhir. Restore akan menimpa data yang ada dengan data dari backup (berdasarkan ID).
              </p>
            </div>
          </div>
        </div>
      </div>

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
                Anda akan melakukan pemulihan data database. Tindakan ini akan **menimpa** data saat ini dengan data dari file backup. Pastikan file backup sudah benar.
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
                <button
                  onClick={() => { setShowRestoreConfirm(false); setPendingRestoreData(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-bold hover:bg-muted transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleRestore}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-amber-500/20"
                >
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
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
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
