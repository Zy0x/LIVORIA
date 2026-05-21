import type { Dispatch, SetStateAction } from 'react';
import { AlertTriangle, ChevronRight, CreditCard, ToggleLeft, ToggleRight } from 'lucide-react';

import { getReminderStatus } from '@/lib/tagihan-cycle';
import type { Tagihan } from '@/lib/types';

type ReportMode = 'tempo' | 'rentang';

interface TagihanMonthlyAlertProps {
  now: Date;
  reportMode: ReportMode;
  setReportMode: (mode: ReportMode) => void;
  urgentNow: Tagihan[];
  dueThisMonth: Tagihan[];
  setBillsModalOpen: (open: boolean) => void;
  setQuickPayTarget: (tagihan: Tagihan) => void;
  setSelectedBillIds: Dispatch<SetStateAction<Set<string>>>;
  setSelectedBill: Dispatch<SetStateAction<Tagihan | null>>;
  totalDueAmount: number;
  totalKeuntunganBulanIni: number;
  fmt: (value: number) => string;
}

export function TagihanMonthlyAlert({
  now,
  reportMode,
  setReportMode,
  urgentNow,
  dueThisMonth,
  setBillsModalOpen,
  setQuickPayTarget,
  setSelectedBillIds,
  setSelectedBill,
  totalDueAmount,
  totalKeuntunganBulanIni,
  fmt,
}: TagihanMonthlyAlertProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="section-subtitle">
          Bulan {now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        </p>
        <button
          onClick={() => setReportMode(reportMode === 'tempo' ? 'rentang' : 'tempo')}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors min-h-[32px]"
        >
          {reportMode === 'tempo'
            ? <ToggleLeft className="w-3 h-3" />
            : <ToggleRight className="w-3 h-3 text-primary" />}
          {reportMode === 'tempo' ? 'Jatuh Tempo' : 'Rentang Bayar'}
        </button>
      </div>

      {urgentNow.length > 0 && (
        <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 space-y-2">
          <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {urgentNow.length} tagihan perlu perhatian sekarang
          </p>
          <div className="space-y-1.5">
            {urgentNow.slice(0, 4).map(item => {
              const status = getReminderStatus(item, now);
              return (
                <div key={item.id} className="flex items-center gap-2 rounded-lg bg-background/60 border border-destructive/10 px-2.5 py-2">
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => setBillsModalOpen(true)}
                  >
                    <p className="text-xs font-semibold truncate">{item.debitur_nama} &mdash; {item.barang_nama}</p>
                    <p className={`text-[10px] truncate font-medium ${
                      status.level === 'overdue' || status.level === 'critical'
                        ? 'text-destructive'
                        : 'text-warning'
                    }`}
                    >
                      {status.message.substring(0, 55)}{status.message.length > 55 ? '...' : ''}
                    </p>
                  </button>
                  <button
                    onClick={() => setQuickPayTarget(item)}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold hover:opacity-90 transition-all min-h-[32px]"
                  >
                    <CreditCard className="w-3 h-3" /> Bayar
                  </button>
                </div>
              );
            })}
          </div>
          {urgentNow.length > 4 && (
            <button
              onClick={() => setBillsModalOpen(true)}
              className="text-[10px] text-primary font-medium hover:underline mt-1"
            >
              +{urgentNow.length - 4} tagihan lainnya &mdash; lihat semua
            </button>
          )}
        </div>
      )}

      {dueThisMonth.length > 0 ? (
        <button
          onClick={() => {
            setBillsModalOpen(true);
            setSelectedBillIds(new Set());
            setSelectedBill(null);
          }}
          className="w-full text-left flex items-center gap-3 p-3.5 rounded-xl bg-warning/10 border border-warning/20 hover:bg-warning/15 transition-colors min-h-[56px]"
        >
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {dueThisMonth.length} tagihan &middot; {fmt(totalDueAmount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {reportMode === 'tempo' ? 'Jatuh tempo' : 'Rentang bayar'} bulan ini &middot;
              Est. keuntungan: {fmt(Math.round(totalKeuntunganBulanIni))} &mdash; Klik untuk detail
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      ) : (
        <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            Tidak ada tagihan jatuh tempo bulan ini &#127881;
          </p>
        </div>
      )}
    </div>
  );
}
