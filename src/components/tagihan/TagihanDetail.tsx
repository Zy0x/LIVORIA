import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import {
  ArrowLeft, Upload, Trash2, FileText, Clock,
  DollarSign, CreditCard, X, AlertTriangle, Bell, RotateCcw, Edit2, CalendarDays
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { strukService, historyService, recordPayment } from '@/lib/supabase-service';
import { toast } from '@/hooks/use-toast';
import { CurrencyInput } from '@/components/ui/currency-input';
import { getReminderStatus, getPaymentInfo, formatJadwalBulanan } from '@/lib/tagihan-cycle';
import type { Tagihan, Struk } from '@/lib/types';

import { supabase } from '@/lib/supabase';

async function revertPayment(
  tagihan: Tagihan,
  historyId: string,
  jumlah: number
): Promise<Tagihan> {
  const newTotalDibayar = Math.max(0, Number(tagihan.total_dibayar) - jumlah);
  const newSisaHutang = Number(tagihan.total_hutang) - newTotalDibayar;
  const newStatus =
    newSisaHutang <= 0
      ? 'lunas'
      : tagihan.status === 'lunas'
      ? 'aktif'
      : tagihan.status;

  const { error: delErr } = await supabase
    .from('tagihan_history')
    .delete()
    .eq('id', historyId);
  if (delErr) throw delErr;

  const { data, error } = await supabase
    .from('tagihan')
    .update({
      total_dibayar: newTotalDibayar,
      sisa_hutang: Math.max(0, newSisaHutang),
      status: newStatus,
    })
    .eq('id', tagihan.id)
    .select()
    .single();
  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('tagihan_history').insert({
    tagihan_id: tagihan.id,
    aksi: 'pembayaran_dibatalkan',
    detail: `Pembayaran Rp${jumlah.toLocaleString('id-ID')} dibatalkan/dikembalikan`,
    jumlah: 0,
    user_id: user?.id,
  });

  return data as Tagihan;
}

interface Props {
  item: Tagihan;
  onBack: () => void;
  onRefresh: () => void;
  onEdit?: (item: Tagihan) => void;
  onDelete?: (item: Tagihan) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n);

export default function TagihanDetail({ item, onBack, onRefresh, onEdit, onDelete }: Props) {
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [payFull, setPayFull] = useState(false);
  const [strukUpload, setStrukUpload] = useState(false);
  const [strukKet, setStrukKet] = useState('');
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'info' | 'history' | 'struk'>('info');
  const [revertTarget, setRevertTarget] = useState<{
    id: string;
    jumlah: number;
    detail: string;
  } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const today = new Date();
  const reminder = getReminderStatus(item, today);
  const payInfo = getPaymentInfo(item, today);
  const { isLate, lateMonths } = payInfo;

  const { data: strukList = [] } = useQuery({
    queryKey: ['struk', item.id],
    queryFn: () => strukService.getByTagihan(item.id),
  });
  const { data: history = [] } = useQuery({
    queryKey: ['history', item.id],
    queryFn: () => historyService.getByTagihan(item.id),
  });

  useEffect(() => {
    if (payOpen) {
      setPayNote(payInfo.note);
      setPayAmount(payFull ? Number(item.sisa_hutang) : Number(item.cicilan_per_bulan));
    }
  }, [payOpen, payFull]);

  const payMut = useMutation({
    mutationFn: () => recordPayment(item, payAmount, payDate, payNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tagihan'] });
      qc.invalidateQueries({ queryKey: ['history', item.id] });
      setPayOpen(false);
      setPayAmount(0);
      setPayNote('');
      setPayFull(false);
      onRefresh();
      toast({ title: 'Pembayaran Dicatat', description: `${fmt(payAmount)} berhasil dicatat.` });
    },
    onError: (e: any) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const revertMut = useMutation({
    mutationFn: () => revertPayment(item, revertTarget!.id, revertTarget!.jumlah),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tagihan'] });
      qc.invalidateQueries({ queryKey: ['history', item.id] });
      setRevertTarget(null);
      onRefresh();
      toast({
        title: 'Pembayaran Dibatalkan',
        description: 'Riwayat pembayaran berhasil dibatalkan dan saldo dikembalikan.',
      });
    },
    onError: (e: any) => {
      toast({ title: 'Gagal Membatalkan', description: e.message, variant: 'destructive' });
      setRevertTarget(null);
    },
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => strukService.upload(file, item.id, strukKet),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['struk', item.id] });
      setStrukUpload(false);
      setStrukKet('');
      toast({ title: 'Upload Berhasil' });
    },
    onError: (e: any) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteStrukMut = useMutation({
    mutationFn: (id: string) => strukService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['struk', item.id] });
      toast({ title: 'Struk dihapus' });
    },
  });

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(ref.current, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
    }
  }, []);

  const progressPct =
    Number(item.total_hutang) > 0
      ? Math.min(100, (Number(item.total_dibayar) / Number(item.total_hutang)) * 100)
      : 0;

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all';
  const tabCls = (t: string) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      tab === t
        ? 'bg-primary text-primary-foreground'
        : 'bg-muted text-muted-foreground hover:bg-accent'
    }`;

  const getHistoryIcon = (aksi: string) => {
    if (aksi === 'pembayaran') return 'bg-success';
    if (aksi === 'pembayaran_dibatalkan') return 'bg-destructive';
    if (aksi === 'koreksi') return 'bg-warning';
    return 'bg-info';
  };

  const getHistoryLabel = (aksi: string) => {
    if (aksi === 'pembayaran_dibatalkan') return 'Dibatalkan';
    if (aksi === 'koreksi') return 'Koreksi';
    return aksi.charAt(0).toUpperCase() + aksi.slice(1);
  };

  // Build jadwal display
  const jadwalDisplay = (() => {
    if (item.jenis_tempo !== 'bulanan') return null;
    const bayarDay = item.tgl_bayar_tanggal
      ? new Date(item.tgl_bayar_tanggal).getDate()
      : item.tgl_bayar_hari;
    const tempoDay = item.tgl_tempo_tanggal
      ? new Date(item.tgl_tempo_tanggal).getDate()
      : item.tgl_tempo_hari;
    if (!bayarDay || !tempoDay) return null;
    const crossMonth = tempoDay < bayarDay;
    return { bayarDay, tempoDay, crossMonth };
  })();

  return (
    <div ref={ref}>
      {/* ── Header: Kembali + Aksi (Edit & Hapus) ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-accent transition-all"
                title="Edit tagihan"
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-all"
                title="Hapus tagihan"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Hapus</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reminder Banner */}
      {reminder.level !== 'none' && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl mb-4 border ${
            reminder.level === 'critical' || reminder.level === 'overdue'
              ? 'bg-destructive/10 border-destructive/20'
              : reminder.level === 'warning'
              ? 'bg-warning/10 border-warning/20'
              : 'bg-info/10 border-info/20'
          }`}
        >
          {reminder.level === 'critical' || reminder.level === 'overdue' ? (
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          ) : (
            <Bell
              className="w-5 h-5 shrink-0"
              style={{
                color: reminder.level === 'warning' ? 'hsl(var(--warning))' : 'hsl(var(--info))',
              }}
            />
          )}
          <div>
            <p className={`text-sm font-semibold ${
              reminder.level === 'critical' || reminder.level === 'overdue'
                ? 'text-destructive'
                : reminder.level === 'warning' ? 'text-warning' : 'text-info'
            }`}>
              {reminder.level === 'overdue' ? 'Tagihan Overdue' : reminder.level === 'critical' ? 'Jatuh Tempo Segera' : 'Pengingat Pembayaran'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{reminder.message}</p>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="glass-card p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-lg font-bold">{item.debitur_nama}</h2>
            <p className="text-sm text-muted-foreground">
              {item.barang_nama}{' '}
              {item.debitur_kontak && `· ${item.debitur_kontak}`}
              {item.metode_pembayaran && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-accent text-[10px] font-medium">
                  {item.metode_pembayaran}
                </span>
              )}
            </p>
            <p className={`text-xs mt-1 ${isLate ? 'text-destructive font-semibold' : 'text-info'}`}>
              {isLate && `⚠️ TELAT ${lateMonths} bulan · `}
              Cicilan ke-{payInfo.period.periodIndex} ({payInfo.period.periodLabel}) · Jendela:{' '}
              {payInfo.windowStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
              —{' '}
              {payInfo.windowEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          {/* Tombol Catat Pembayaran — aksi utama yang paling sering dipakai */}
          <button
            onClick={() => { setPayFull(false); setPayOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all shrink-0 self-start"
          >
            <CreditCard className="w-4 h-4" /> Catat Pembayaran
          </button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Dibayar: {fmt(Number(item.total_dibayar))}</span>
            <span>Total: {fmt(Number(item.total_hutang))}</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {progressPct.toFixed(1)}% terbayar · Sisa {fmt(Number(item.sisa_hutang))} ·{' '}
            {payInfo.paidCount}x cicilan dibayar dari {item.jangka_waktu_bulan} bulan
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Harga Awal', value: fmt(Number(item.harga_awal)), icon: DollarSign },
            { label: 'Cicilan/Bulan', value: fmt(Number(item.cicilan_per_bulan)), icon: CreditCard },
            { label: 'Jangka Waktu', value: `${item.jangka_waktu_bulan} bulan`, icon: Clock },
            { label: 'Keuntungan Est.', value: fmt(Number(item.keuntungan_estimasi)), icon: DollarSign },
          ].map((s, i) => (
            <div key={i} className="rounded-lg bg-muted/50 p-3 text-center">
              <s.icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className="text-sm font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button onClick={() => setTab('info')} className={tabCls('info')}>Informasi</button>
        <button onClick={() => setTab('history')} className={tabCls('history')}>History ({history.length})</button>
        <button onClick={() => setTab('struk')} className={tabCls('struk')}>Struk ({strukList.length})</button>
      </div>

      {tab === 'info' && (
        <div className="glass-card p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Tanggal Mulai:</span>
              <p className="font-medium">
                {new Date(item.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            {item.tanggal_jatuh_tempo && (
              <div>
                <span className="text-muted-foreground">Jatuh Tempo Akhir:</span>
                <p className="font-medium">
                  {new Date(item.tanggal_jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
            {item.tanggal_mulai_bayar && (
              <div>
                <span className="text-muted-foreground">Mulai Pembayaran:</span>
                <p className="font-medium">
                  {new Date(item.tanggal_mulai_bayar).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}

            {jadwalDisplay && (
              <div className="col-span-2">
                <span className="text-muted-foreground flex items-center gap-1.5 mb-1">
                  <CalendarDays className="w-3.5 h-3.5" /> Jadwal Bulanan:
                </span>
                <p className="font-medium">
                  Bayar tgl {jadwalDisplay.bayarDay} — Tempo tgl {jadwalDisplay.tempoDay}
                  {jadwalDisplay.crossMonth ? ' (lintas bulan)' : ''}
                </p>
                {item.tgl_bayar_tanggal && item.tgl_tempo_tanggal && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Referensi pertama: {new Date(item.tgl_bayar_tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' → '}
                    {new Date(item.tgl_tempo_tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                <p className="text-xs text-info mt-0.5">
                  Sistem otomatis menghitung jendela bayar setiap bulan berdasarkan pola ini.
                </p>
              </div>
            )}

            <div>
              <span className="text-muted-foreground">Bunga:</span>
              <p className="font-medium">{item.bunga_persen}% / tahun</p>
            </div>
            <div>
              <span className="text-muted-foreground">Denda Overdue:</span>
              <p className="font-medium">{item.denda_persen_per_hari}% / hari</p>
            </div>
            {item.metode_pembayaran && (
              <div>
                <span className="text-muted-foreground">Metode:</span>
                <p className="font-medium">{item.metode_pembayaran}</p>
              </div>
            )}
          </div>

          <div className={`rounded-xl p-3 space-y-1 ${isLate ? 'bg-destructive/5 border border-destructive/20' : 'bg-info/5 border border-info/20'}`}>
            <p className={`text-xs font-semibold ${isLate ? 'text-destructive' : 'text-info'}`}>
              {isLate ? `⚠️ TELAT ${lateMonths} bulan — ` : ''}Cicilan Aktif: Ke-{payInfo.period.periodIndex} ({payInfo.period.periodLabel})
            </p>
            {isLate && (
              <p className="text-xs text-destructive/80">
                Debitur perlu membayar cicilan bulan {payInfo.period.periodLabel} terlebih dahulu sebelum melanjutkan ke bulan berikutnya.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Jendela bayar:{' '}
              {payInfo.windowStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}{' '}
              s/d{' '}
              {payInfo.windowEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xs text-muted-foreground">
              Sudah dibayar: {payInfo.paidCount}x dari {item.jangka_waktu_bulan} bulan
              {isLate && ` · Seharusnya sudah ${payInfo.currentCalendarPeriod - 1}x`}
            </p>
          </div>

          {item.catatan && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Catatan:</p>
              <p className="text-sm">{item.catatan}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="glass-card overflow-hidden">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Belum ada riwayat.</p>
          ) : (
            <>
              <div className="flex items-start gap-2 px-5 py-3 bg-info/5 border-b border-border">
                <RotateCcw className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Klik tombol <span className="font-semibold">Batalkan</span> pada entri pembayaran untuk mengembalikan jumlah ke saldo tagihan.
                </p>
              </div>
              <div className="divide-y divide-border/50">
                {history.map(h => {
                  const isPembayaran = h.aksi === 'pembayaran' && h.jumlah > 0;
                  return (
                    <div key={h.id} className="px-5 py-3 flex items-start gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${getHistoryIcon(h.aksi)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{getHistoryLabel(h.aksi)}</p>
                        <p className="text-xs text-muted-foreground">{h.detail}</p>
                        {h.jumlah > 0 && h.aksi !== 'pembayaran_dibatalkan' && (
                          <p className="text-xs font-semibold text-success mt-0.5">{fmt(h.jumlah)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(h.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </p>
                        {isPembayaran && (
                          <button
                            onClick={() => setRevertTarget({ id: h.id, jumlah: h.jumlah, detail: h.detail })}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 text-destructive text-[10px] font-medium hover:bg-destructive/20 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" /> Batalkan
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'struk' && (
        <div className="space-y-3">
          <button
            onClick={() => setStrukUpload(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-accent transition-all"
          >
            <Upload className="w-4 h-4" /> Upload Struk
          </button>
          {strukList.length === 0 ? (
            <div className="glass-card text-center py-10">
              <p className="text-sm text-muted-foreground">Belum ada struk/bukti.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {strukList.map((s: Struk) => (
                <div key={s.id} className="glass-card p-3 group relative">
                  {s.file_type?.startsWith('image') ? (
                    <button onClick={() => setPreviewImg(s.file_url)} className="w-full">
                      <img src={s.file_url} alt={s.file_name} className="w-full h-32 object-cover rounded-lg" loading="lazy" />
                    </button>
                  ) : (
                    <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-32 rounded-lg bg-muted">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </a>
                  )}
                  <p className="text-xs truncate mt-2">{s.file_name}</p>
                  {s.keterangan && <p className="text-[10px] text-muted-foreground truncate">{s.keterangan}</p>}
                  <button
                    onClick={() => deleteStrukMut.mutate(s.id)}
                    className="absolute top-2 right-2 p-1 rounded bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Catat Pembayaran</DialogTitle>
            <DialogDescription>Input jumlah yang dibayar oleh {item.debitur_nama}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (payAmount > 0) payMut.mutate(); }} className="space-y-4 mt-2">
            <div className="rounded-xl bg-info/5 border border-info/20 p-3 space-y-1">
              <p className="text-xs font-semibold text-info">Cicilan ke-{payInfo.period.periodIndex} · {payInfo.period.periodLabel}</p>
              <p className="text-[11px] text-muted-foreground">
                Jendela: {payInfo.windowStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} — {payInfo.windowEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-[10px] text-muted-foreground">Sudah dibayar: {payInfo.paidCount}x dari {item.jangka_waktu_bulan} bulan</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setPayFull(false); setPayAmount(Number(item.cicilan_per_bulan)); }}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${!payFull ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}>
                Cicilan Bulan Ini
              </button>
              <button type="button" onClick={() => { setPayFull(true); setPayAmount(Number(item.sisa_hutang)); }}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${payFull ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}>
                Lunasi Semua
              </button>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Jumlah Bayar *</label>
              <CurrencyInput value={payAmount} onChange={setPayAmount} placeholder="300.000" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tanggal Bayar</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Keterangan</label>
              <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Cicilan bulan ke-1 (Januari 2026)" className={inputClass} maxLength={200} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setPayOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all">Batal</button>
              <button type="submit" disabled={payMut.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
                {payMut.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Revert Confirm */}
      <Dialog open={!!revertTarget} onOpenChange={v => { if (!v) setRevertTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-destructive">
              <RotateCcw className="w-5 h-5" /> Batalkan Pembayaran
            </DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus riwayat pembayaran dan mengembalikan {revertTarget ? fmt(revertTarget.jumlah) : '-'} ke saldo tagihan.
            </DialogDescription>
          </DialogHeader>
          {revertTarget && (
            <div className="space-y-4 mt-2">
              <div className="rounded-xl border border-border p-3 space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Keterangan</span><span className="font-medium text-foreground truncate max-w-[60%] text-right">{revertTarget.detail}</span></div>
                <div className="flex justify-between"><span>Jumlah dikembalikan</span><span className="font-bold text-destructive">−{fmt(revertTarget.jumlah)}</span></div>
                <div className="border-t border-border pt-2 flex justify-between"><span>Total dibayar baru</span><span className="font-bold">{fmt(Math.max(0, Number(item.total_dibayar) - revertTarget.jumlah))}</span></div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setRevertTarget(null)} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all">Batal</button>
                <button onClick={() => revertMut.mutate()} disabled={revertMut.isPending} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-all disabled:opacity-50">
                  {revertMut.isPending ? 'Membatalkan...' : 'Ya, Batalkan'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Hapus Tagihan</DialogTitle>
            <DialogDescription>Hapus tagihan "{item.debitur_nama} — {item.barang_nama}"? Semua struk dan history terkait juga akan terhapus.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setDeleteConfirmOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]">Batal</button>
            <button
              onClick={() => { setDeleteConfirmOpen(false); if (onDelete) onDelete(item); }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-all min-h-[44px]"
            >
              Hapus
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Struk Modal */}
      <Dialog open={strukUpload} onOpenChange={setStrukUpload}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Upload Struk</DialogTitle>
            <DialogDescription>Upload gambar/PDF struk sebagai bukti (maks 5MB).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Keterangan</label>
              <input type="text" value={strukKet} onChange={e => setStrukKet(e.target.value)} placeholder="Struk pembelian" className={inputClass} maxLength={200} />
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.size > 5 * 1024 * 1024) { toast({ title: 'File terlalu besar', description: 'Maksimal 5MB.', variant: 'destructive' }); return; }
                  uploadMut.mutate(f);
                }
              }}
            />
            <button onClick={() => fileRef.current?.click()} disabled={uploadMut.isPending}
              className="w-full py-8 border-2 border-dashed border-border rounded-lg flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 transition-all">
              <Upload className="w-6 h-6" />
              <span className="text-sm">{uploadMut.isPending ? 'Mengupload...' : 'Pilih file'}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview */}
      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm" onClick={() => setPreviewImg(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-card" onClick={() => setPreviewImg(null)}><X className="w-5 h-5" /></button>
          <img src={previewImg} alt="Preview" className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}