import { CreditCard } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CurrencyInput } from '@/components/ui/currency-input';

import { validateQuickPay } from '../domain/tagihan-payment';
import type { Tagihan } from '../types/tagihan.types';

interface TagihanQuickPayDialogProps {
  item: Tagihan | null;
  amount: number;
  date: string;
  note: string;
  payFull: boolean;
  isPending: boolean;
  inputClass: string;
  onAmountChange: (value: number) => void;
  onDateChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onPayFullChange: (value: boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function TagihanQuickPayDialog({
  item,
  amount,
  date,
  note,
  payFull,
  isPending,
  inputClass,
  onAmountChange,
  onDateChange,
  onNoteChange,
  onPayFullChange,
  onClose,
  onSubmit,
}: TagihanQuickPayDialogProps) {
  return (
    <Dialog open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-base">
            <CreditCard className="w-5 h-5 text-primary" /> Catat Pembayaran
          </DialogTitle>
          <DialogDescription className="text-xs">
            {item?.debitur_nama} - {item?.barang_nama}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (validateQuickPay(item, amount).valid) onSubmit();
          }}
          className="space-y-4 mt-2"
        >
          <div className="flex gap-2">
            <button type="button" onClick={() => onPayFullChange(false)} className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${!payFull ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}>
              Cicilan
            </button>
            <button type="button" onClick={() => onPayFullChange(true)} className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${payFull ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}>
              Lunasi Semua
            </button>
          </div>
          <div>
            <label className="label-text mb-1.5 block">Jumlah Bayar *</label>
            <CurrencyInput value={amount} onChange={onAmountChange} placeholder="300.000" />
          </div>
          <div>
            <label className="label-text mb-1.5 block">Tanggal Bayar</label>
            <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="label-text mb-1.5 block">Keterangan</label>
            <input type="text" value={note} onChange={(event) => onNoteChange(event.target.value)} className={inputClass} maxLength={200} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]">
              Batal
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]">
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

