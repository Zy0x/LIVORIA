import { useState, useMemo, useEffect } from 'react';
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
  // Modal overlay rincian bagi hasil proporsional & simulasi
  const [showInterestDetail, setShowInterestDetail] = useState(false);

  // State untuk nominal pembayaran simulasi (key: tagihanId, value: nominal)
  const [simulatedPayments, setSimulatedPayments] = useState<Record<string, number>>({});

  useBackGesture(open, () => onOpenChange(false), 'tagihan-calc');

  // Inisialisasi nominal cicilan simulasi dengan data riil database saat modal terbuka
  useEffect(() => {
    if (open) {
      const initial: Record<string, number> = {};
      allTagihan.forEach(t => {
        initial[t.id] = Number(t.total_dibayar);
      });
      setSimulatedPayments(initial);
    }
  }, [open, allTagihan]);

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

  // Breakdown Modal Secara Proporsional (Pokok & Bagi Hasil)
  const modalBreakdown = useMemo(() =>
    selectedModalIds.map(id => {
      const t = allTagihan.find(x => x.id === id)!;
      if (!t) return null;
      const modalAwal = Number(t.harga_awal);
      const totalHutang = Number(t.total_hutang);
      const keuntunganEstimasi = Number(t.keuntungan_estimasi);
      
      const dibayar = simulatedPayments[id] !== undefined ? simulatedPayments[id] : Number(t.total_dibayar);
      
      const rasioKeuntungan = totalHutang > 0 ? keuntunganEstimasi / totalHutang : 0;
      const keuntungan = dibayar * rasioKeuntungan;
      const modalKembali = dibayar - keuntungan;
      const sisaTagihan = Math.max(0, totalHutang - dibayar);
      
      return { id, nama: `${t.debitur_nama} — ${t.barang_nama}`, modalAwal, totalHutang, dibayar, keuntungan, modalKembali, rasioKeuntungan, sisaTagihan };
    }).filter(Boolean) as { id: string; nama: string; modalAwal: number; totalHutang: number; dibayar: number; keuntungan: number; modalKembali: number; rasioKeuntungan: number; sisaTagihan: number }[],
  [selectedModalIds, allTagihan, simulatedPayments]);

  const totalModalPokokTersedia = modalBreakdown.reduce((s, m) => s + m.modalKembali, 0);
  const totalKeuntunganDariModal = modalBreakdown.reduce((s, m) => s + m.keuntungan, 0);
  const totalDibayarSumberModal = modalBreakdown.reduce((s, m) => s + m.dibayar, 0);

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

  // Calc untuk tagihan baru yang dipilih dari existing (Secara Proporsional)
  const existingNewItemsCalc = useMemo(() =>
    selectedNewTagihanIds.map(id => {
      const t = allTagihan.find(x => x.id === id);
      if (!t) return null;
      const hargaBarang = Number(t.harga_awal);
      const totalHutang = Number(t.total_hutang);
      const keuntunganEstimasi = Number(t.keuntungan_estimasi);
      
      const totalDibayar = simulatedPayments[id] !== undefined ? simulatedPayments[id] : Number(t.total_dibayar);
      
      const rasioKeuntungan = totalHutang > 0 ? keuntunganEstimasi / totalHutang : 0;
      const keuntunganDibayar = totalDibayar * rasioKeuntungan;
      const pokokDibayar = totalDibayar - keuntunganDibayar;
      const sisaTagihan = Math.max(0, totalHutang - totalDibayar);
      
      return {
        id,
        nama: `${t.debitur_nama} — ${t.barang_nama}`,
        hargaBarang,
        totalHutang,
        keuntungan: keuntunganEstimasi,
        angsuran: Number(t.cicilan_per_bulan),
        totalDibayar,
        keuntunganDibayar,
        pokokDibayar,
        rasioKeuntungan,
        sisaTagihan
      };
    }).filter(Boolean) as { id: string; nama: string; hargaBarang: number; totalHutang: number; keuntungan: number; angsuran: number; totalDibayar: number; keuntunganDibayar: number; pokokDibayar: number; rasioKeuntungan: number; sisaTagihan: number }[],
  [selectedNewTagihanIds, allTagihan, simulatedPayments]);

  const totalPokokDibayarTagihanBaru = existingNewItemsCalc.reduce((s, i) => s + i.pokokDibayar, 0);
  const totalKeuntunganDibayarTagihanBaru = existingNewItemsCalc.reduce((s, i) => s + i.keuntunganDibayar, 0);
  const totalDibayarTagihanBaru = existingNewItemsCalc.reduce((s, i) => s + i.totalDibayar, 0);

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
  
  // Sisa modal pokok
  const sisaModalPokok = totalModalPokokTersedia - totalModalDigunakan;
  
  // Keuntungan terkumpul (sumber + tagihan baru secara proporsional)
  const keuntunganTerkumpul = totalKeuntunganDariModal + totalKeuntunganDibayarTagihanBaru;
  const netProfit = totalKeuntunganDariModal + totalKeuntunganBaru;

  // Dana tagihan di rekening (pokok + bunga)
  const danaTaginanDiRekening = totalDibayarSumberModal - totalModalDigunakan + totalDibayarTagihanBaru;

  // Dana pokok tagihan di rekening (hanya pokok modal)
  const danaTagihanPokokDiRekening = totalModalPokokTersedia - totalModalDigunakan + totalPokokDibayarTagihanBaru;

  // 3 Bagian Saldo Rekening
  const uangTagihanPokokDisplay = saldoRekening > 0 ? Math.min(saldoRekening, danaTagihanPokokDiRekening) : danaTagihanPokokDiRekening;
  const uangPribadiMurni = saldoRekening > 0 ? Math.max(0, saldoRekening - danaTaginanDiRekening) : 0;
  const uangPribadiBagiHasil = saldoRekening > 0 ? Math.max(0, saldoRekening - danaTagihanPokokDiRekening) : 0;

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
  const updateNewItem = <K extends keyof NewItemInput>(i: number, field: K, value: NewItemInput[K]) => {
    const updated = [...newItems];
    updated[i] = { ...updated[i], [field]: value };
    setNewItems(updated);
  };

  const hasAnySummary = selectedModalIds.length > 0 || manualItemsCalc.length > 0 || selectedNewTagihanIds.length > 0;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="overflow-y-auto max-h-[calc(90vh-3rem)] rounded-[inherit] pr-1">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
            <Calculator className="w-5 h-5 text-primary" /> Kalkulator Modal Bergulir
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Simulasi penggunaan modal pokok dari tagihan berjalan untuk memutar tagihan baru.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-3">
          {/* ═══ Step 1: Sumber Modal ═══ */}
          <div className="rounded-xl border border-border p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
                Sumber Modal (Pokok)
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
                    {selectedModalIds.length} sumber dipilih · Modal Pokok: {fmt(totalModalPokokTersedia)}
                  </p>
                )}

                <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-border p-1">
                  {filteredModalSources.map(t => {
                    const isSelected = selectedModalIds.includes(t.id);
                    const isLunas = t.status === 'lunas';
                    const detail = modalBreakdown.find(x => x.id === t.id);
                    const modalPokok = detail ? detail.modalKembali : 0;
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
                          <p className="text-[10px] text-muted-foreground">Pokok Kembali: {fmt(modalPokok)} / Total Dibayar: {fmt(Number(t.total_dibayar))}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isLunas && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-semibold">Lunas</span>
                          )}
                          <p className="text-[11px] font-semibold text-primary">{fmt(modalPokok)}</p>
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
                  <span className="text-xs font-medium text-muted-foreground">Total Modal Pokok Tersedia</span>
                  <span className="text-sm font-bold text-success">{fmt(totalModalPokokTersedia)}</span>
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
                          <p className="font-medium">{fmt(m.modalKembali)}</p>
                          <p className="text-[10px] text-muted-foreground">Total Dibayar: {fmt(m.dibayar)} · Bunga: {fmt(m.keuntungan)}</p>
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
                        <CurrencyInput value={item.hargaBarang} onChange={v => updateNewItem(i, 'angsuranPerBulan', v)} placeholder="315.000" />
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
              Saldo Rekening
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Masukkan saldo rekening saat ini untuk memisahkan Uang Tagihan (Pokok), Uang Pribadi (Murni), dan Uang Pribadi + Bagi Hasil (Bunga Cicilan).
            </p>
            <CurrencyInput value={saldoRekening} onChange={setSaldoRekening} placeholder="5.000.000" />

            {saldoRekening > 0 && (
              <div className="space-y-3 mt-3">
                {/* 3 Bagian Pemisahan Pokok & Bagi Hasil */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-lg bg-info/10 p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium">Uang Tagihan (Pokok)</p>
                    <p className="text-xs font-bold text-foreground">{fmt(uangTagihanPokokDisplay)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 border border-border p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium">Uang Pribadi (Murni)</p>
                    <p className="text-xs font-bold text-foreground/80">{fmt(uangPribadiMurni)}</p>
                  </div>
                  <div className="rounded-lg bg-success/10 p-2.5 text-center">
                    <p className="text-[10px] text-success font-medium">Uang Pribadi + Bagi Hasil</p>
                    <p className="text-xs font-bold text-success">{fmt(uangPribadiBagiHasil)}</p>
                  </div>
                </div>

                {/* Penjelasan rinci */}
                <div className="p-2.5 rounded-lg bg-muted/40 space-y-1 text-[10px] text-muted-foreground">
                  <p className="font-semibold text-foreground text-xs mb-1.5 flex items-center justify-between">
                    <span>Cara Hitung:</span>
                    <button
                      type="button"
                      onClick={() => setShowInterestDetail(true)}
                      className="p-1 hover:bg-muted rounded-md text-primary transition-colors flex items-center gap-1 text-[10px]"
                      title="Lihat Detail Bagi Hasil per Tagihan"
                    >
                      <Info className="w-3.5 h-3.5" /> Detail & Simulasi
                    </button>
                  </p>
                  <div className="flex justify-between"><span>Modal Pokok Tersedia (sumber)</span><span className="font-medium">{fmt(totalModalPokokTersedia)}</span></div>
                  <div className="flex justify-between"><span>− Modal Keluar (tagihan baru)</span><span className="font-medium text-destructive">− {fmt(totalModalDigunakan)}</span></div>
                  <div className="flex justify-between"><span>+ Pokok Cicilan Masuk (baru)</span><span className="font-medium text-success">+ {fmt(totalPokokDibayarTagihanBaru)}</span></div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1 font-semibold text-foreground"><span>= Uang Tagihan Pokok (Dana Rollover)</span><span>{fmt(danaTagihanPokokDiRekening)}</span></div>
                  
                  <div className="border-t border-border/40 my-1.5"></div>
                  
                  <div className="flex justify-between"><span>Saldo Rekening Saat Ini</span><span className="font-medium">{fmt(saldoRekening)}</span></div>
                  <div className="flex justify-between"><span>− Dana Tagihan Penuh (Pokok + Bagi Hasil)</span><span className="font-medium text-destructive">− {fmt(danaTaginanDiRekening)}</span></div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1 font-semibold text-foreground"><span>= Uang Pribadi Murni</span><span>{fmt(uangPribadiMurni)}</span></div>

                  <div className="border-t border-border/40 my-1.5"></div>

                  <div className="flex justify-between"><span>Uang Pribadi Murni</span><span className="font-medium">{fmt(uangPribadiMurni)}</span></div>
                  <div className="flex justify-between"><span>+ Bagi Hasil Terkumpul (Bunga Cicilan)</span><span className="font-medium text-success">+ {fmt(keuntunganTerkumpul)}</span></div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1 font-semibold text-foreground"><span>= Uang Pribadi + Bagi Hasil (Bunga)</span><span className="text-success">{fmt(uangPribadiBagiHasil)}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ Step 4: Hasil Kalkulasi ═══ */}
          {hasAnySummary && (
            <div className="rounded-xl border border-border p-3 sm:p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">4</span>
                Hasil Kalkulasi (Modal Pokok)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-xl bg-info/10 p-3 text-center">
                  <Wallet className="w-4 h-4 mx-auto mb-1 text-info" />
                  <p className="text-[10px] text-muted-foreground">Modal Pokok Tersedia</p>
                  <p className="text-xs sm:text-sm font-bold">{fmt(totalModalPokokTersedia)}</p>
                </div>
                <div className="rounded-xl bg-warning/10 p-3 text-center">
                  <Banknote className="w-4 h-4 mx-auto mb-1 text-warning" />
                  <p className="text-[10px] text-muted-foreground">Modal Digunakan</p>
                  <p className="text-xs sm:text-sm font-bold">{fmt(totalModalDigunakan)}</p>
                </div>
                <div className="rounded-xl bg-success/10 p-3 text-center">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-success" />
                  <p className="text-[10px] text-muted-foreground">Bagi Hasil Terkumpul</p>
                  <p className="text-xs sm:text-sm font-bold text-success">{fmt(keuntunganTerkumpul)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${sisaModalPokok >= 0 ? 'bg-pastel-green' : 'bg-destructive/10'}`}>
                  <PiggyBank className="w-4 h-4 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">Sisa Modal Pokok</p>
                  <p className={`text-xs sm:text-sm font-bold ${sisaModalPokok < 0 ? 'text-destructive' : ''}`}>{fmt(sisaModalPokok)}</p>
                </div>
              </div>

              {sisaModalPokok < 0 && (
                <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive font-medium">⚠️ Modal pokok tidak cukup! Butuh tambahan {fmt(Math.abs(sisaModalPokok))}.</p>
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Bagi hasil dari modal lama (sumber)</span>
                  <span className="font-medium">{fmt(totalKeuntunganDariModal)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Bagi hasil dari tagihan baru (cicilan)</span>
                  <span className="font-medium text-success">{fmt(totalKeuntunganDibayarTagihanBaru)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Pokok cicilan masuk (tagihan baru, saat ini)</span>
                  <span className="font-medium text-success">{fmt(totalPokokDibayarTagihanBaru)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Total estimasi laba tagihan baru</span>
                  <span className="font-medium">{fmt(totalKeuntunganBaru)}</span>
                </div>
                <div className="flex justify-between py-1.5 font-semibold">
                  <span>Total keuntungan bersih (realisasi)</span>
                  <span className="text-success">{fmt(keuntunganTerkumpul)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal Overlay Detail Bagi Hasil / Bunga Proporsional per Tagihan */}
    <Dialog open={showInterestDetail} onOpenChange={setShowInterestDetail}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden">
        <div className="overflow-y-auto max-h-[calc(85vh-3rem)] rounded-[inherit] pr-1">
        <DialogHeader className="relative pr-20">
          <DialogTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="w-5 h-5 text-success" /> Rincian & Simulasi Bagi Hasil
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Detail modal, total target piutang, pembagian pokok, dan simulasi pembayaran cicilan berjalan.
          </DialogDescription>
          <button
            type="button"
            onClick={() => {
              const initial: Record<string, number> = {};
              allTagihan.forEach(t => {
                initial[t.id] = Number(t.total_dibayar);
              });
              setSimulatedPayments(initial);
            }}
            className="absolute top-1 right-8 px-2.5 py-1 rounded-lg bg-muted hover:bg-accent text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all"
          >
            Reset Simulasi
          </button>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Tagihan Sumber Modal */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sumber Modal (Tagihan Berjalan)</h5>
            {modalBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-2">Tidak ada sumber modal yang dipilih.</p>
            ) : (
              <div className="space-y-2">
                {modalBreakdown.map(m => (
                  <div key={m.id} className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3 text-xs">
                    <div className="flex justify-between items-center font-semibold text-foreground border-b border-border/40 pb-1.5">
                      <span className="truncate text-sm">{m.nama}</span>
                      <span className="text-success text-sm font-bold">{fmt(m.keuntungan)}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-muted-foreground">
                      <div className="flex justify-between items-center">
                        <span>Modal Tagihan (Awal):</span>
                        <span className="font-semibold text-foreground">{fmt(m.modalAwal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Total Tagihan (Target):</span>
                        <span className="font-semibold text-foreground">{fmt(m.totalHutang)}</span>
                      </div>
                      
                      {/* Interactive Simulation Input */}
                      <div className="flex justify-between items-center sm:col-span-2 py-1 bg-background/50 px-2.5 rounded-lg border border-border/30">
                        <span className="font-medium text-foreground text-[11px] flex items-center gap-1">
                          📊 Cicilan Masuk (Simulasi):
                        </span>
                        <div className="relative w-36">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">Rp</span>
                          <input
                            type="number"
                            value={m.dibayar || 0}
                            onChange={e => {
                              const val = Math.min(m.totalHutang, Math.max(0, Number(e.target.value)));
                              setSimulatedPayments(prev => ({ ...prev, [m.id]: val }));
                            }}
                            className="w-full pl-7 pr-2 py-1 rounded-md border border-input bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 text-right"
                            max={m.totalHutang}
                            min={0}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span>Sisa Tagihan (Target):</span>
                        <span className={`font-bold ${m.sisaTagihan === 0 ? 'text-success' : 'text-foreground'}`}>
                          {m.sisaTagihan === 0 ? 'Lunas ✨' : fmt(m.sisaTagihan)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Pembayaran Pokok:</span>
                        <span className="font-semibold text-foreground">{fmt(m.modalKembali)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Rasio Bagi Hasil:</span>
                        <span className="font-semibold text-foreground">{(m.rasioKeuntungan * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Bagi Hasil (Bunga):</span>
                        <span className="font-semibold text-success">{fmt(m.keuntungan)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tagihan Baru */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tagihan Baru (Cicilan Masuk)</h5>
            {existingNewItemsCalc.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-2">Tidak ada tagihan baru yang dipilih.</p>
            ) : (
              <div className="space-y-2">
                {existingNewItemsCalc.map(i => (
                  <div key={i.id} className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3 text-xs">
                    <div className="flex justify-between items-center font-semibold text-foreground border-b border-border/40 pb-1.5">
                      <span className="truncate text-sm">{i.nama}</span>
                      <span className="text-success text-sm font-bold">{fmt(i.keuntunganDibayar)}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-muted-foreground">
                      <div className="flex justify-between items-center">
                        <span>Modal Tagihan (Awal):</span>
                        <span className="font-semibold text-foreground">{fmt(i.hargaBarang)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Total Tagihan (Target):</span>
                        <span className="font-semibold text-foreground">{fmt(i.totalHutang)}</span>
                      </div>
                      
                      {/* Interactive Simulation Input */}
                      <div className="flex justify-between items-center sm:col-span-2 py-1 bg-background/50 px-2.5 rounded-lg border border-border/30">
                        <span className="font-medium text-foreground text-[11px] flex items-center gap-1">
                          📊 Cicilan Masuk (Simulasi):
                        </span>
                        <div className="relative w-36">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">Rp</span>
                          <input
                            type="number"
                            value={i.totalDibayar || 0}
                            onChange={e => {
                              const val = Math.min(i.totalHutang, Math.max(0, Number(e.target.value)));
                              setSimulatedPayments(prev => ({ ...prev, [i.id]: val }));
                            }}
                            className="w-full pl-7 pr-2 py-1 rounded-md border border-input bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 text-right"
                            max={i.totalHutang}
                            min={0}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span>Sisa Tagihan (Target):</span>
                        <span className={`font-bold ${i.sisaTagihan === 0 ? 'text-success' : 'text-foreground'}`}>
                          {i.sisaTagihan === 0 ? 'Lunas ✨' : fmt(i.sisaTagihan)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Pembayaran Pokok:</span>
                        <span className="font-semibold text-foreground">{fmt(i.pokokDibayar)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Rasio Bagi Hasil:</span>
                        <span className="font-semibold text-foreground">{(i.rasioKeuntungan * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Bagi Hasil (Bunga):</span>
                        <span className="font-semibold text-success">{fmt(i.keuntunganDibayar)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ringkasan Akumulasi */}
          <div className="p-4 rounded-xl bg-success/10 border border-success/20 space-y-2 text-xs">
            <div className="flex justify-between font-semibold text-foreground">
              <span>Total Modal Pokok Tagihan Terpilih:</span>
              <span className="font-bold">{fmt(modalBreakdown.reduce((sum, m) => sum + m.modalAwal, 0) + existingNewItemsCalc.reduce((sum, i) => sum + i.hargaBarang, 0))}</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground">
              <span>Total Tagihan (Target Piutang):</span>
              <span className="font-bold">{fmt(modalBreakdown.reduce((sum, m) => sum + m.totalHutang, 0) + existingNewItemsCalc.reduce((sum, i) => sum + i.totalHutang, 0))}</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground">
              <span>Total Cicilan Masuk (Simulasi):</span>
              <span className="font-bold text-primary">{fmt(totalDibayarSumberModal + totalDibayarTagihanBaru)}</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground">
              <span>Sisa Piutang Belum Terbayar:</span>
              <span className="font-bold text-warning">
                {fmt(
                  (modalBreakdown.reduce((sum, m) => sum + m.totalHutang, 0) + existingNewItemsCalc.reduce((sum, i) => sum + i.totalHutang, 0)) -
                  (totalDibayarSumberModal + totalDibayarTagihanBaru)
                )}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-foreground">
              <span>Akumulasi Pembayaran Pokok:</span>
              <span className="font-bold">{fmt(totalModalPokokTersedia + totalPokokDibayarTagihanBaru)}</span>
            </div>
            <div className="flex justify-between font-bold text-success border-t border-success/30 pt-2 mt-2 text-sm">
              <span>Total Bunga/Bagi Hasil Terkumpul:</span>
              <span>{fmt(keuntunganTerkumpul)}</span>
            </div>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
