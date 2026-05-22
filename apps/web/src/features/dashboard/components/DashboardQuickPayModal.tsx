import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { recordPayment } from '@/lib/supabase-service';
import type { Tagihan } from '@/lib/types';
import { getPaymentInfo } from '@/lib/tagihan-cycle';
import { validateQuickPay } from '@/features/tagihan/domain/tagihan-payment';
import { formatCurrencyIDR } from '@/shared/formatters/currency';

interface DashboardQuickPayModalProps {
  item: Tagihan | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DashboardQuickPayModal({ item, onClose, onSuccess }: DashboardQuickPayModalProps) {
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [payFull, setPayFull] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  const payMut = useMutation({
    mutationFn: () => recordPayment(item!, amount, payDate, note),
    onSuccess: () => {
      onSuccess();
      onClose();
      toast({ title: 'Pembayaran Dicatat', description: `${formatCurrencyIDR(amount)} berhasil dicatat.` });
    },
    onError: (e) => toast({ title: 'Error', description: e instanceof Error ? e.message : 'Terjadi kesalahan.', variant: 'destructive' }),
  });

  useEffect(() => {
    if (!item) return;
    const today = new Date();
    const info = getPaymentInfo(item, today);
    setPayFull(false);
    setAmount(Number(item.cicilan_per_bulan));
    setPayDate(new Date().toISOString().split('T')[0]);
    setNote(info.note);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    setAmount(payFull ? Number(item.sisa_hutang) : Number(item.cicilan_per_bulan));
  }, [payFull, item]);

  if (!item) return null;

  const today = new Date();
  const info = getPaymentInfo(item, today);
  const ic = 'w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all';
  const quickPayValidation = validateQuickPay(item, amount);

  return (
    <Dialog open={!!item} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-base">
            <CreditCard className="w-5 h-5 text-primary" /> Catat Pembayaran
          </DialogTitle>
          <DialogDescription className="text-xs">
            {item.debitur_nama} - {item.barang_nama}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="rounded-xl bg-info/5 border border-info/20 p-3 space-y-1">
            <p className="text-xs font-semibold text-info">
              Cicilan ke-{info.period.periodIndex} · {info.period.periodLabel}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Jendela: {info.windowStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' '}—{' '}
              {info.windowEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Sudah dibayar: {info.paidCount}x dari {item.jangka_waktu_bulan} bulan
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPayFull(false)}
              className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${!payFull ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}
            >
              Cicilan ({formatCurrencyIDR(Number(item.cicilan_per_bulan))})
            </button>
            <button
              type="button"
              onClick={() => setPayFull(true)}
              className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${payFull ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}
            >
              Lunasi Semua
            </button>
          </div>

          <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sisa hutang</span>
              <span className="font-semibold">{formatCurrencyIDR(Number(item.sisa_hutang))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sudah dibayar</span>
              <span className="font-semibold text-success">{formatCurrencyIDR(Number(item.total_dibayar))}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Jumlah Bayar</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount ? amount.toLocaleString('id-ID') : ''}
                onChange={e => {
                  const v = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                  setAmount(Number(v) || 0);
                }}
                className={`${ic} pl-10`}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tanggal Bayar</label>
            <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className={ic} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Keterangan</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} className={ic} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]"
            >
              Batal
            </button>
            <button
              onClick={() => { if (quickPayValidation.valid) payMut.mutate(); }}
              disabled={payMut.isPending || !quickPayValidation.valid}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]"
            >
              {payMut.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
