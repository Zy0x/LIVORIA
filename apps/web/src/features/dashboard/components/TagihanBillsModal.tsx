import type { Dispatch, SetStateAction } from 'react';
import { CheckCircle2, CheckSquare, ChevronRight, CreditCard, Square, X, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/app/route-paths';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getPaymentInfo, getReminderStatus, isTagihanOverdue } from '@/lib/tagihan-cycle';
import type { Tagihan } from '@/lib/types';

type ReportMode = 'tempo' | 'rentang';

interface TagihanBillsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  now: Date;
  reportMode: ReportMode;
  dueThisMonth: Tagihan[];
  selectedBillIds: Set<string>;
  selectedBill: Tagihan | null;
  setSelectedBillIds: Dispatch<SetStateAction<Set<string>>>;
  setSelectedBill: Dispatch<SetStateAction<Tagihan | null>>;
  setQuickPayTarget: (tagihan: Tagihan) => void;
  toggleSelectAll: () => void;
  toggleBillSelection: (id: string) => void;
  handlePaySelected: () => void;
  handlePayAll: () => void;
  payingAll: boolean;
  totalDueAmount: number;
  fmt: (value: number) => string;
}

export function TagihanBillsModal({
  open,
  onOpenChange,
  now,
  reportMode,
  dueThisMonth,
  selectedBillIds,
  selectedBill,
  setSelectedBillIds,
  setSelectedBill,
  setQuickPayTarget,
  toggleSelectAll,
  toggleBillSelection,
  handlePaySelected,
  handlePayAll,
  payingAll,
  totalDueAmount,
  fmt,
}: TagihanBillsModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        onOpenChange(value);
        if (!value) {
          setSelectedBillIds(new Set());
          setSelectedBill(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Tagihan{' '}
            {now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </DialogTitle>
          <DialogDescription>
            {dueThisMonth.length} tagihan &middot;{' '}
            {reportMode === 'tempo' ? 'Mode Jatuh Tempo' : 'Mode Rentang Bayar'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mt-2 mb-1">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline min-h-[36px]"
          >
            {selectedBillIds.size === dueThisMonth.length
              ? <CheckSquare className="w-4 h-4" />
              : <Square className="w-4 h-4" />}
            {selectedBillIds.size === dueThisMonth.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
          </button>
          {selectedBillIds.size > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {selectedBillIds.size} dipilih &middot;{' '}
              {fmt(dueThisMonth.filter(item => selectedBillIds.has(item.id)).reduce((sum, item) => sum + Number(item.cicilan_per_bulan), 0))}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {dueThisMonth.map(item => (
            <TagihanBillRow
              key={item.id}
              item={item}
              now={now}
              isSelected={selectedBillIds.has(item.id)}
              isExpanded={selectedBill?.id === item.id}
              setSelectedBill={setSelectedBill}
              setQuickPayTarget={setQuickPayTarget}
              onClose={() => onOpenChange(false)}
              toggleBillSelection={toggleBillSelection}
              fmt={fmt}
            />
          ))}
        </div>

        {dueThisMonth.length > 0 && (
          <div className="pt-3 border-t border-border mt-2 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total cicilan bulan ini:</span>
              <span className="font-bold">{fmt(totalDueAmount)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePaySelected}
                disabled={payingAll || selectedBillIds.size === 0}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-all disabled:opacity-40 min-h-[44px]"
              >
                <Zap className="w-3.5 h-3.5" />
                {selectedBillIds.size > 0 ? `Bayar ${selectedBillIds.size} Terpilih` : 'Pilih dulu'}
              </button>
              <button
                onClick={handlePayAll}
                disabled={payingAll}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-all disabled:opacity-50 min-h-[44px]"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {payingAll ? 'Memproses...' : `Bayar Semua (${dueThisMonth.length})`}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Pilih tagihan dengan checkbox, lalu tekan "Bayar Terpilih". Atau bayar semua sekaligus.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TagihanBillRowProps {
  item: Tagihan;
  now: Date;
  isSelected: boolean;
  isExpanded: boolean;
  setSelectedBill: Dispatch<SetStateAction<Tagihan | null>>;
  setQuickPayTarget: (tagihan: Tagihan) => void;
  onClose: () => void;
  toggleBillSelection: (id: string) => void;
  fmt: (value: number) => string;
}

function TagihanBillRow({
  item,
  now,
  isSelected,
  isExpanded,
  setSelectedBill,
  setQuickPayTarget,
  onClose,
  toggleBillSelection,
  fmt,
}: TagihanBillRowProps) {
  const info = getPaymentInfo(item, now);
  const reminderStatus = getReminderStatus(item, now);

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all ${
        isSelected ? 'border-primary/40 bg-primary/5' : 'border-border'
      }`}
    >
      {isExpanded ? (
        <ExpandedTagihanBill
          item={item}
          info={info}
          reminderStatus={reminderStatus}
          setSelectedBill={setSelectedBill}
          setQuickPayTarget={setQuickPayTarget}
          onClose={onClose}
          fmt={fmt}
        />
      ) : (
        <CollapsedTagihanBill
          item={item}
          now={now}
          info={info}
          isSelected={isSelected}
          setSelectedBill={setSelectedBill}
          toggleBillSelection={toggleBillSelection}
          fmt={fmt}
        />
      )}
    </div>
  );
}

type PaymentInfo = ReturnType<typeof getPaymentInfo>;
type ReminderStatus = ReturnType<typeof getReminderStatus>;

interface ExpandedTagihanBillProps {
  item: Tagihan;
  info: PaymentInfo;
  reminderStatus: ReminderStatus;
  setSelectedBill: Dispatch<SetStateAction<Tagihan | null>>;
  setQuickPayTarget: (tagihan: Tagihan) => void;
  onClose: () => void;
  fmt: (value: number) => string;
}

function ExpandedTagihanBill({
  item,
  info,
  reminderStatus,
  setSelectedBill,
  setQuickPayTarget,
  onClose,
  fmt,
}: ExpandedTagihanBillProps) {
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{item.debitur_nama}</p>
        <button
          onClick={() => setSelectedBill(null)}
          className="p-1 rounded hover:bg-muted"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Barang:</span>
          <p className="font-medium">{item.barang_nama}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Cicilan/Bulan:</span>
          <p className="font-medium">{fmt(Number(item.cicilan_per_bulan))}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Sisa Hutang:</span>
          <p className="font-medium">{fmt(Number(item.sisa_hutang))}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Sudah dibayar:</span>
          <p className="font-medium">{info.paidCount}x cicilan</p>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">
            Cicilan ke-{info.period.periodIndex} ({info.period.periodLabel}):
          </span>
          <p className="font-medium text-info">
            {info.windowStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' '}&mdash;{' '}
            {info.windowEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {reminderStatus.level !== 'none' && (
          <div className="col-span-2">
            <p className={`text-[11px] font-medium leading-relaxed ${
              reminderStatus.level === 'critical' || reminderStatus.level === 'overdue'
                ? 'text-destructive'
                : reminderStatus.level === 'warning'
                  ? 'text-warning'
                  : 'text-info'
            }`}
            >
              {reminderStatus.message}
            </p>
          </div>
        )}
      </div>
      <div className="pt-2 border-t border-border">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Dibayar: {fmt(Number(item.total_dibayar))}</span>
          <span>Total: {fmt(Number(item.total_hutang))}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{
              width: `${Math.min(100, (Number(item.total_dibayar) / Number(item.total_hutang)) * 100)}%`,
            }}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => {
            setSelectedBill(null);
            setTimeout(() => setQuickPayTarget(item), 150);
          }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all min-h-[44px]"
        >
          <CreditCard className="w-3.5 h-3.5" /> Catat Bayar
        </button>
        <Link
          to={ROUTES.TAGIHAN}
          state={{ viewItem: item }}
          onClick={onClose}
          className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-medium hover:bg-accent transition-all min-h-[44px]"
        >
          Detail <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

interface CollapsedTagihanBillProps {
  item: Tagihan;
  now: Date;
  info: PaymentInfo;
  isSelected: boolean;
  setSelectedBill: Dispatch<SetStateAction<Tagihan | null>>;
  toggleBillSelection: (id: string) => void;
  fmt: (value: number) => string;
}

function CollapsedTagihanBill({
  item,
  now,
  info,
  isSelected,
  setSelectedBill,
  toggleBillSelection,
  fmt,
}: CollapsedTagihanBillProps) {
  const reminderLevel = getReminderStatus(item, now).level;
  const dotClass = isTagihanOverdue(item, now)
    ? 'bg-destructive'
    : reminderLevel === 'critical'
      ? 'bg-destructive'
      : reminderLevel === 'warning'
        ? 'bg-warning'
        : 'bg-info';

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => toggleBillSelection(item.id)}
        className="pl-3 py-3 shrink-0 min-w-[36px] min-h-[44px] flex items-center justify-center"
      >
        {isSelected
          ? <CheckSquare className="w-4.5 h-4.5 text-primary" />
          : <Square className="w-4.5 h-4.5 text-muted-foreground" />}
      </button>
      <button
        onClick={() => setSelectedBill(item)}
        className="flex-1 min-w-0 text-left flex items-center gap-3 p-3 pl-0 hover:bg-muted/30 transition-colors min-h-[56px]"
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium break-words">
            {item.debitur_nama} &mdash; {item.barang_nama}
          </p>
          <p className="text-xs text-muted-foreground break-words">
            Ke-{info.period.periodIndex} &middot; {info.period.periodLabel} &middot;
            Tempo {info.windowEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <p className="text-xs font-semibold shrink-0">
          {fmt(Number(item.cicilan_per_bulan))}
        </p>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
    </div>
  );
}
