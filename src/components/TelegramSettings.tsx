/**
 * TelegramSettings — Komponen pengaturan notifikasi Telegram
 */
import { useState, useEffect } from 'react';
import { Send, Bell, BellOff, CheckCircle2, XCircle, Loader2, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface TelegramSub {
  chat_id: number;
  is_active: boolean;
  notify_monthly_report: boolean;
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
  const [sub, setSub] = useState<TelegramSub | null>(null);
  const [connected, setConnected] = useState(false);

  // Notification preferences
  const [notifyMonthly, setNotifyMonthly] = useState(true);
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
      const { data } = await supabase.functions.invoke('telegram-tagihan', {
        body: { action: 'get_subscription', userId: user?.id },
      });
      if (data?.subscription) {
        const s = data.subscription;
        setSub(s);
        setChatId(String(s.chat_id));
        setConnected(s.is_active);
        setNotifyMonthly(s.notify_monthly_report);
        setNotifyOverdue(s.notify_overdue);
        setNotifyDue(s.notify_due_reminder);
        setReminderDays(s.reminder_days_before);
      }
    } catch { /* silent */ }
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
        setConnected(true);
        toast({ title: '✅ Terhubung!', description: 'Bot Telegram berhasil dihubungkan.' });
        fetchSubscription();
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
      await supabase.functions.invoke('telegram-tagihan', {
        body: { action: 'unregister', userId: user.id },
      });
      setConnected(false);
      toast({ title: 'Terputus', description: 'Notifikasi Telegram dinonaktifkan.' });
    } catch {
      toast({ title: 'Gagal', variant: 'destructive' });
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

  const handleSavePreferences = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.functions.invoke('telegram-tagihan', {
        body: {
          action: 'update_preferences',
          userId: user.id,
          notify_monthly_report: notifyMonthly,
          notify_overdue: notifyOverdue,
          notify_due_reminder: notifyDue,
          reminder_days_before: reminderDays,
        },
      });
      toast({ title: '✅ Disimpan', description: 'Preferensi notifikasi diperbarui.' });
    } catch {
      toast({ title: 'Gagal', variant: 'destructive' });
    }
    setSaving(false);
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
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value.replace(/[^0-9-]/g, ''))}
              placeholder="Contoh: 123456789"
              className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]"
            />
            <button onClick={handleTest} disabled={testing || !chatId.trim()}
              className="px-3 py-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-500/20 hover:bg-blue-500/20 transition-all disabled:opacity-50 min-h-[44px]">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
            Cara mendapatkan Chat ID: Buka <strong>@userinfobot</strong> di Telegram, kirim /start, dan salin ID yang diberikan.
            Atau chat <strong>@livoria_bot</strong> dan kirim /start.
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

            {[
              { label: 'Laporan Bulanan', desc: 'Ringkasan tagihan setiap tanggal 1', icon: MessageSquare, value: notifyMonthly, onChange: setNotifyMonthly },
              { label: 'Reminder Jatuh Tempo', desc: 'Pengingat sebelum tanggal jatuh tempo', icon: Clock, value: notifyDue, onChange: setNotifyDue },
              { label: 'Alert Overdue', desc: 'Notifikasi tagihan yang sudah melewati jatuh tempo', icon: AlertTriangle, value: notifyOverdue, onChange: setNotifyOverdue },
            ].map((pref, i) => {
              const Icon = pref.icon;
              return (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{pref.label}</p>
                      <p className="text-[10px] text-muted-foreground">{pref.desc}</p>
                    </div>
                  </div>
                  <button onClick={() => pref.onChange(!pref.value)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${pref.value ? 'bg-success' : 'bg-muted-foreground/30'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${pref.value ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              );
            })}

            {notifyDue && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">Ingatkan sebelum</p>
                  <p className="text-[10px] text-muted-foreground">Hari sebelum jatuh tempo</p>
                </div>
                <select value={reminderDays} onChange={(e) => setReminderDays(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg bg-card border border-border text-xs text-foreground">
                  {[1, 2, 3, 5, 7].map(d => <option key={d} value={d}>{d} hari</option>)}
                </select>
              </div>
            )}

            <button onClick={handleSavePreferences} disabled={saving}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50">
              {saving ? 'Menyimpan...' : 'Simpan Preferensi'}
            </button>
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
