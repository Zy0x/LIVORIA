import { useState, useMemo } from 'react';
import {
  Edit2, Trash2, Eye, CreditCard, MoreVertical,
  CheckCircle2, ChevronLeft, ChevronRight,
  X, Banknote, Clock, ArrowRight,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useBackGesture } from '@/hooks/useBackGesture';
import type { Tagihan, TagihanStatus } from '@/lib/types';

interface Props {
  data:       Tagihan[];
  isLoading:  boolean;
  onEdit:     (item: Tagihan) => void;
  onDelete:   (item: Tagihan) => void;
  onView:     (item: Tagihan) => void;
  onAdd:      () => void;
  onQuickPay: (item: Tagihan) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}rb`;
  return String(Math.round(n));
};

const STATUS_CONFIG: Record<TagihanStatus, { label: string; cls: string }> = {
  aktif:   { label: 'Aktif',   cls: 'status-aktif'   },
  lunas:   { label: 'Lunas',   cls: 'status-lunas'   },
  overdue: { label: 'Overdue', cls: 'status-overdue' },
  ditunda: { label: 'Ditunda', cls: 'status-ditunda' },
};

const PAGE_SIZES = [10, 20, 50, 100] as const;

function getPaidInfo(t: Tagihan) {
  const cicilan = Number(t.cicilan_per_bulan);
  const dibayar = Number(t.total_dibayar);
  const count   = cicilan > 0 ? Math.floor(dibayar / cicilan) : 0;
  return { count, total: dibayar };
}

function getDateLabel(t: Tagihan): string {
  if (t.jenis_tempo === 'bulanan') {
    const bd = t.tgl_bayar_tanggal ? new Date(t.tgl_bayar_tanggal).getDate() : t.tgl_bayar_hari;
    const td = t.tgl_tempo_tanggal ? new Date(t.tgl_tempo_tanggal).getDate() : t.tgl_tempo_hari;
    if (bd && td) return `Tgl ${bd} — ${td}`;
  }
  if (t.tanggal_jatuh_tempo) {
    return new Date(t.tanggal_jatuh_tempo).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }
  return '—';
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function TagihanList({
  data, isLoading, onEdit, onDelete, onView, onAdd, onQuickPay,
}: Props) {
  const [actionItem,   setActionItem]  = useState<Tagihan | null>(null);
  const [pageSize,     setPageSize]    = useState<number>(20);
  const [currentPage,  setCurrentPage] = useState(1);

  useBackGesture(!!actionItem, () => setActionItem(null), 'tagihan-action-menu');

  const totalItems    = data.length;
  const totalPages    = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage      = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize]);

  const handleAction = (action: 'pay' | 'view' | 'edit' | 'delete') => {
    if (!actionItem) return;
    const item = actionItem;
    setActionItem(null);
    setTimeout(() => {
      if (action === 'pay')    onQuickPay(item);
      if (action === 'view')   onView(item);
      if (action === 'edit')   onEdit(item);
      if (action === 'delete') onDelete(item);
    }, 150);
  };

  /* ─── Loading ────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ─── Empty ──────────────────────────────────────────────────── */
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card text-center py-20 px-6">
        <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Belum ada tagihan tercatat</p>
        <button
          onClick={onAdd}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
        >
          + Tambah tagihan pertama
        </button>
      </div>
    );
  }

  return (
    <>
      {/* ═══════ DESKTOP TABLE ═══════════════════════════════════════════ */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto" data-horizontal-scroll>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Debitur & Barang', 'Modal', 'Cicilan/Bln', 'Progress', 'Sisa', 'Status', 'Aksi'].map((h, i) => (
                  <th
                    key={h}
                    className={`tagihan-table py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap px-4 ${
                      i === 0 ? 'text-left px-5' :
                      i === 6 ? 'text-center w-28' :
                      i === 3 ? 'text-center' :
                      'text-right'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginatedData.map(t => {
                const cfg  = STATUS_CONFIG[t.status];
                const paid = getPaidInfo(t);
                const pct  = Number(t.total_hutang) > 0
                  ? Math.min(100, (Number(t.total_dibayar) / Number(t.total_hutang)) * 100)
                  : 0;
                return (
                  <tr
                    key={t.id}
                    className="tagihan-row group cursor-pointer"
                    onClick={() => onView(t)}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                        {t.debitur_nama}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-1">
                        {t.barang_nama}
                        {t.debitur_kontak && (
                          <span className="text-muted-foreground/60 ml-1.5">· {t.debitur_kontak}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{getDateLabel(t)}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p
                        className="text-sm font-semibold tabular-nums"
                        style={{ fontFamily: "'DM Mono', monospace", letterSpacing: '-0.02em' }}
                      >
                        {fmt(Number(t.harga_awal))}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t.jangka_waktu_bulan} bln · {t.bunga_persen}%
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p
                        className="text-sm font-semibold tabular-nums text-primary"
                        style={{ fontFamily: "'DM Mono', monospace", letterSpacing: '-0.02em' }}
                      >
                        {fmt(Number(t.cicilan_per_bulan))}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">/bulan</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="min-w-[120px] space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5 text-success font-medium">
                            <CheckCircle2 className="w-2.5 h-2.5" /> {paid.count}x
                          </span>
                          <span>{pct.toFixed(0)}%</span>
                        </div>
                        <ProgressBar value={Number(t.total_dibayar)} total={Number(t.total_hutang)} />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p
                        className="text-sm font-bold tabular-nums"
                        style={{ fontFamily: "'DM Mono', monospace", letterSpacing: '-0.02em' }}
                      >
                        {fmt(Number(t.sisa_hutang))}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        dari {fmt(Number(t.total_hutang))}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={cfg.cls}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {t.status !== 'lunas' && (
                          <button
                            onClick={() => onQuickPay(t)}
                            title="Catat Bayar"
                            className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-primary" />
                          </button>
                        )}
                        <button onClick={() => onView(t)}   title="Detail"  className="p-1.5 rounded-lg hover:bg-accent transition-colors"><Eye    className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => onEdit(t)}   title="Edit"    className="p-1.5 rounded-lg hover:bg-accent transition-colors"><Edit2  className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => onDelete(t)} title="Hapus"   className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive"     /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.length > 10 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-border/50 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-muted-foreground">Tampilkan</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20 min-h-[34px]"
              >
                {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
                <option value={totalItems}>Semua ({totalItems})</option>
              </select>
              <span className="text-xs text-muted-foreground">
                {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, totalItems)} dari {totalItems}
              </span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-30 w-8 h-8 flex items-center justify-center"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5)                 page = i + 1;
                  else if (safePage <= 3)               page = i + 1;
                  else if (safePage >= totalPages - 2)  page = totalPages - 4 + i;
                  else                                  page = safePage - 2 + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                        safePage === page
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent text-muted-foreground'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-30 w-8 h-8 flex items-center justify-center"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════ MOBILE CARDS (SUDAH DIPERBAIKI) ════════════════════════════════ */}
      <div className="md:hidden space-y-2.5">
        {paginatedData.map(t => {
          const cfg  = STATUS_CONFIG[t.status];
          const paid = getPaidInfo(t);
          const pct  = Number(t.total_hutang) > 0
            ? Math.min(100, (Number(t.total_dibayar) / Number(t.total_hutang)) * 100)
            : 0;

          return (
            <div key={t.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => onView(t)}
                className="w-full text-left p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-foreground">{t.debitur_nama}</p>
                      <span className={cfg.cls}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{t.barang_nama}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{getDateLabel(t)}</p>
                  </div>

                  {/* Sisa Hutang - tetap short karena ruang terbatas */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {fmtShort(Number(t.sisa_hutang))}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">sisa</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-0.5 text-success font-medium">
                      <CheckCircle2 className="w-3 h-3" /> {paid.count}x dibayar
                    </span>

                    {/* CICILAN PER BULAN → FULL FORMAT (PERBAIKAN UTAMA) */}
                    <div className="text-right">
                      <span className="font-semibold text-primary tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {fmt(Number(t.cicilan_per_bulan))}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-1">/bln</span>
                    </div>
                  </div>

                  <ProgressBar value={Number(t.total_dibayar)} total={Number(t.total_hutang)} />
                </div>
              </button>

              {/* Action bar tetap sama */}
              <div className="flex border-t border-border/40 divide-x divide-border/40">
                {t.status !== 'lunas' && (
                  <button onClick={() => onQuickPay(t)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors min-h-[40px]">
                    <CreditCard className="w-3.5 h-3.5" /> Bayar
                  </button>
                )}
                <button onClick={() => onView(t)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors min-h-[40px]">
                  <Eye className="w-3.5 h-3.5" /> Detail
                </button>
                <button onClick={e => { e.stopPropagation(); setActionItem(t); }} className="flex items-center justify-center px-3 py-2.5 text-muted-foreground hover:bg-muted/40 transition-colors min-h-[40px]">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Mobile pagination tetap sama */}
        {data.length > pageSize && (
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-accent disabled:opacity-30 transition-colors">
              ← Sebelumnya
            </button>
            <span className="text-xs text-muted-foreground">{safePage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-accent disabled:opacity-30 transition-colors">
              Berikutnya →
            </button>
          </div>
        )}
      </div>

      {/* ═══════ PREMIUM MOBILE ACTION BOTTOM SHEET ══════════════════════════ */}
      <Dialog open={!!actionItem} onOpenChange={v => { if (!v) setActionItem(null); }}>
        <DialogContent className="
          sm:max-w-sm
          !top-auto !bottom-0 !translate-y-0 !translate-x-[-50%]
          rounded-t-[28px] rounded-b-none
          sm:!top-[50%] sm:!bottom-auto sm:!translate-y-[-50%] sm:rounded-2xl
          max-h-[85vh] overflow-hidden p-0
          border-t border-x border-border/60
        ">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-0.5 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* ── Identity card ────────────────────────────────────────── */}
          {actionItem && (
            <div className="mx-4 mt-3 mb-3 p-4 rounded-2xl bg-muted/40 border border-border/50">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-bold text-foreground leading-tight">{actionItem.debitur_nama}</p>
                    <span className={STATUS_CONFIG[actionItem.status].cls + ' text-[10px]'}>
                      {STATUS_CONFIG[actionItem.status].label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{actionItem.barang_nama}</p>

                  {/* Stat row */}
                  <div className="flex items-center gap-4 mt-2.5">
                    <div className="flex items-center gap-1.5">
                      <Banknote className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[11px] font-bold tabular-nums text-foreground">
                        {fmtShort(Number(actionItem.sisa_hutang))} 
                      </span>
                      <span className="text-[10px] text-muted-foreground">sisa</span>
                    </div>
                    <div className="w-px h-3 bg-border/60" />
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[11px] font-bold tabular-nums text-primary">
                        {fmt(Number(actionItem.cicilan_per_bulan))}
                      </span>
                      <span className="text-[10px] text-muted-foreground">/bln</span>
                    </div>
                  </div>

                  {/* Mini progress */}
                  <div className="mt-2.5">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (Number(actionItem.total_dibayar) / Number(actionItem.total_hutang)) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">
                      {((Number(actionItem.total_dibayar) / Number(actionItem.total_hutang)) * 100).toFixed(0)}% terbayar
                      · {actionItem.jangka_waktu_bulan} bulan tenor
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Action buttons ────────────────────────────────────────── */}
          <div className="px-4 pb-8 space-y-2">

            {/* PRIMARY: Catat Pembayaran */}
            {actionItem?.status !== 'lunas' && (
              <button
                onClick={() => handleAction('pay')}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98]"
              >
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold">Catat Pembayaran</p>
                  <p className="text-[10px] opacity-70">
                    Cicilan {fmt(Number(actionItem?.cicilan_per_bulan ?? 0))} bulan ini
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 opacity-50 shrink-0" />
              </button>
            )}

            {/* Detail */}
            <button
              onClick={() => handleAction('view')}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-muted/50 hover:bg-muted transition-all active:scale-[0.98] border border-border/40"
            >
              <div className="w-9 h-9 rounded-xl bg-info/15 flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4 text-info" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Lihat Detail</p>
                <p className="text-[10px] text-muted-foreground">Riwayat, struk, dan info lengkap</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            </button>

            {/* Edit */}
            <button
              onClick={() => handleAction('edit')}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-muted/50 hover:bg-muted transition-all active:scale-[0.98] border border-border/40"
            >
              <div className="w-9 h-9 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
                <Edit2 className="w-4 h-4 text-warning" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Edit Tagihan</p>
                <p className="text-[10px] text-muted-foreground">Ubah data, status, atau jadwal</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            </button>

            {/* Delete */}
            <button
              onClick={() => handleAction('delete')}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-destructive/6 hover:bg-destructive/12 transition-all active:scale-[0.98] border border-destructive/15"
            >
              <div className="w-9 h-9 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-destructive">Hapus Tagihan</p>
                <p className="text-[10px] text-destructive/60">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </button>

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}