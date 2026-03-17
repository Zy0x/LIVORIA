import { useState, useMemo } from 'react';
import { Calculator, Plus, X, ChevronDown, ChevronUp, Wallet, TrendingUp, Banknote, PiggyBank, Info, Search, Check, DollarSign, EyeOff, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useBackGesture } from '@/hooks/useBackGesture';
import type { Tagihan } from '@/lib/types';

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  allTagihan: Tagihan[];
}

interface NewItemInput {
  nama: string;
  hargaBarang: number;
  angsuranPerBulan: number;
  jangkaWaktu: number;
  bungaPersen: number;
  fromExisting: string;
}

const emptyNewItem: NewItemInput = { nama: '', hargaBarang: 0, angsuranPerBulan: 0, jangkaWaktu: 1, bungaPersen: 0, fromExisting: '' };

export default function TagihanCalculator({ open, onOpenChange, allTagihan }: Props) {
  const [selectedModalIds, setSelectedModalIds] = useState<string[]>([]);
  const [selectedNewTagihanIds, setSelectedNewTagihanIds] = useState<string[]>([]);
  const [newItems, setNewItems] = useState<NewItemInput[]>([{ ...emptyNewItem }]);
  const [showDetail, setShowDetail] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [newTagihanSearch, setNewTagihanSearch] = useState('');
  const [saldoRekening, setSaldoRekening] = useState(0);
  const [inputMode, setInputMode] = useState<'existing' | 'manual'>('existing');
  // Toggle untuk menampilkan tagihan lunas
  const [showLunasModal, setShowLunasModal] = useState(false);
  const [showLunasNew, setShowLunasNew] = useState(false);

  useBackGesture(open, () => onOpenChange(false), 'tagihan-calc');

  // ── Sumber Modal ──
  // Pisahkan aktif dan lunas
  const modalSourcesAktif = useMemo(() =>
    allTagihan.filter(t => Number(t.total_dibayar) > 0 && t.status !== 'lunas'),
  [allTagihan]);

  const modalSourcesLunas = useMemo(() =>
    allTagihan.filter(t => Number(t.total_dibayar) > 0 && t.status === 'lunas'),
  [allTagihan]);

  const modalSources = useMemo(() =>
    showLunasModal ? [...modalSourcesAktif, ...modalSourcesLunas] : modalSourcesAktif,
  [modalSourcesAktif, modalSourcesLunas, showLunasModal]);

  const filteredModalSources = useMemo(() => {
    if (!modalSearch.trim()) return modalSources;
    const q = modalSearch.toLowerCase();
    return modalSources.filter(t =>
      t.debitur_nama.toLowerCase().includes(q) || t.barang_nama.toLowerCase().includes(q)
    );
  }, [modalSources, modalSearch]);

  // Total modal tersedia dari sumber yang dipilih
  const totalModalTersedia = useMemo(() =>
    selectedModalIds.reduce((sum, id) => {
      const t = allTagihan.find(x => x.id === id);
      return sum + (t ? Number(t.total_dibayar) : 0);
    }, 0),
  [selectedModalIds, allTagihan]);

  const modalBreakdown = useMemo(() =>
    selectedModalIds.map(id => {
      const t = allTagihan.find(x => x.id === id)!;
      if (!t) return null;
      const modalAwal = Number(t.harga_awal);
      const dibayar = Number(t.total_dibayar);
      const keuntungan = Math.max(0, dibayar - modalAwal);
      const modalKembali = Math.min(dibayar, modalAwal);
      return { id, nama: `${t.debitur_nama} — ${t.barang_nama}`, modalAwal, dibayar, keuntungan, modalKembali };
    }).filter(Boolean) as { id: string; nama: string; modalAwal: number; dibayar: number; keuntungan: number; modalKembali: number }[],
  [selectedModalIds, allTagihan]);

  const totalKeuntunganDariModal = modalBreakdown.reduce((s, m) => s + m.keuntungan, 0);

  // ── Tagihan Baru ──
  // Pisahkan aktif dan lunas (exclude sumber modal)
  const availableForNewItemAktif = useMemo(() =>
    allTagihan.filter(t => !selectedModalIds.includes(t.id) && t.status !== 'lunas'),
  [allTagihan, selectedModalIds]);

  const availableForNewItemLunas = useMemo(() =>
    allTagihan.filter(t => !selectedModalIds.includes(t.id) && t.status === 'lunas'),
  [allTagihan, selectedModalIds]);

  const availableForNewItem = useMemo(() =>
    showLunasNew ? [...availableForNewItemAktif, ...availableForNewItemLunas] : availableForNewItemAktif,
  [availableForNewItemAktif, availableForNewItemLunas, showLunasNew]);

  const filteredAvailableForNewItem = useMemo(() => {
    if (!newTagihanSearch.trim()) return availableForNewItem;
    const q = newTagihanSearch.toLowerCase();
    return availableForNewItem.filter(t =>
      t.debitur_nama.toLowerCase().includes(q) || t.barang_nama.toLowerCase().includes(q)
    );
  }, [availableForNewItem, newTagihanSearch]);

  // Calc untuk tagihan baru yang dipilih dari existing
  const existingNewItemsCalc = useMemo(() =>
    selectedNewTagihanIds.map(id => {
      const t = allTagihan.find(x => x.id === id);
      if (!t) return null;
      return {
        id,
        nama: `${t.debitur_nama} — ${t.barang_nama}`,
        hargaBarang: Number(t.harga_awal),
        totalHutang: Number(t.total_hutang),
        keuntungan: Number(t.keuntungan_estimasi),
        angsuran: Number(t.cicilan_per_bulan),
        totalDibayar: Number(t.total_dibayar),
      };
    }).filter(Boolean) as { id: string; nama: string; hargaBarang: number; totalHutang: number; keuntungan: number; angsuran: number; totalDibayar: number }[],
  [selectedNewTagihanIds, allTagihan]);

  // Calc untuk item manual
  const manualItemsCalc = useMemo(() =>
    newItems.filter(i => i.nama && i.hargaBarang > 0).map(item => {
      const totalHutang = item.angsuranPerBulan > 0 && item.jangkaWaktu > 0
        ? item.angsuranPerBulan * item.jangkaWaktu
        : item.hargaBarang * (1 + (item.bungaPersen / 100) * item.jangkaWaktu);
      const keuntungan = totalHutang - item.hargaBarang;
      const angsuran = item.angsuranPerBulan > 0 ? item.angsuranPerBulan : (item.jangkaWaktu > 0 ? totalHutang / item.jangkaWaktu : 0);
      return { ...item, totalHutang, keuntungan, angsuran, totalDibayar: 0 };
    }),
  [newItems]);

  // ── Ringkasan Keuangan ──
  const totalModalDigunakan = existingNewItemsCalc.reduce((s, i) => s + i.hargaBarang, 0) + manualItemsCalc.reduce((s, i) => s + i.hargaBarang, 0);
  const totalKeuntunganBaru = existingNewItemsCalc.reduce((s, i) => s + i.keuntungan, 0) + manualItemsCalc.reduce((s, i) => s + i.keuntungan, 0);
  const totalPemasukanBaru = existingNewItemsCalc.reduce((s, i) => s + i.totalHutang, 0) + manualItemsCalc.reduce((s, i) => s + i.totalHutang, 0);
  const sisaModal = totalModalTersedia - totalModalDigunakan;
  const netProfit = totalKeuntunganDariModal + totalKeuntunganBaru;

  // ── Logika Uang Pribadi & Uang Tagihan ──
  //
  // Total pembayaran yang sudah masuk dari tagihan baru (existing) yang dipilih
  const totalDibayarTagihanBaru = existingNewItemsCalc.reduce((s, i) => s + i.totalDibayar, 0);
  //
  // Total pembayaran dari sumber modal yang dipilih
  const totalDibayarSumberModal = totalModalTersedia; // ini sudah = total_dibayar semua sumber
  //
  // "Dana tagihan di rekening" =
  //   Modal tersedia (dari sumber dipilih)
  //   - Modal yang dikeluarkan untuk tagihan baru
  //   + Pembayaran yang sudah masuk dari tagihan baru
  const danaTaginanDiRekening = totalModalTersedia - totalModalDigunakan + totalDibayarTagihanBaru;
  //
  // Uang Tagihan = total semua pembayaran yang sudah masuk
  //   (dari sumber modal + dari tagihan baru)
  const uangTagihanTotal = totalDibayarSumberModal + totalDibayarTagihanBaru;
  //
  // Uang Pribadi = Saldo - dana tagihan yang ada di rekening
  const uangPribadi = saldoRekening > 0 ? Math.max(0, saldoRekening - danaTaginanDiRekening) : 0;
  // Uang Tagihan yang tampil = min(saldo, dana tagihan) agar tidak melebihi saldo
  const uangTagihanDisplay = saldoRekening > 0 ? Math.min(saldoRekening, danaTaginanDiRekening) : danaTaginanDiRekening;

  const toggleModal = (id: string) => {
    setSelectedModalIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleNewTagihan = (id: string) => {
    setSelectedNewTagihanIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllSources = () => {
    if (selectedModalIds.length === modalSources.length) setSelectedModalIds([]);
    else setSelectedModalIds(modalSources.map(t => t.id));
  };

  const addNewItem = () => setNewItems([...newItems, { ...emptyNewItem }]);
  const removeNewItem = (i: number) => setNewItems(newItems.filter((_, idx) => idx !== i));
  const updateNewItem = (i: number, field: keyof NewItemInput, value: any) => {
    const updated = [...newItems];
    updated[i] = { ...updated[i], [field]: value };
    setNewItems(updated);
  };

  const hasAnySummary = selectedModalIds.length > 0 || manualItemsCalc.length > 0 || selectedNewTagihanIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="overflow-y-auto max-h-[calc(90vh-3rem)] rounded-[inherit] pr-1">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
            <Calculator className="w-5 h-5 text-primary" /> Kalkulator Modal Bergulir
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Simulasi penggunaan modal dari tagihan yang sudah berjalan untuk tagihan baru.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-3">
          {/* Info */}
          <div className="flex gap-2.5 p-3 rounded-xl bg-info/10 border border-info/20">
            <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pilih tagihan sumber modal, lalu tentukan tagihan baru. Ini hanya simulasi — tidak mengubah data.
            </p>
          </div>

          {/* ═══ Step 1: Sumber Modal ═══ */}
          <div className="rounded-xl border border-border p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
                Sumber Modal
              </h4>
              {modalSources.length > 1 && (
                <button onClick={selectAllSources} className="text-[11px] text-primary font-medium hover:underline">
                  {selectedModalIds.length === modalSources.length ? 'Hapus semua' : 'Pilih semua'}
                </button>
              )}
            </div>

            {modalSourcesAktif.length === 0 && modalSourcesLunas.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center rounded-lg bg-muted/30">Belum ada tagihan dengan pembayaran masuk.</p>
            ) : (
              <>
                {modalSources.length > 3 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input type="text" value={modalSearch} onChange={e => setModalSearch(e.target.value)} placeholder="Cari sumber modal..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20" />
                  </div>
                )}

                {selectedModalIds.length > 0 && (
                  <p className="text-[11px] text-primary font-medium">
                    {selectedModalIds.length} sumber dipilih · Total: {fmt(totalModalTersedia)}
                  </p>
                )}

                <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-border p-1">
                  {filteredModalSources.map(t => {
                    const isSelected = selectedModalIds.includes(t.id);
                    const isLunas = t.status === 'lunas';
                    return (
                      <button key={t.id} type="button" onClick={() => toggleModal(t.id)}
                        className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs ${
                          isSelected ? 'bg-primary/5 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'
                        }`}>
                        <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{t.debitur_nama} — {t.barang_nama}</p>
                          <p className="text-[10px] text-muted-foreground">Dibayar: {fmt(Number(t.total_dibayar))} / {fmt(Number(t.total_hutang))}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isLunas && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-semibold">Lunas</span>
                          )}
                          <p className="text-[11px] font-semibold text-primary">{fmt(Number(t.total_dibayar))}</p>
                        </div>
                      </button>
                    );
                  })}
                  {filteredModalSources.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-3">Tidak ditemukan.</p>
                  )}
                </div>

                {/* Toggle tampilkan lunas */}
                {modalSourcesLunas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowLunasModal(v => !v)}
                    className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showLunasModal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showLunasModal
                      ? `Sembunyikan ${modalSourcesLunas.length} tagihan lunas`
                      : `Tampilkan ${modalSourcesLunas.length} tagihan lunas`}
                  </button>
                )}
              </>
            )}

            {selectedModalIds.length > 0 && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Total Modal Tersedia</span>
                  <span className="text-sm font-bold text-success">{fmt(totalModalTersedia)}</span>
                </div>
                <button onClick={() => setShowDetail(!showDetail)} className="text-[10px] text-primary hover:underline mt-1 flex items-center gap-1">
                  {showDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showDetail ? 'Sembunyikan rincian' : 'Lihat rincian'}
                </button>
                {showDetail && (
                  <div className="mt-2 space-y-1 text-xs">
                    {modalBreakdown.map(m => (
                      <div key={m.id} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                        <span className="truncate mr-2">{m.nama}</span>
                        <div className="text-right shrink-0">
                          <p className="font-medium">{fmt(m.dibayar)}</p>
                          <p className="text-[10px] text-muted-foreground">Modal: {fmt(m.modalKembali)} · Untung: {fmt(m.keuntungan)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══ Step 2: Tagihan Baru ═══ */}
          <div className="rounded-xl border border-border p-3 sm:p-4 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
              Tagihan Baru (Menggunakan Modal)
            </h4>

            {/* Mode toggle */}
            <div className="flex gap-2">
              <button type="button" onClick={() => setInputMode('existing')}
                className={`flex-1 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                  inputMode === 'existing' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                }`}>
                Pilih dari Tagihan
              </button>
              <button type="button" onClick={() => setInputMode('manual')}
                className={`flex-1 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                  inputMode === 'manual' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                }`}>
                Input Manual
              </button>
            </div>

            {inputMode === 'existing' ? (
              <div className="space-y-2">
                {availableForNewItem.length > 3 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input type="text" value={newTagihanSearch} onChange={e => setNewTagihanSearch(e.target.value)} placeholder="Cari tagihan..."
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20" />
                  </div>
                )}

                {selectedNewTagihanIds.length > 0 && (
                  <p className="text-[11px] text-primary font-medium">
                    {selectedNewTagihanIds.length} tagihan dipilih · Modal: {fmt(existingNewItemsCalc.reduce((s, i) => s + i.hargaBarang, 0))}
                  </p>
                )}

                {availableForNewItemAktif.length === 0 && availableForNewItemLunas.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-3">Tidak ada tagihan tersedia.</p>
                ) : (
                  <>
                    <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-border p-1">
                      {filteredAvailableForNewItem.map(t => {
                        const isSelected = selectedNewTagihanIds.includes(t.id);
                        const isLunas = t.status === 'lunas';
                        return (
                          <button key={t.id} type="button" onClick={() => toggleNewTagihan(t.id)}
                            className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs ${
                              isSelected ? 'bg-primary/5 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'
                            }`}>
                            <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                              isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{t.debitur_nama} — {t.barang_nama}</p>
                              <p className="text-[10px] text-muted-foreground">Modal: {fmt(Number(t.harga_awal))} · Dibayar: {fmt(Number(t.total_dibayar))} · Untung: {fmt(Number(t.keuntungan_estimasi))}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isLunas && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-semibold">Lunas</span>
                              )}
                              <p className="text-[11px] font-semibold">{fmt(Number(t.harga_awal))}</p>
                            </div>
                          </button>
                        );
                      })}
                      {filteredAvailableForNewItem.length === 0 && availableForNewItem.length > 0 && (
                        <p className="text-[11px] text-muted-foreground text-center py-3">Tidak ditemukan.</p>
                      )}
                    </div>

                    {/* Toggle tampilkan lunas */}
                    {availableForNewItemLunas.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowLunasNew(v => !v)}
                        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showLunasNew ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showLunasNew
                          ? `Sembunyikan ${availableForNewItemLunas.length} tagihan lunas`
                          : `Tampilkan ${availableForNewItemLunas.length} tagihan lunas`}
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {newItems.map((item, i) => (
                  <div key={i} className="p-3 rounded-xl border border-border bg-muted/20 space-y-3 relative">
                    {newItems.length > 1 && (
                      <button onClick={() => removeNewItem(i)} className="absolute top-2 right-2 p-1 rounded-md hover:bg-destructive/10">
                        <X className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    )}
                    <div>
                      <label className="text-xs font-medium mb-1 block text-foreground">Nama Barang *</label>
                      <input type="text" value={item.nama} onChange={e => updateNewItem(i, 'nama', e.target.value)}
                        placeholder="cth: Speaker Aktif" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium mb-1 block text-foreground">Harga Barang</label>
                        <CurrencyInput value={item.hargaBarang} onChange={v => updateNewItem(i, 'hargaBarang', v)} placeholder="2.900.000" />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block text-foreground">Angsuran/Bln</label>
                        <CurrencyInput value={item.angsuranPerBulan} onChange={v => updateNewItem(i, 'angsuranPerBulan', v)} placeholder="315.000" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium mb-1 block text-foreground">Jangka Waktu (Bulan)</label>
                        <input type="number" value={item.jangkaWaktu || ''} onChange={e => updateNewItem(i, 'jangkaWaktu', Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" min={1} />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block text-foreground">Bunga (%)</label>
                        <input type="number" value={item.bungaPersen || ''} onChange={e => updateNewItem(i, 'bungaPersen', Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" min={0} step="any" />
                      </div>
                    </div>
                    {manualItemsCalc[i] && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                        <span>Total hutang: {fmt(manualItemsCalc[i].totalHutang)}</span>
                        <span className="text-success font-medium">Untung: {fmt(manualItemsCalc[i].keuntungan)}</span>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={addNewItem} type="button" className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
                  <Plus className="w-4 h-4" /> Tambah Barang
                </button>
              </div>
            )}
          </div>

          {/* ═══ Step 3: Saldo Rekening ═══ */}
          <div className="rounded-xl border border-border p-3 sm:p-4 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
              Saldo Rekening (Opsional)
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Masukkan saldo rekening saat ini untuk mengetahui berapa uang pribadi dan uang tagihan yang tercampur.
            </p>
            <CurrencyInput value={saldoRekening} onChange={setSaldoRekening} placeholder="5.000.000" />

            {saldoRekening > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-info/10 p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground">Uang Tagihan</p>
                    <p className="text-xs font-bold">{fmt(uangTagihanDisplay)}</p>
                  </div>
                  <div className="rounded-lg bg-success/10 p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground">Uang Pribadi</p>
                    <p className="text-xs font-bold text-success">{fmt(uangPribadi)}</p>
                  </div>
                </div>
                {/* Penjelasan rinci */}
                <div className="p-2.5 rounded-lg bg-muted/40 space-y-1 text-[10px] text-muted-foreground">
                  <p className="font-semibold text-foreground text-xs mb-1.5">Cara Hitung:</p>
                  <div className="flex justify-between"><span>Modal tersedia (sumber dipilih)</span><span className="font-medium">{fmt(totalModalTersedia)}</span></div>
                  <div className="flex justify-between"><span>− Modal keluar (tagihan baru)</span><span className="font-medium text-destructive">− {fmt(totalModalDigunakan)}</span></div>
                  <div className="flex justify-between"><span>+ Cicilan masuk (tagihan baru)</span><span className="font-medium text-success">+ {fmt(totalDibayarTagihanBaru)}</span></div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="font-semibold text-foreground">= Dana tagihan di rekening</span><span className="font-bold text-foreground">{fmt(danaTaginanDiRekening)}</span></div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1"><span>Saldo rekening</span><span className="font-medium">{fmt(saldoRekening)}</span></div>
                  <div className="flex justify-between"><span>− Dana tagihan di rekening</span><span className="font-medium text-destructive">− {fmt(Math.min(saldoRekening, danaTaginanDiRekening))}</span></div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1 font-semibold text-foreground"><span>= Uang Pribadi</span><span className="text-success">{fmt(uangPribadi)}</span></div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 space-y-1 text-[10px] text-muted-foreground">
                  <p className="font-semibold text-foreground text-xs mb-1.5">Rincian Uang Tagihan:</p>
                  <div className="flex justify-between"><span>Total dibayar — sumber modal</span><span className="font-medium">{fmt(totalDibayarSumberModal)}</span></div>
                  <div className="flex justify-between"><span>Total dibayar — tagihan baru</span><span className="font-medium">{fmt(totalDibayarTagihanBaru)}</span></div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1 font-semibold text-foreground"><span>= Total Uang Tagihan</span><span>{fmt(uangTagihanTotal)}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ Step 4: Hasil Kalkulasi ═══ */}
          {hasAnySummary && (
            <div className="rounded-xl border border-border p-3 sm:p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">4</span>
                Hasil Kalkulasi
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-xl bg-info/10 p-3 text-center">
                  <Wallet className="w-4 h-4 mx-auto mb-1 text-info" />
                  <p className="text-[10px] text-muted-foreground">Modal Tersedia</p>
                  <p className="text-xs sm:text-sm font-bold">{fmt(totalModalTersedia)}</p>
                </div>
                <div className="rounded-xl bg-warning/10 p-3 text-center">
                  <Banknote className="w-4 h-4 mx-auto mb-1 text-warning" />
                  <p className="text-[10px] text-muted-foreground">Modal Digunakan</p>
                  <p className="text-xs sm:text-sm font-bold">{fmt(totalModalDigunakan)}</p>
                </div>
                <div className="rounded-xl bg-success/10 p-3 text-center">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-success" />
                  <p className="text-[10px] text-muted-foreground">Net Profit</p>
                  <p className="text-xs sm:text-sm font-bold text-success">{fmt(netProfit)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${sisaModal >= 0 ? 'bg-pastel-green' : 'bg-destructive/10'}`}>
                  <PiggyBank className="w-4 h-4 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Sisa Modal</p>
                  <p className={`text-xs sm:text-sm font-bold ${sisaModal < 0 ? 'text-destructive' : ''}`}>{fmt(sisaModal)}</p>
                </div>
              </div>

              {sisaModal < 0 && (
                <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive font-medium">⚠️ Modal tidak cukup! Butuh tambahan {fmt(Math.abs(sisaModal))}.</p>
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Keuntungan dari modal lama</span>
                  <span className="font-medium">{fmt(totalKeuntunganDariModal)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Keuntungan dari tagihan baru</span>
                  <span className="font-medium">{fmt(totalKeuntunganBaru)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Total pemasukan tagihan baru</span>
                  <span className="font-medium">{fmt(totalPemasukanBaru)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Cicilan masuk (tagihan baru, saat ini)</span>
                  <span className="font-medium text-success">{fmt(totalDibayarTagihanBaru)}</span>
                </div>
                <div className="flex justify-between py-1.5 font-semibold">
                  <span>Total keuntungan bersih</span>
                  <span className="text-success">{fmt(netProfit)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}