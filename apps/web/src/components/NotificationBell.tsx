import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import gsap from 'gsap';
import { Bell, AlertTriangle, Clock, CreditCard, X, ChevronRight } from 'lucide-react';
import { tagihanService } from '@/lib/supabase-service';
import { getReminderStatus } from '@/lib/tagihan-cycle';
import type { Tagihan } from '@/lib/types';

interface Reminder {
  item: Tagihan;
  level: 'info' | 'warning' | 'critical' | 'overdue';
  message: string;
}

function getReminders(bills: Tagihan[]): Reminder[] {
  const today = new Date();
  const reminders: Reminder[] = [];

  for (const item of bills) {
    if (item.status === 'lunas' || item.status === 'ditunda') continue;

    const status = getReminderStatus(item, today);

    if (status.level === 'none') continue;

    reminders.push({
      item,
      level: status.level === 'overdue' ? 'critical' : status.level as 'info' | 'warning' | 'critical',
      message: status.message,
    });
  }

  return reminders.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return (order[a.level] ?? 3) - (order[b.level] ?? 3);
  });
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n);

interface Props {
  onViewTagihan?: (item: Tagihan) => void;
}

export default function NotificationBell({ onViewTagihan }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: bills = [] } = useQuery({
    queryKey: ['tagihan'],
    queryFn: tagihanService.getAll,
  });

  const reminders = useMemo(() => getReminders(bills), [bills]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        gsap.to(panelRef.current, {
          opacity: 0,
          y: -8,
          scale: 0.95,
          duration: 0.15,
          onComplete: () => setOpen(false),
        });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && panelRef.current) {
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: -8, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'back.out(2)' }
      );
    }
  }, [open]);

  const criticalCount = reminders.filter(r => r.level === 'critical').length;
  const totalCount = reminders.length;

  const levelIcon = (l: string) =>
    l === 'critical' ? (
      <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
    ) : l === 'warning' ? (
      <Clock className="w-3.5 h-3.5 text-warning" />
    ) : (
      <CreditCard className="w-3.5 h-3.5 text-info" />
    );

  const levelBg = (l: string) =>
    l === 'critical'
      ? 'bg-destructive/10 border-destructive/20'
      : l === 'warning'
      ? 'bg-warning/10 border-warning/20'
      : 'bg-info/10 border-info/20';

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {totalCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center text-[9px] font-bold rounded-full min-w-[18px] h-[18px] ${
              criticalCount > 0
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-warning text-warning-foreground'
            }`}
          >
            {totalCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-display font-semibold text-sm">Pengingat Pembayaran</h3>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {reminders.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Tidak ada pengingat saat ini.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Semua tagihan dalam kondisi aman 🎉
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {reminders.map((r, i) => (
                  <button
                    key={`${r.item.id}-${i}`}
                    onClick={() => {
                      onViewTagihan?.(r.item);
                      setOpen(false);
                    }}
                    className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div
                      className={`mt-0.5 p-1.5 rounded-lg border ${levelBg(r.level)} shrink-0`}
                    >
                      {levelIcon(r.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.item.debitur_nama}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.item.barang_nama} ·{' '}
                        {fmt(Number(r.item.cicilan_per_bulan))}/bln
                      </p>
                      <p
                        className={`text-xs mt-0.5 font-medium leading-relaxed ${
                          r.level === 'critical'
                            ? 'text-destructive'
                            : r.level === 'warning'
                            ? 'text-warning'
                            : 'text-info'
                        }`}
                      >
                        {r.message}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {reminders.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/30">
              <p className="text-[10px] text-muted-foreground text-center">
                {criticalCount > 0
                  ? `⚠️ ${criticalCount} tagihan kritis perlu tindakan segera`
                  : `${totalCount} pengingat aktif`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}