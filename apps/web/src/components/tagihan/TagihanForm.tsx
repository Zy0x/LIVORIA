import { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { calculateTagihan, reverseCalculateTagihan, type BungaPeriode, type CalcResult } from '@/features/tagihan/domain/tagihan-calculation';
import type { Tagihan, TagihanStatus } from '@/lib/types';
import { Calculator, Upload, X, FileText, Image, Info, ChevronDown, ChevronUp, ArrowRightLeft, Plus, Trash2, Edit2, CalendarDays } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useTagihanList } from '@/features/tagihan/hooks/useTagihanList';
import { useTagihanMutations } from '@/features/tagihan/hooks/useTagihanMutations';
import { formatCurrencyIDR } from '@/shared/formatters/currency';
import { TagihanInfoTooltip as InfoTooltip } from './TagihanInfoTooltip';
import { TagihanFieldLabel as FieldLabel } from './TagihanFieldLabel';
import { TagihanFormAdvancedSections } from './TagihanFormAdvancedSections';
import { QUERY_KEYS } from '@/app/query-keys';
import {
  calculateCicilanFromInstallment,
  DEFAULT_PAYMENT_METHODS,
  getCustomPaymentMethods,
  initialTagihanForm,
  previewJadwalPembayaran,
  saveCustomPaymentMethods,
  TAGIHAN_FORM_TIPS as TIPS,
  type CalcSource,
} from './tagihan-form-helpers';

function getErrorMessage(error: unknown, fallback = 'Terjadi kesalahan') {
  return error instanceof Error ? error.message : fallback;
}

