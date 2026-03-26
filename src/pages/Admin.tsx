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
  Table2, BarChart3, LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import Breadcrumb from '@/components/Breadcrumb';

interface TableStat { name: string; label: string; icon: typeof Database; count: number; color: string; bg: string }

const TABLE_CONFIG = [
  { name: 'anime',            label: 'Anime',           icon: Tv,      color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-400/15' },
  { name: 'donghua',          label: 'Donghua',         icon: Film,    color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-400/15' },
  { name: 'waifu',            label: 'Waifu',           icon: Heart,   color: 'text-pink-600 dark:text-pink-400',      bg: 'bg-pink-50 dark:bg-pink-400/15' },
  { name: 'obat',             label: 'Obat',            icon: Pill,    color: 'text-sky-600 dark:text-sky-400',        bg: 'bg-sky-50 dark:bg-sky-400/15' },
  { name: 'tagihan',          label: 'Tagihan',         icon: Receipt, color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-400/15' },
  { name: 'tagihan_history',  label: 'Riwayat Bayar',   icon: Clock,   color: 'text-teal-600 dark:text-teal-400',      bg: 'bg-teal-50 dark:bg-teal-400/15' },
  { name: 'struk',            label: 'Struk',           icon: Receipt, color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-400/15' },
  { name: 'user_preferences', label: 'Preferensi',      icon: Settings,color: 'text-slate-600 dark:text-slate-400',    bg: 'bg-slate-50 dark:bg-slate-400/15' },
];

function getAdminSession(): { email: string; key: string } | null {
  try {
    const raw = sessionStorage.getItem('livoria_admin');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Session expires after 2 hours
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
        setTableStats(TABLE_CONFIG.map(cfg => ({
          ...cfg,
          count: data.counts[cfg.name] ?? -1,
        })));
      }
    } catch { /* silent */ }
    setStatsLoading(false);
  };

  useEffect(() => {
    if (adminSession) fetchStats();
  }, []); // eslint-disable-line

  const handleBackup = async () => {
    if (!adminSession) return;
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'backup', email: adminSession.email, password: adminSession.key },
      });
      if (error) throw new Error('Backup failed');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `livoria-admin-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: '✅ Backup Berhasil', description: 'Seluruh data database berhasil di-export.' });
    } catch {
      toast({ title: 'Gagal', description: 'Terjadi kesalahan saat backup.', variant: 'destructive' });
    }
    setExporting(false);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!adminSession) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const { error } = await supabase.functions.invoke('admin-backup', {
        body: { action: 'restore', email: adminSession.email, password: adminSession.key, data },
      });
      if (error) throw new Error('Restore failed');
      toast({ title: '✅ Restore Berhasil', description: 'Data berhasil dipulihkan.' });
      fetchStats();
    } catch {
      toast({ title: 'Gagal', description: 'Terjadi kesalahan saat restore.', variant: 'destructive' });
    }
    setRestoring(false);
    if (restoreRef.current) restoreRef.current.value = '';
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
    <div ref={containerRef} className="w-full max-w-4xl mx-auto p-4 sm:p-6">
      <Breadcrumb />
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
          <p className="text-xs text-muted-foreground">Monitoring lengkap, backup &amp; restore data LIVORIA via Service Role.</p>
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
          <span className="text-2xl font-bold text-foreground">{TABLE_CONFIG.length}</span>
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
          {(statsLoading ? TABLE_CONFIG.map(c => ({ ...c, count: -1 })) : tableStats).map((t) => (
            <div key={t.name} className={`admin-card rounded-xl border border-border p-3 flex flex-col items-center gap-1.5 ${t.bg}`}>
              <t.icon className={`w-4 h-4 ${t.color}`} />
              <span className={`text-xl font-bold ${t.color}`}>{t.count === -1 ? '...' : t.count.toLocaleString('id-ID')}</span>
              <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="admin-card rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6 mb-5">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
          <HardDrive className="w-4 h-4 text-primary" />Backup & Restore (Service Role)
        </h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleBackup} disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 min-h-[40px]">
            <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
            {exporting ? 'Mengekspor...' : 'Backup Seluruh Data'}
          </button>
          <button onClick={() => restoreRef.current?.click()} disabled={restoring}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-bold border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50 min-h-[40px]">
            <Upload className={`w-4 h-4 ${restoring ? 'animate-spin' : ''}`} />
            {restoring ? 'Memulihkan...' : 'Restore dari Backup'}
          </button>
          <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
          Backup menggunakan <code className="bg-muted px-1 rounded text-[9px]">SUPABASE_SERVICE_ROLE_KEY</code> untuk akses penuh ke seluruh data database.
        </p>
      </div>
    </div>
  );
}
