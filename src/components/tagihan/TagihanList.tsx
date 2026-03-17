import { useState, useMemo } from 'react';
import { Edit2, Trash2, Eye, Calendar, CreditCard, MoreVertical, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useBackGesture } from '@/hooks/useBackGesture';
import type { Tagihan, TagihanStatus } from '@/lib/types';

interface Props {
  data: Tagihan[];
  isLoading: boolean;
  onEdit: (item: Tagihan) => void;
  onDelete: (item: Tagihan) => void;
  onView: (item: Tagihan) => void;
  onAdd: () => void;
  onQuickPay: (item: Tagihan) => void;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const fmtDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const statusBadge: Record<TagihanStatus, { label: string; cls: string }> = {
  aktif: { label: 'Aktif', cls: 'badge-ongoing' },
  lunas: { label: 'Lunas', cls: 'badge-completed' },
  overdue: { label: 'Overdue', cls: 'badge-unpaid' },
  ditunda: { label: 'Ditunda', cls: 'badge-planned' },
};

const getPaidInfo = (t: Tagihan) => {
  const cicilan = Number(t.cicilan_per_bulan);
  const dibayar = Number(t.total_dibayar);
  if (cicilan <= 0) return { count: 0, total: dibayar };
  const count = Math.floor(dibayar / cicilan);
  return { count, total: dibayar };
};

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 50, 100, 1000] as const;