// ─── Props & form types ───────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editItem: Tagihan | null;
  onSubmit: (data: Partial<Tagihan>, files?: File[]) => void;
  isPending: boolean;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TagihanForm({ open, onOpenChange, editItem, onSubmit, isPending }: Props) {
  const qc = useQueryClient();
  const { correctPayment } = useTagihanMutations();
  const [form, setForm] = useState(initialTagihanForm);
  const [calcSource, setCalcSource] = useState<CalcSource>('none');
  const [files, setFiles] = useState<File[]>([]);
  const [showMigration, setShowMigration] = useState(false);
  const [customMethods, setCustomMethods] = useState<string[]>(getCustomPaymentMethods());
  const [newMethod, setNewMethod] = useState('');
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [showDebiturDropdown, setShowDebiturDropdown] = useState(false);
  const [debiturSearch, setDebiturSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showKoreksi, setShowKoreksi] = useState(false);
  const [koreksiMode, setKoreksiMode] = useState<'bulan' | 'nominal'>('bulan');
  const [koreksiBulan, setKoreksiBulan] = useState(0);
  const [koreksiNominal, setKoreksiNominal] = useState(0);
  const [koreksiCatatan, setKoreksiCatatan] = useState('');
  const [koreksiPending, setKoreksiPending] = useState(false);

  const { data: allTagihan = [] } = useTagihanList();

  const existingDebiturs = useMemo(() => {
    const debiturs = new Map<string, string>();
    allTagihan.forEach(t => {
      if (!debiturs.has(t.debitur_nama)) debiturs.set(t.debitur_nama, t.debitur_kontak || '');
    });
    return Array.from(debiturs.entries()).map(([nama, kontak]) => ({ nama, kontak }));
  }, [allTagihan]);

  const filteredDebiturs = useMemo(() => {
    if (!debiturSearch.trim()) return existingDebiturs;
    const q = debiturSearch.toLowerCase();
    return existingDebiturs.filter(d => d.nama.toLowerCase().includes(q));
  }, [existingDebiturs, debiturSearch]);

  const allMethods = [...DEFAULT_PAYMENT_METHODS, ...customMethods];

  const calc: CalcResult = useMemo(() => {
    if (form.harga_awal <= 0 || form.jangka_waktu_bulan < 1)
      return { totalHutang: 0, cicilanPerBulan: 0, keuntunganEstimasi: 0, bungaEfektifPerBulan: 0, bungaEfektifPerTahun: 0, bungaEfektifPerHari: 0 };

    if (calcSource === 'cicilan' && form.cicilan_input > 0)
      return calculateCicilanFromInstallment(form.harga_awal, form.cicilan_input, form.jangka_waktu_bulan);
    if (calcSource === 'harga_akhir' && form.harga_akhir > 0)
      return reverseCalculateTagihan(form.harga_awal, form.harga_akhir, form.jangka_waktu_bulan);
    if (calcSource === 'bunga')
      return calculateTagihan(form.harga_awal, form.bunga_persen, form.jangka_waktu_bulan, form.bunga_periode);

    if (form.cicilan_input > 0) return calculateCicilanFromInstallment(form.harga_awal, form.cicilan_input, form.jangka_waktu_bulan);
    if (form.harga_akhir > 0) return reverseCalculateTagihan(form.harga_awal, form.harga_akhir, form.jangka_waktu_bulan);
    if (form.bunga_persen > 0) return calculateTagihan(form.harga_awal, form.bunga_persen, form.jangka_waktu_bulan, form.bunga_periode);

    return calculateTagihan(form.harga_awal, 0, form.jangka_waktu_bulan, form.bunga_periode);
  }, [form.harga_awal, form.jangka_waktu_bulan, form.cicilan_input, form.harga_akhir, form.bunga_persen, form.bunga_periode, calcSource]);

  useEffect(() => {
    if (editItem) {
      setForm({
        debitur_nama: editItem.debitur_nama,
        debitur_kontak: editItem.debitur_kontak,
        barang_nama: editItem.barang_nama,
        harga_awal: editItem.harga_awal,
        bunga_persen: editItem.bunga_persen,
        bunga_periode: 'tahunan',
        jangka_waktu_bulan: editItem.jangka_waktu_bulan,
        harga_akhir: editItem.total_hutang,
        cicilan_input: editItem.cicilan_per_bulan,
        tanggal_mulai: editItem.tanggal_mulai,
        tanggal_mulai_bayar: editItem.tanggal_mulai_bayar || '',
        tanggal_jatuh_tempo_input: editItem.tanggal_jatuh_tempo || '',
        denda_persen_per_hari: editItem.denda_persen_per_hari,
        catatan: editItem.catatan || '',
        status: editItem.status,
        sudah_dibayar_bulan: 0,
        total_sudah_dibayar: editItem.total_dibayar || 0,
        metode_pembayaran: editItem.metode_pembayaran || '',
        jenis_tempo: editItem.jenis_tempo || 'bulanan',
        tgl_bayar_tanggal: editItem.tgl_bayar_tanggal || '',
        tgl_tempo_tanggal: editItem.tgl_tempo_tanggal || '',
        sumber_modal: editItem.sumber_modal || 'modal_terpisah',
        kuantitas: editItem.kuantitas || '',
      });
      setCalcSource('cicilan');
      setShowMigration(false);
      setShowKoreksi(false);
      const cicilanPerBulan = Number(editItem.cicilan_per_bulan);
      const bulanDibayar = cicilanPerBulan > 0 ? Math.round(Number(editItem.total_dibayar) / cicilanPerBulan) : 0;
      setKoreksiBulan(bulanDibayar);
      setKoreksiNominal(Number(editItem.total_dibayar));
      setKoreksiCatatan('');
    } else {
      setForm(initialTagihanForm);
      setCalcSource('none');
      setShowMigration(false);
      setShowKoreksi(false);
    }
    setFiles([]);
  }, [editItem, open]);

  const fmt = formatCurrencyIDR;

  const koreksiTotalBaru = koreksiMode === 'bulan'
    ? Math.round(koreksiBulan * Number(editItem?.cicilan_per_bulan ?? 0))
    : koreksiNominal;

  const koreksiSisaBaru = editItem ? Math.max(0, Number(editItem.total_hutang) - koreksiTotalBaru) : 0;

  const handleKoreksiSimpan = async () => {
    if (!editItem) return;
    setKoreksiPending(true);
    try {
      const catatanFinal = koreksiCatatan.trim()
        || `Rekonsiliasi saldo angsuran: ${koreksiMode === 'bulan' ? `${koreksiBulan} periode angsuran` : `nominal ${fmt(koreksiNominal)}`}`;

      await correctPayment.mutateAsync({
        tagihan: editItem,
        totalDibayar: koreksiTotalBaru,
        detail: catatanFinal,
      });

      qc.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN_HISTORY(editItem.id) });
      setShowKoreksi(false);
      toast({ title: 'Rekonsiliasi Disimpan', description: `Total angsuran terbayar diperbarui menjadi ${fmt(koreksiTotalBaru)}.` });
    } catch (e) {
      toast({ title: 'Gagal Menyimpan Rekonsiliasi', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setKoreksiPending(false);
    }
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []).filter(f => f.size <= 5 * 1024 * 1024 && (f.type.startsWith('image/') || f.type === 'application/pdf'));
    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addCustomMethod = () => {
    const m = newMethod.trim();
    if (!m || allMethods.includes(m)) return;
    const updated = [...customMethods, m];
    setCustomMethods(updated);
    saveCustomPaymentMethods(updated);
    setForm({ ...form, metode_pembayaran: m });
    setNewMethod('');
    setShowAddMethod(false);
  };

  const removeCustomMethod = (m: string) => {
    const updated = customMethods.filter(x => x !== m);
    setCustomMethods(updated);
    saveCustomPaymentMethods(updated);
    if (form.metode_pembayaran === m) setForm({ ...form, metode_pembayaran: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: tanggal_mulai wajib valid (mencegah blank putih akibat Date invalid)
    const isValidDate = (str: string) => {
      if (!str || str.length < 8) return false;
      const d = new Date(str);
      return !isNaN(d.getTime()) && d.getFullYear() > 1900;
    };

    if (
      !form.debitur_nama.trim() ||
      !form.barang_nama.trim() ||
      form.harga_awal <= 0 ||
      form.jangka_waktu_bulan < 1 ||
      !isValidDate(form.tanggal_mulai)
    ) return;

    let jatuhTempo = form.tanggal_jatuh_tempo_input || null;
    if (!jatuhTempo && form.jenis_tempo === 'berjangka') {
      const endDate = new Date(form.tanggal_mulai);
      endDate.setMonth(endDate.getMonth() + form.jangka_waktu_bulan);
      // Format manual agar tidak terkena timezone shift
      const y = endDate.getFullYear();
      const m = String(endDate.getMonth() + 1).padStart(2, '0');
      const d = String(endDate.getDate()).padStart(2, '0');
      jatuhTempo = `${y}-${m}-${d}`;
    }

    const totalDibayar = showMigration && !editItem ? form.total_sudah_dibayar : (editItem ? undefined : 0);
    const sisaHutang = showMigration && !editItem ? Math.max(0, calc.totalHutang - form.total_sudah_dibayar) : (editItem ? undefined : calc.totalHutang);
    const effectiveBunga = calc.bungaEfektifPerTahun;

    const payload: Partial<Tagihan> = {
      debitur_nama: form.debitur_nama,
      debitur_kontak: form.debitur_kontak,
      barang_nama: form.barang_nama,
      harga_awal: form.harga_awal,
      bunga_persen: effectiveBunga,
      jangka_waktu_bulan: form.jangka_waktu_bulan,
      cicilan_per_bulan: calc.cicilanPerBulan,
      total_hutang: calc.totalHutang,
      keuntungan_estimasi: calc.keuntunganEstimasi,
      tanggal_mulai: form.tanggal_mulai,
      tanggal_jatuh_tempo: jatuhTempo,
      tanggal_mulai_bayar: form.tanggal_mulai_bayar || null,
      denda_persen_per_hari: form.denda_persen_per_hari,
      catatan: form.catatan,
      metode_pembayaran: form.metode_pembayaran,
      jenis_tempo: form.jenis_tempo,
      tgl_bayar_tanggal: form.jenis_tempo === 'bulanan' && form.tgl_bayar_tanggal ? form.tgl_bayar_tanggal : null,
      tgl_tempo_tanggal: form.jenis_tempo === 'bulanan' && form.tgl_tempo_tanggal ? form.tgl_tempo_tanggal : null,
      tgl_bayar_hari: form.jenis_tempo === 'bulanan' && form.tgl_bayar_tanggal ? new Date(form.tgl_bayar_tanggal).getDate() : null,
      tgl_tempo_hari: form.jenis_tempo === 'bulanan' && form.tgl_tempo_tanggal ? new Date(form.tgl_tempo_tanggal).getDate() : null,
      sumber_modal: form.sumber_modal,
      kuantitas: form.kuantitas?.trim() || null,
    };

    if (editItem) {
      payload.status = form.status;
    } else {
      payload.status = 'aktif';
      payload.total_dibayar = totalDibayar ?? 0;
      payload.sisa_hutang = sisaHutang ?? calc.totalHutang;
    }

    onSubmit(payload, files.length > 0 ? files : undefined);
  };

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all";
  const sectionClass = "rounded-lg border border-border bg-card/50 p-3 sm:p-4 space-y-3";

  const calcInfo = calcSource === 'harga_akhir'
    ? 'Simulasi dari Pokok Pinjaman + Total Kewajiban → suku bunga & angsuran dihitung otomatis.'
    : calcSource === 'cicilan'
    ? 'Simulasi dari Pokok Pinjaman + Angsuran/Bulan → total kewajiban & suku bunga dihitung otomatis.'
    : calcSource === 'bunga'
    ? 'Simulasi dari Pokok Pinjaman + Suku Bunga → total kewajiban & angsuran dihitung otomatis.'
    : 'Isi salah satu: suku bunga, angsuran/bulan, atau total kewajiban — sisanya dihitung otomatis.';

  const bulanSaatIni = editItem && Number(editItem.cicilan_per_bulan) > 0
    ? Math.round(Number(editItem.total_dibayar) / Number(editItem.cicilan_per_bulan))
    : 0;

  const jadwalPreview = previewJadwalPembayaran(form.tgl_bayar_tanggal, form.tgl_tempo_tanggal);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[64rem] sm:max-w-4xl max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:p-6"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-base sm:text-lg">
            {editItem ? 'Ubah Data Pembiayaan' : 'Ajukan Pinjaman Baru'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {editItem
              ? 'Perbarui informasi pembiayaan nasabah.'
              : 'Catat pembiayaan baru. Isi data yang tersedia, sisanya dihitung otomatis oleh sistem.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* ═══ Data Nasabah ═══ */}
          <div className={sectionClass}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Data Nasabah
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <FieldLabel tooltip={TIPS.nasabah} required>Nama Nasabah</FieldLabel>
                <input
                  type="text"
                  value={form.debitur_nama}
                  onChange={e => { setForm({ ...form, debitur_nama: e.target.value }); setDebiturSearch(e.target.value); setShowDebiturDropdown(true); }}
                  onFocus={() => { setDebiturSearch(form.debitur_nama); setShowDebiturDropdown(true); }}
                  placeholder="Ketik atau pilih nasabah"
                  className={inputClass}
                  required
                  maxLength={100}
                />
                {showDebiturDropdown && filteredDebiturs.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDebiturDropdown(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 max-h-40 overflow-y-auto animate-scale-in">
                      {filteredDebiturs.map(d => (
                        <button
                          key={d.nama}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, debitur_nama: d.nama, debitur_kontak: d.kontak || form.debitur_kontak });
                            setShowDebiturDropdown(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted transition-colors truncate ${form.debitur_nama === d.nama ? 'font-semibold text-primary' : ''}`}
                        >
                          {d.nama}
                          {d.kontak && <span className="text-[10px] text-muted-foreground ml-2">· {d.kontak}</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div>
                <FieldLabel tooltip={TIPS.kontak}>Nomor Kontak Nasabah</FieldLabel>
                <input
                  type="text"
                  value={form.debitur_kontak}
                  onChange={e => setForm({ ...form, debitur_kontak: e.target.value })}
                  placeholder="No. HP / Email"
                  className={inputClass}
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          {/* ═══ Detail Objek Pembiayaan ═══ */}
          <div className={sectionClass}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Detail Objek Pembiayaan
            </p>
            <div>
              <FieldLabel tooltip={TIPS.objekPembiayaan} required>Objek Pembiayaan</FieldLabel>
              <input
                type="text"
                value={form.barang_nama}
                onChange={e => setForm({ ...form, barang_nama: e.target.value })}
                placeholder="cth: iPhone 15, Genset, Laptop"
                className={inputClass}
                required
                maxLength={200}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel tooltip={TIPS.pokokPinjaman} required>Pokok Pinjaman</FieldLabel>
                <CurrencyInput value={form.harga_awal} onChange={v => setForm({ ...form, harga_awal: v })} placeholder="7.400.000" />
              </div>
              <div>
                <FieldLabel tooltip="Jumlah unit barang yang menjadi objek pembiayaan (opsional). Contoh: 2 pcs, 1 lusin, 3 unit.">Kuantitas Barang</FieldLabel>
                <input
                  type="text"
                  value={form.kuantitas}
                  onChange={e => setForm({ ...form, kuantitas: e.target.value })}
                  placeholder="cth: 2 pcs, 1 lusin (opsional)"
                  className={inputClass}
                  maxLength={50}
                />
              </div>
            </div>

            {/* Calc info hint */}
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-accent/50 border border-border">
              <Info className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">{calcInfo}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel tooltip={TIPS.sukuBunga}>Suku Bunga (%)</FieldLabel>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={form.bunga_persen || ''}
                    onChange={e => { setForm({ ...form, bunga_persen: Number(e.target.value) }); setCalcSource('bunga'); }}
                    placeholder="0"
                    className={`${inputClass} flex-1`}
                    min={0} max={999} step="any"
                  />
                  <select
                    value={form.bunga_periode}
                    onChange={e => setForm({ ...form, bunga_periode: e.target.value as BungaPeriode })}
                    className="px-2 py-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all min-w-[72px]"
                  >
                    <option value="tahunan">/thn</option>
                    <option value="bulanan">/bln</option>
                    <option value="harian">/hari</option>
                  </select>
                </div>
              </div>
              <div>
                <FieldLabel tooltip={TIPS.angsuranPerBulan}>Angsuran per Bulan</FieldLabel>
                <CurrencyInput value={form.cicilan_input} onChange={v => { setForm({ ...form, cicilan_input: v }); setCalcSource('cicilan'); }} placeholder="820.000" />
              </div>
              <div>
                <FieldLabel tooltip={TIPS.totalKewajiban}>Total Kewajiban</FieldLabel>
                <CurrencyInput value={form.harga_akhir} onChange={v => { setForm({ ...form, harga_akhir: v }); setCalcSource('harga_akhir'); }} placeholder="4.600.000" />
              </div>
            </div>
          </div>

          {/* ═══ Tenor & Tanggal Akad ═══ */}
          <div className={sectionClass}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tenor & Tanggal Akad
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel tooltip={TIPS.tenor} required>Tenor (bulan)</FieldLabel>
                <input
                  type="number"
                  value={form.jangka_waktu_bulan || ''}
                  onChange={e => setForm({ ...form, jangka_waktu_bulan: Number(e.target.value) })}
                  className={inputClass}
                  required min={1} max={120}
                />
              </div>
              <div>
                <FieldLabel tooltip={TIPS.tanggalAkad} required>Tanggal Akad / Realisasi</FieldLabel>
                <input
                  type="date"
                  value={form.tanggal_mulai}
                  onChange={e => {
                    const val = e.target.value;
                    // Abaikan nilai yang jelas-jelas invalid (misal "0", "0000-00-00")
                    const d = new Date(val);
                    if (val && (isNaN(d.getTime()) || d.getFullYear() < 1900)) return;
                    setForm({ ...form, tanggal_mulai: val });
                  }}
                  className={inputClass}
                  required
                />
              </div>
            </div>
          </div>

          <TagihanFormAdvancedSections
            sectionClass={sectionClass}
            form={form}
            setForm={setForm}
            inputClass={inputClass}
            jadwalPreview={jadwalPreview}
            allMethods={allMethods}
            customMethods={customMethods}
            removeCustomMethod={removeCustomMethod}
            showAddMethod={showAddMethod}
            setShowAddMethod={setShowAddMethod}
            newMethod={newMethod}
            setNewMethod={setNewMethod}
            addCustomMethod={addCustomMethod}
            editItem={editItem}
            showKoreksi={showKoreksi}
            setShowKoreksi={setShowKoreksi}
            fmt={fmt}
            bulanSaatIni={bulanSaatIni}
            koreksiMode={koreksiMode}
            setKoreksiMode={setKoreksiMode}
            koreksiBulan={koreksiBulan}
            setKoreksiBulan={setKoreksiBulan}
            koreksiTotalBaru={koreksiTotalBaru}
            koreksiNominal={koreksiNominal}
            setKoreksiNominal={setKoreksiNominal}
            koreksiSisaBaru={koreksiSisaBaru}
            koreksiCatatan={koreksiCatatan}
            setKoreksiCatatan={setKoreksiCatatan}
            handleKoreksiSimpan={handleKoreksiSimpan}
            koreksiPending={koreksiPending}
            showMigration={showMigration}
            setShowMigration={setShowMigration}
            calc={calc}
            files={files}
            setFiles={setFiles}
            fileInputRef={fileInputRef}
            handleFileAdd={handleFileAdd}
          />
          {/* ═══ Actions ═══ */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
            >
              {isPending ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Ajukan Pinjaman'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
