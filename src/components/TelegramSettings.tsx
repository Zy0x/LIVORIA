/**
 * TelegramSettings — Komponen pengaturan notifikasi Telegram
 */
import { useState, useEffect } from 'react';
import { Send, BellOff, CheckCircle2, Loader2, MessageSquare, Clock, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface TelegramSub {
  chat_id: number;
  is_active: boolean;
  notify_monthly_report: boolean;
  monthly_report_date: number;
  notify_overdue: boolean;
  notify_due_reminder: boolean;
  reminder_days_before: number;
}

export default function TelegramSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [chatId, setChatId] = useState('');
  const [connected, setConnected] = useState(false);
  const [showChatId, setShowChatId] = useState(false);

  // Notification preferences
  const [notifyMonthly, setNotifyMonthly] = useState(true);
  const [monthlyReportDate, setMonthlyReportDate] = useState(1);
  const [notifyOverdue, setNotifyOverdue] = useState(true);
  const [notifyDue, setNotifyDue] = useState(true);
  const [reminderDays, setReminderDays] = useState(3);

  useEffect(() => {
    if (!user) return;
    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const { data: subData, error: subError } = await supabase
        .from('telegram_subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (subError && subError.code !== 'PGRST116') {
        throw subError;
      }

      if (subData) {
        setChatId(String(subData.chat_id || ''));
        setConnected(subData.is_active || false);
        setNotifyMonthly(subData.notify_monthly_report !== false);
        setMonthlyReportDate(subData.monthly_report_date || 1);
        setNotifyOverdue(subData.notify_overdue !== false);
        setNotifyDue(subData.notify_due_reminder !== false);
        setReminderDays(subData.reminder_days_before || 3);
      } else {
        setChatId('');
        setConnected(false);
        setNotifyMonthly(true);
        setMonthlyReportDate(1);
        setNotifyOverdue(true);
        setNotifyDue(true);
        setReminderDays(3);
      }
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      toast({ title: 'Peringatan', description: 'Gagal memuat data Telegram. Silakan refresh halaman.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleConnect = async () => {
    if (!chatId.trim() || !user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-tagihan', {
        body: { action: 'register', userId: user.id, chatId: Number(chatId.trim()) },
      });
      if (data?.ok) {
        toast({ title: '✅ Terhubung!', description: 'Bot Telegram berhasil dihubungkan.' });
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchSubscription();
      } else {
        throw new Error(data?.error || 'Gagal menghubungkan');
      }
    } catch (err: any) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDisconnect = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-tagihan', {
        body: { action: 'unregister', userId: user.id },
      });
      if (error || !data?.ok) throw new Error(data?.error || 'Gagal memutuskan');
      
      toast({ title: 'Terputus', description: 'Notifikasi Telegram dinonaktifkan.' });
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchSubscription();
    } catch (err: any) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!chatId.trim()) return;
    setTesting(true);
    try {
      const { data } = await supabase.functions.invoke('telegram-tagihan', {
        body: { action: 'test', chatId: Number(chatId.trim()) },
      });
      if (data?.ok) {
        toast({ title: '✅ Test Berhasil', description: 'Pesan test telah dikirim ke Telegram.' });
      } else {
        toast({ title: 'Gagal', description: data?.description || 'Chat ID tidak valid.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Gagal mengirim test', variant: 'destructive' });
    }
    setTesting(false);
  };

  // Auto-save preference
  const autoSavePreference = async (key: string, value: any) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('telegram-tagihan', {
        body: {
          action: 'update_preferences',
          userId: user.id,
          [key]: value,
        },
      });
      if (error || !data?.ok) throw new Error(data?.error || 'Gagal menyimpan');
    } catch (err: any) {
      console.error('Auto-save error:', err);
      toast({ title: 'Peringatan', description: 'Gagal menyimpan preferensi ke server.', variant: 'destructive' });
    }
  };

  const handleToggleMonthly = async (newValue: boolean) => {
    setNotifyMonthly(newValue);
    await autoSavePreference('notify_monthly_report', newValue);
    toast({ title: '✅ Tersimpan', description: 'Preferensi laporan bulanan diperbarui.' });
  };

  const handleChangeMonthlyDate = async (newDate: number) => {
    setMonthlyReportDate(newDate);
    await autoSavePreference('monthly_report_date', newDate);
    toast({ title: '✅ Tersimpan', description: `Laporan bulanan akan dikirim tanggal ${newDate}.` });
  };

  const handleToggleOverdue = async (newValue: boolean) => {
    setNotifyOverdue(newValue);
    await autoSavePreference('notify_overdue', newValue);
    toast({ title: '✅ Tersimpan', description: 'Preferensi alert overdue diperbarui.' });
  };

  const handleToggleDue = async (newValue: boolean) => {
    setNotifyDue(newValue);
    await autoSavePreference('notify_due_reminder', newValue);
    toast({ title: '✅ Tersimpan', description: 'Preferensi reminder jatuh tempo diperbarui.' });
  };

  const handleChangeReminderDays = async (newDays: number) => {
    setReminderDays(newDays);
    await autoSavePreference('reminder_days_before', newDays);
    toast({ title: '✅ Tersimpan', description: `Reminder akan dikirim ${newDays} hari sebelum jatuh tempo.` });
  };

  if (loading) {
    return (
      <div className="stat-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-400/15 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Telegram Bot</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Memuat...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-400/15 flex items-center justify-center shrink-0">
          <Send className="w-5 h-5 text-blue-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground text-sm sm:text-base">Notifikasi Telegram</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Terima laporan & reminder tagihan via Telegram</p>
        </div>
        {connected && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold shrink-0">
            <CheckCircle2 className="w-3 h-3" /> Aktif
          </span>
        )}
      </div>

      <div className="sm:pl-[52px] space-y-4">
        {/* Chat ID Input */}
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">Chat ID Telegram</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showChatId ? "text" : "password"}
                value={chatId}
                onChange={(e) => setChatId(e.target.value.replace(/[^0-9-]/g, ''))}
                placeholder="Contoh: 123456789"
                className="w-full pl-3 pr-10 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => setShowChatId(!showChatId)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showChatId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={handleTest} disabled={testing || !chatId.trim()}
              className="px-3 py-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-500/20 hover:bg-blue-500/20 transition-all disabled:opacity-50 min-h-[44px]">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
            Cara mendapatkan Chat ID: Chat <strong>@livoria_bot</strong> di Telegram, kirim /start, dan salin ID yang diberikan.
            Atau gunakan <strong>@userinfobot</strong> untuk alternatif.
          </p>
        </div>

        {/* Connect / Disconnect */}
        <div className="flex gap-2">
          {!connected ? (
            <button onClick={handleConnect} disabled={saving || !chatId.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Hubungkan
            </button>
          ) : (
            <button onClick={handleDisconnect} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 text-destructive text-xs sm:text-sm font-medium hover:bg-destructive/20 transition-all disabled:opacity-50 min-h-[44px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
              Putuskan
            </button>
          )}
        </div>

        {/* Notification Preferences (only if connected) */}
        {connected && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            <p className="text-xs font-semibold text-foreground">Preferensi Notifikasi</p>

            {/* Laporan Bulanan */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Laporan Bulanan</p>
                  <p className="text-[10px] text-muted-foreground">Laporan detail setiap bulan</p>
                </div>
              </div>
              <button onClick={() => handleToggleMonthly(!notifyMonthly)}
                className={`relative w-10 h-5 rounded-full transition-colors ${notifyMonthly ? 'bg-success' : 'bg-muted-foreground/30'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${notifyMonthly ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {notifyMonthly && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">Tanggal Laporan Bulanan</p>
                  <p className="text-[10px] text-muted-foreground">Laporan akan dikirim pada tanggal ini setiap bulan</p>
                </div>
                <select value={monthlyReportDate} onChange={(e) => handleChangeMonthlyDate(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg bg-card border border-border text-xs text-foreground">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Reminder Jatuh Tempo */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Reminder Jatuh Tempo</p>
                  <p className="text-[10px] text-muted-foreground">Notifikasi tagihan yang akan jatuh tempo</p>
                </div>
              </div>
              <button onClick={() => handleToggleDue(!notifyDue)}
                className={`relative w-10 h-5 rounded-full transition-colors ${notifyDue ? 'bg-success' : 'bg-muted-foreground/30'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${notifyDue ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {notifyDue && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">Ingatkan sebelum</p>
                  <p className="text-[10px] text-muted-foreground">Hari sebelum jatuh tempo</p>
                </div>
                <select value={reminderDays} onChange={(e) => handleChangeReminderDays(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg bg-card border border-border text-xs text-foreground">
                  {[1, 2, 3, 5, 7].map(d => <option key={d} value={d}>{d} hari</option>)}
                </select>
              </div>
            )}

            {/* Alert Overdue */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Alert Overdue</p>
                  <p className="text-[10px] text-muted-foreground">Notifikasi tagihan yang sudah melewati jatuh tempo</p>
                </div>
              </div>
              <button onClick={() => handleToggleOverdue(!notifyOverdue)}
                className={`relative w-10 h-5 rounded-full transition-colors ${notifyOverdue ? 'bg-success' : 'bg-muted-foreground/30'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${notifyOverdue ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        )}

        {/* User-friendly Instructions */}
        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 mt-2">
          <div className="flex gap-2">
            <Send className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Cara Menghubungkan Telegram</p>
              <ol className="text-[10px] text-muted-foreground leading-relaxed space-y-0.5 list-decimal list-inside">
                <li>Buka Telegram, cari <strong>@livoria_bot</strong></li>
                <li>Kirim perintah <strong>/start</strong> ke bot</li>
                <li>Bot akan memberikan <strong>Chat ID</strong> Anda</li>
                <li>Salin Chat ID tersebut dan masukkan di kolom di atas</li>
                <li>Klik tombol <strong>Test</strong> untuk memastikan koneksi berhasil</li>
                <li>Klik <strong>Hubungkan</strong> untuk mengaktifkan notifikasi</li>
              </ol>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                💡 <em>Setelah terhubung, Anda akan menerima laporan bulanan, reminder jatuh tempo, dan alert overdue secara otomatis melalui Telegram.</em>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