export default function TagihanList({ data, isLoading, onEdit, onDelete, onView, onAdd, onQuickPay }: Props) {
  const [actionItem, setActionItem] = useState<Tagihan | null>(null);
  const [pageSize, setPageSize] = useState<number | 'all'>(20);
  const [currentPage, setCurrentPage] = useState(1);

  useBackGesture(!!actionItem, () => setActionItem(null), 'tagihan-action-menu');

  const totalItems = data.length;
  const effectivePageSize = pageSize === 'all' ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    if (pageSize === 'all') return data;
    const start = (safePage - 1) * effectivePageSize;
    return data.slice(start, start + effectivePageSize);
  }, [data, safePage, effectivePageSize, pageSize]);

  const handleAction = (action: 'pay' | 'view' | 'edit' | 'delete') => {
    if (!actionItem) return;
    const item = actionItem;
    setActionItem(null);
    setTimeout(() => {
      switch (action) {
        case 'pay': onQuickPay(item); break;
        case 'view': onView(item); break;
        case 'edit': onEdit(item); break;
        case 'delete': onDelete(item); break;
      }
    }, 150);
  };

  if (isLoading) {
    return (
      <div className="glass-card flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass-card text-center py-16">
        <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Belum ada tagihan tercatat.</p>
        <button onClick={onAdd} className="mt-3 text-sm text-primary font-medium hover:underline">+ Tambah tagihan pertama</button>
      </div>
    );
  }

  const getDateInfo = (t: Tagihan) => {
    if (t.jenis_tempo === 'bulanan') {
      // Prioritas: tgl_bayar_tanggal (baru) → tgl_bayar_hari (lama)
      const bayarDay = t.tgl_bayar_tanggal
        ? new Date(t.tgl_bayar_tanggal).getDate()
        : t.tgl_bayar_hari;
      const tempoDay = t.tgl_tempo_tanggal
        ? new Date(t.tgl_tempo_tanggal).getDate()
        : t.tgl_tempo_hari;

      if (bayarDay && tempoDay) {
        const crossMonth = tempoDay < bayarDay;
        return `Bayar tgl ${bayarDay} — Tempo tgl ${tempoDay}${crossMonth ? ' (lintas bln)' : ''}`;
      }
    }
    if (t.tanggal_jatuh_tempo) return `Tempo ${fmtDate(t.tanggal_jatuh_tempo)}`;
    return '—';
  };

  return (
    <>
      <div className="glass-card overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto" data-horizontal-scroll>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Debitur</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Barang</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Harga Awal</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Cicilan/Bln</th>
                <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Jangka</th>
                <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3">Sudah Dibayar</th>
                <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Sisa Hutang</th>
                <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-36">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(t => {
                const badge = statusBadge[t.status];
                const paid = getPaidInfo(t);
                return (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onView(t)}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{t.debitur_nama}</p>
                      {t.debitur_kontak && <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{t.debitur_kontak}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm">{t.barang_nama}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{fmt(Number(t.harga_awal))}</td>
                    <td className="px-4 py-3 text-sm text-right">{fmt(Number(t.cicilan_per_bulan))}</td>
                    <td className="px-4 py-3 text-sm text-center">{t.jangka_waktu_bulan} bln</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                          <CheckCircle2 className="w-3 h-3" /> {paid.count}x
                        </span>
                        <span className="text-[10px] text-muted-foreground">{fmt(paid.total)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">{fmt(Number(t.sisa_hutang))}</td>
                    <td className="px-4 py-3 text-center"><span className={badge.cls}>{badge.label}</span></td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {t.status !== 'lunas' && (
                          <button onClick={() => onQuickPay(t)} className="p-1.5 rounded-md hover:bg-primary/10 transition-colors" title="Catat Bayar">
                            <CreditCard className="w-3.5 h-3.5 text-primary" />
                          </button>
                        )}
                        <button onClick={() => onView(t)} className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Detail"><Eye className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => onEdit(t)} className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => onDelete(t)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="Hapus"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border/50">
          {paginatedData.map(t => {
            const badge = statusBadge[t.status];
            const paid = getPaidInfo(t);
            return (
              <div key={t.id} className="px-4 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3">
                  <button className="flex-1 min-w-0 text-left" onClick={() => onView(t)}>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold truncate">{t.debitur_nama}</p>
                      <span className={`${badge.cls} text-[10px] px-1.5 py-0.5 shrink-0`}>{badge.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{t.barang_nama}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{getDateInfo(t)}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs font-bold">{fmt(Number(t.sisa_hutang))}</span>
                      <span className="text-[10px] text-muted-foreground">{fmt(Number(t.cicilan_per_bulan))}/bln</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-success">
                        <CheckCircle2 className="w-2.5 h-2.5" /> {paid.count}x ({fmt(paid.total)})
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActionItem(t); }}
                    className="p-2.5 rounded-lg hover:bg-muted transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <MoreVertical className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {data.length > 5 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Tampilkan:</span>
              <select
                value={pageSize === 'all' ? 'all' : pageSize}
                onChange={e => {
                  const v = e.target.value;
                  setPageSize(v === 'all' ? 'all' : Number(v));
                  setCurrentPage(1);
                }}
                className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20 min-h-[36px]"
              >
                {PAGE_SIZE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
                <option value="all">Semua ({data.length})</option>
              </select>
              <span className="text-xs text-muted-foreground">
                {pageSize !== 'all' ? `${(safePage - 1) * effectivePageSize + 1}–${Math.min(safePage * effectivePageSize, totalItems)} dari ${totalItems}` : `${totalItems} tagihan`}
              </span>
            </div>
            {pageSize !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-30 min-w-[36px] min-h-[36px] flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) page = i + 1;
                  else if (safePage <= 3) page = i + 1;
                  else if (safePage >= totalPages - 2) page = totalPages - 4 + i;
                  else page = safePage - 2 + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[36px] min-h-[36px] rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                        safePage === page ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-30 min-w-[36px] min-h-[36px] flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Action Dialog */}
      <Dialog open={!!actionItem} onOpenChange={v => { if (!v) setActionItem(null); }}>
        <DialogContent className="sm:max-w-sm !top-auto !bottom-0 !translate-y-0 !translate-x-[-50%] rounded-t-2xl rounded-b-none sm:!top-[50%] sm:!bottom-auto sm:!translate-y-[-50%] sm:rounded-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-sm text-left">{actionItem?.debitur_nama}</DialogTitle>
            <DialogDescription className="text-xs text-left">
              {actionItem?.barang_nama} · {actionItem ? fmt(Number(actionItem.sisa_hutang)) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 mt-1">
            {actionItem?.status !== 'lunas' && (
              <button onClick={() => handleAction('pay')}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-muted transition-colors text-primary active:bg-primary/10">
                <CreditCard className="w-5 h-5" /> <span className="text-sm font-medium">Catat Pembayaran</span>
              </button>
            )}
            <button onClick={() => handleAction('view')}
              className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-muted transition-colors active:bg-accent">
              <Eye className="w-5 h-5 text-muted-foreground" /> <span className="text-sm font-medium">Lihat Detail</span>
            </button>
            <button onClick={() => handleAction('edit')}
              className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-muted transition-colors active:bg-accent">
              <Edit2 className="w-5 h-5 text-muted-foreground" /> <span className="text-sm font-medium">Edit Tagihan</span>
            </button>
            <button onClick={() => handleAction('delete')}
              className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-muted transition-colors text-destructive active:bg-destructive/10">
              <Trash2 className="w-5 h-5" /> <span className="text-sm font-medium">Hapus Tagihan</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}