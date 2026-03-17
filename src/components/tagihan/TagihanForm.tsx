import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { calculateTagihan, reverseCalculateTagihan, type BungaPeriode, type CalcResult } from '@/lib/supabase-service';
import type { Tagihan, TagihanStatus, JenisTempo } from '@/lib/types';
import { Calculator, Upload, X, FileText, Image, Info, ChevronDown, ChevronUp, ArrowRightLeft, Plus, Trash2, Edit2, CalendarDays } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagihanService } from '@/lib/supabase-service';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

// ─── Portal-based InfoTooltip — never clipped, fully responsive ──────────────
interface InfoTooltipProps {
  text: string;
}

function InfoTooltip({ text }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [arrowLeft, setArrowLeft] = useState<number>(112);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const btnRef = useRef<HTMLButtonElement>(null);

  const TOOLTIP_W = 224; // w-56
  const EDGE_GAP = 8;

  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const above = r.top;
    const below = vh - r.bottom;
    const place: 'top' | 'bottom' = above >= 90 || above >= below ? 'top' : 'bottom';

    // Clamp left so tooltip stays inside viewport
    const idealLeft = r.left + r.width / 2 - TOOLTIP_W / 2;
    const clampedLeft = Math.max(EDGE_GAP, Math.min(idealLeft, vw - TOOLTIP_W - EDGE_GAP));

    // Arrow offset relative to tooltip box
    const btnCenterX = r.left + r.width / 2;
    const rawArrow = btnCenterX - clampedLeft;
    const clampedArrow = Math.max(12, Math.min(rawArrow, TOOLTIP_W - 12));

    setPlacement(place);
    setArrowLeft(clampedArrow);

    if (place === 'top') {
      setStyle({
        position: 'fixed',
        zIndex: 9999,
        width: TOOLTIP_W,
        left: clampedLeft,
        bottom: vh - r.top + 6,
      });
    } else {
      setStyle({
        position: 'fixed',
        zIndex: 9999,
        width: TOOLTIP_W,
        left: clampedLeft,
        top: r.bottom + 6,
      });
    }
  }, []);

  const show = useCallback(() => { calcPos(); setVisible(true); }, [calcPos]);
  const hide = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!visible) return;
    const handler = () => calcPos();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [visible, calcPos]);

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => (visible ? hide() : show())}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-info/20 text-info hover:bg-info/35 transition-colors focus:outline-none focus:ring-2 focus:ring-info/30 ml-1.5 shrink-0"
        aria-label="Info"
      >
        <Info className="w-2.5 h-2.5" />
      </button>

      {visible &&
        createPortal(
          <div
            role="tooltip"
            style={style}
            className="px-3 py-2.5 rounded-xl bg-foreground text-background text-[11px] leading-relaxed shadow-xl pointer-events-none"
          >
            {text}
            <span
              className={`absolute border-4 border-transparent ${
                placement === 'top' ? 'top-full border-t-foreground' : 'bottom-full border-b-foreground'
              }`}
              style={{ left: arrowLeft, transform: 'translateX(-50%)' }}
            />
          </div>,
          document.body
        )}
    </span>
  );
}

// ─── Labeled field with optional tooltip ─────────────────────────────────────
interface FieldLabelProps {
  children: React.ReactNode;
  tooltip?: string;
  required?: boolean;
}

function FieldLabel({ children, tooltip, required }: FieldLabelProps) {
  return (
    <label className="text-sm font-medium mb-1.5 flex items-center gap-0.5 text-foreground">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
      {tooltip && <InfoTooltip text={tooltip} />}
    </label>
  );
}

// ─── Banking glossary ─────────────────────────────────────────────────────────
const TIPS = {
  nasabah: 'Pihak yang menerima pinjaman. Dalam perbankan disebut debitur atau nasabah peminjam.',
  kontak: 'Nomor telepon atau email nasabah untuk keperluan penagihan dan komunikasi.',
  objekPembiayaan: 'Barang atau aset yang menjadi dasar pembiayaan/kredit yang diberikan.',
  pokokPinjaman: 'Jumlah uang yang dipinjamkan sebelum ditambah bunga. Disebut juga principal atau pokok kredit.',
  sukuBunga: 'Persentase biaya pinjaman per periode. Suku bunga flat dihitung dari pokok awal setiap bulan.',
  angsuranPerBulan: 'Jumlah pembayaran tetap yang harus dibayar nasabah setiap bulan, mencakup pokok + bunga.',
  totalKewajiban: 'Total jumlah yang harus dibayar nasabah hingga lunas, termasuk pokok pinjaman dan seluruh bunga.',
  tenor: 'Jangka waktu pelunasan pinjaman dalam bulan. Semakin panjang tenor, angsuran semakin kecil tapi total bunga lebih besar.',
  tanggalAkad: 'Tanggal resmi perjanjian kredit ditandatangani dan dana mulai berjalan.',
  dendaKeterlambatan: 'Biaya penalti yang dikenakan jika nasabah terlambat membayar angsuran melewati tanggal jatuh tempo.',
  angsuranBerkala: 'Skema pembayaran rutin setiap bulan dengan pola tanggal bayar dan jatuh tempo yang tetap dan berulang.',
  jatuhTempoTetap: 'Skema dengan tanggal jatuh tempo tunggal di akhir periode, cocok untuk kredit dengan pembayaran tidak rutin.',
  bukaJendela: 'Tanggal awal dimana nasabah sudah bisa mulai membayar angsuran bulan tersebut.',
  batasAngsuran: 'Tanggal terakhir angsuran harus diterima sebelum dinyatakan terlambat (jatuh tempo).',
  sumberDana: 'Asal modal yang digunakan untuk membiayai pinjaman ini.',
  danaSendiri: 'Modal berasal dari dana pribadi yang terpisah, tidak terkait dengan penerimaan dari pinjaman lain.',
  danaRevolving: 'Modal berasal dari pembayaran angsuran nasabah lain yang diputar kembali (modal bergulir).',
  rekonsiliasi: 'Proses penyesuaian catatan pembayaran jika terdapat selisih antara data sistem dan realisasi aktual.',
  saldoAwal: 'Jumlah angsuran yang sudah dibayarkan sebelum data dimasukkan ke sistem (untuk pindahan/migrasi).',
  totalKewajiban2: 'Total kewajiban nasabah mencakup pokok + seluruh bunga yang harus dilunasi hingga akhir tenor.',
  pendapatanBunga: 'Keuntungan yang diperoleh pemberi pinjaman dari bunga yang dibayar nasabah selama tenor.',
  bungaEfektif: 'Suku bunga nyata yang mencerminkan biaya pinjaman sesungguhnya per periode, dihitung dari saldo pokok tersisa.',
  saluranPembayaran: 'Media atau platform yang digunakan nasabah untuk melakukan pembayaran angsuran.',
};

// ─── Props & form types ───────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editItem: Tagihan | null;
  onSubmit: (data: Partial<Tagihan>, files?: File[]) => void;
  isPending: boolean;
}

type CalcSource = 'bunga' | 'cicilan' | 'harga_akhir' | 'none';

const STORAGE_KEY = 'livoria_custom_payment_methods';
const DEFAULT_METHODS = ['ShopeePay', 'SPayLater', 'Cash'];

function getCustomMethods(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveCustomMethods(m: string[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); }

const initialForm = {
  debitur_nama: '', debitur_kontak: '', barang_nama: '',
  harga_awal: 0, bunga_persen: 0, bunga_periode: 'tahunan' as BungaPeriode,
  jangka_waktu_bulan: 1, harga_akhir: 0, cicilan_input: 0,
  tanggal_mulai: new Date().toISOString().split('T')[0],
  tanggal_mulai_bayar: '',
  tanggal_jatuh_tempo_input: '',
  denda_persen_per_hari: 0, catatan: '', status: 'aktif' as TagihanStatus,
  sudah_dibayar_bulan: 0, total_sudah_dibayar: 0,
  metode_pembayaran: '',
  jenis_tempo: 'bulanan' as JenisTempo,
  tgl_bayar_tanggal: '',
  tgl_tempo_tanggal: '',
  sumber_modal: 'modal_terpisah' as 'modal_terpisah' | 'modal_bergulir',
};

function cicilanCalc(hargaAwal: number, cicilan: number, jangka: number): CalcResult {
  if (hargaAwal <= 0 || cicilan <= 0 || jangka <= 0)
    return { totalHutang: 0, cicilanPerBulan: 0, keuntunganEstimasi: 0, bungaEfektifPerBulan: 0, bungaEfektifPerTahun: 0, bungaEfektifPerHari: 0 };
  const total = cicilan * jangka;
  const keuntungan = total - hargaAwal;
  const monthlyRate = hargaAwal > 0 ? (keuntungan / (hargaAwal * jangka)) * 100 : 0;
  return {
    totalHutang: Math.round(total),
    cicilanPerBulan: cicilan,
    keuntunganEstimasi: Math.round(keuntungan),
    bungaEfektifPerBulan: Math.round(monthlyRate * 1000) / 1000,
    bungaEfektifPerTahun: Math.round(monthlyRate * 12 * 1000) / 1000,
    bungaEfektifPerHari: Math.round((monthlyRate / 30) * 10000) / 10000,
  };
}

function previewJadwal(bayarDate: string, tempoDate: string): string | null {
  if (!bayarDate || !tempoDate) return null;
  const bayarDay = new Date(bayarDate).getDate();
  const tempoDay = new Date(tempoDate).getDate();
  const crossMonth = tempoDay < bayarDay;
  if (crossMonth) {
    return `Jendela angsuran: tgl ${bayarDay} s/d tgl ${tempoDay} bulan berikutnya (lintas bulan). Pola ini akan berulang setiap bulan.`;
  }
  return `Jendela angsuran: tgl ${bayarDay} s/d tgl ${tempoDay} setiap bulan. Pola ini akan berulang otomatis.`;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TagihanForm({ open, onOpenChange, editItem, onSubmit, isPending }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [calcSource, setCalcSource] = useState<CalcSource>('none');
  const [files, setFiles] = useState<File[]>([]);
  const [showMigration, setShowMigration] = useState(false);
  const [customMethods, setCustomMethods] = useState<string[]>(getCustomMethods());
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

  const { data: allTagihan = [] } = useQuery({ queryKey: ['tagihan'], queryFn: tagihanService.getAll });

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

  const allMethods = [...DEFAULT_METHODS, ...customMethods];

  const calc: CalcResult = useMemo(() => {
    if (form.harga_awal <= 0 || form.jangka_waktu_bulan < 1)
      return { totalHutang: 0, cicilanPerBulan: 0, keuntunganEstimasi: 0, bungaEfektifPerBulan: 0, bungaEfektifPerTahun: 0, bungaEfektifPerHari: 0 };

    if (calcSource === 'cicilan' && form.cicilan_input > 0)
      return cicilanCalc(form.harga_awal, form.cicilan_input, form.jangka_waktu_bulan);
    if (calcSource === 'harga_akhir' && form.harga_akhir > 0)
      return reverseCalculateTagihan(form.harga_awal, form.harga_akhir, form.jangka_waktu_bulan);
    if (calcSource === 'bunga')
      return calculateTagihan(form.harga_awal, form.bunga_persen, form.jangka_waktu_bulan, form.bunga_periode);

    if (form.cicilan_input > 0) return cicilanCalc(form.harga_awal, form.cicilan_input, form.jangka_waktu_bulan);
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
      setForm(initialForm);
      setCalcSource('none');
      setShowMigration(false);
      setShowKoreksi(false);
    }
    setFiles([]);
  }, [editItem, open]);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const koreksiTotalBaru = koreksiMode === 'bulan'
    ? Math.round(koreksiBulan * Number(editItem?.cicilan_per_bulan ?? 0))
    : koreksiNominal;

  const koreksiSisaBaru = editItem ? Math.max(0, Number(editItem.total_hutang) - koreksiTotalBaru) : 0;

  const handleKoreksiSimpan = async () => {
    if (!editItem) return;
    setKoreksiPending(true);
    try {
      const newSisaHutang = Math.max(0, Number(editItem.total_hutang) - koreksiTotalBaru);
      const newStatus: TagihanStatus =
        newSisaHutang <= 0 ? 'lunas' : editItem.status === 'lunas' ? 'aktif' : editItem.status;

      await supabase.from('tagihan').update({
        total_dibayar: koreksiTotalBaru,
        sisa_hutang: newSisaHutang,
        status: newStatus,
      }).eq('id', editItem.id);

      const { data: { user } } = await supabase.auth.getUser();
      const catatanFinal = koreksiCatatan.trim()
        || `Rekonsiliasi saldo angsuran: ${koreksiMode === 'bulan' ? `${koreksiBulan} periode angsuran` : `nominal ${fmt(koreksiNominal)}`}`;
      await supabase.from('tagihan_history').insert({
        tagihan_id: editItem.id,
        aksi: 'koreksi',
        detail: catatanFinal,
        jumlah: koreksiTotalBaru,
        user_id: user?.id,
      });

      qc.invalidateQueries({ queryKey: ['tagihan'] });
      qc.invalidateQueries({ queryKey: ['history', editItem.id] });
      setShowKoreksi(false);
      toast({ title: 'Rekonsiliasi Disimpan', description: `Total angsuran terbayar diperbarui menjadi ${fmt(koreksiTotalBaru)}.` });
    } catch (e: any) {
      toast({ title: 'Gagal Menyimpan Rekonsiliasi', description: e.message, variant: 'destructive' });
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
    saveCustomMethods(updated);
    setForm({ ...form, metode_pembayaran: m });
    setNewMethod('');
    setShowAddMethod(false);
  };

  const removeCustomMethod = (m: string) => {
    const updated = customMethods.filter(x => x !== m);
    setCustomMethods(updated);
    saveCustomMethods(updated);
    if (form.metode_pembayaran === m) setForm({ ...form, metode_pembayaran: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.debitur_nama.trim() || !form.barang_nama.trim() || form.harga_awal <= 0 || form.jangka_waktu_bulan < 1) return;

    let jatuhTempo = form.tanggal_jatuh_tempo_input || null;
    if (!jatuhTempo && form.jenis_tempo === 'berjangka') {
      const endDate = new Date(form.tanggal_mulai);
      endDate.setMonth(endDate.getMonth() + form.jangka_waktu_bulan);
      jatuhTempo = endDate.toISOString().split('T')[0];
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
      tanggal_jatuh_tempo: jatuhTempo as any,
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
    };

    if (editItem) {
      payload.status = form.status;
    } else {
      payload.status = 'aktif';
      payload.total_dibayar = totalDibayar as any;
      payload.sisa_hutang = sisaHutang as any;
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

  const jadwalPreview = previewJadwal(form.tgl_bayar_tanggal, form.tgl_tempo_tanggal);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:p-6"
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
            <div>
              <FieldLabel tooltip={TIPS.pokokPinjaman} required>Pokok Pinjaman</FieldLabel>
              <CurrencyInput value={form.harga_awal} onChange={v => setForm({ ...form, harga_awal: v })} placeholder="7.400.000" />
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
                  onChange={e => setForm({ ...form, tanggal_mulai: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
            </div>
          </div>

          {/* ═══ Jadwal Angsuran & Notifikasi ═══ */}
          <div className={sectionClass}>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Jadwal Angsuran & Notifikasi
              </p>
            </div>

            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setForm({ ...form, jenis_tempo: 'bulanan' })}
                className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all ${form.jenis_tempo === 'bulanan' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  🔄 Angsuran Berkala
                  <InfoTooltip text={TIPS.angsuranBerkala} />
                </span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, jenis_tempo: 'berjangka' })}
                className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all ${form.jenis_tempo === 'berjangka' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  📅 Jatuh Tempo Tetap
                  <InfoTooltip text={TIPS.jatuhTempoTetap} />
                </span>
              </button>
            </div>

            {form.jenis_tempo === 'bulanan' ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-info/5 border border-info/20">
                  <CalendarDays className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Pilih <strong>tanggal buka jendela</strong> dan <strong>batas angsuran</strong> pertama. Sistem akan mengulang siklus ini setiap bulan otomatis.
                    <br />
                    Contoh: buka tgl 25 Maret 2026, batas tgl 5 April 2026 → setiap bulan jendela angsuran tgl 25 s/d tgl 5.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel tooltip={TIPS.bukaJendela}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-info/20 text-info text-[10px] font-bold flex items-center justify-center">1</span>
                        Tanggal Buka Jendela Angsuran
                      </span>
                    </FieldLabel>
                    <input
                      type="date"
                      value={form.tgl_bayar_tanggal}
                      onChange={e => setForm({ ...form, tgl_bayar_tanggal: e.target.value })}
                      className={inputClass}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Awal periode penerimaan angsuran
                    </p>
                  </div>
                  <div>
                    <FieldLabel tooltip={TIPS.batasAngsuran}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-destructive/20 text-destructive text-[10px] font-bold flex items-center justify-center">2</span>
                        Tanggal Batas Angsuran
                      </span>
                    </FieldLabel>
                    <input
                      type="date"
                      value={form.tgl_tempo_tanggal}
                      onChange={e => setForm({ ...form, tgl_tempo_tanggal: e.target.value })}
                      className={inputClass}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Tanggal jatuh tempo angsuran
                    </p>
                  </div>
                </div>

                {jadwalPreview && (
                  <div className="rounded-lg bg-success/5 border border-success/20 p-3">
                    <p className="text-xs font-semibold text-success mb-1.5 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" /> Siklus Angsuran Terdeteksi
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{jadwalPreview}</p>

                    {form.tgl_bayar_tanggal && form.tgl_tempo_tanggal && (() => {
                      const bayarDay = new Date(form.tgl_bayar_tanggal).getDate();
                      const tempoDay = new Date(form.tgl_tempo_tanggal).getDate();
                      const crossMonth = tempoDay < bayarDay;
                      const today = new Date();
                      const examples: string[] = [];
                      for (let i = 0; i < 3; i++) {
                        const refMonth = (today.getMonth() + i) % 12;
                        const refYear = today.getFullYear() + Math.floor((today.getMonth() + i) / 12);
                        const lastDayBayar = new Date(refYear, refMonth + 1, 0).getDate();
                        const clampedBayar = Math.min(bayarDay, lastDayBayar);
                        let tempoMonth = refMonth;
                        let tempoYear = refYear;
                        if (crossMonth) {
                          tempoMonth = refMonth === 11 ? 0 : refMonth + 1;
                          tempoYear = refMonth === 11 ? refYear + 1 : refYear;
                        }
                        const lastDayTempo = new Date(tempoYear, tempoMonth + 1, 0).getDate();
                        const clampedTempo = Math.min(tempoDay, lastDayTempo);
                        const startDate = new Date(refYear, refMonth, clampedBayar);
                        const endDate = new Date(tempoYear, tempoMonth, clampedTempo);
                        examples.push(`${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`);
                      }
                      return (
                        <div className="mt-2 space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground">Contoh jendela angsuran (3 bulan ke depan):</p>
                          {examples.map((ex, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center shrink-0">{i + 1}</span>
                              {ex}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Tentukan rentang pembayaran dan tanggal jatuh tempo akhir pembiayaan.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Tanggal Mulai Pembayaran</FieldLabel>
                    <input
                      type="date"
                      value={form.tanggal_mulai_bayar}
                      onChange={e => setForm({ ...form, tanggal_mulai_bayar: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <FieldLabel tooltip={TIPS.batasAngsuran}>Tanggal Jatuh Tempo Akhir</FieldLabel>
                    <input
                      type="date"
                      value={form.tanggal_jatuh_tempo_input}
                      onChange={e => setForm({ ...form, tanggal_jatuh_tempo_input: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ Saluran Pembayaran ═══ */}
          <div className={sectionClass}>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Saluran Pembayaran
              </p>
              <InfoTooltip text={TIPS.saluranPembayaran} />
            </div>
            <div className="flex flex-wrap gap-2">
              {allMethods.map(m => (
                <div key={m} className="relative group">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, metode_pembayaran: m })}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${form.metode_pembayaran === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}
                  >
                    {m}
                  </button>
                  {customMethods.includes(m) && (
                    <button
                      type="button"
                      onClick={() => removeCustomMethod(m)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
              {!showAddMethod ? (
                <button
                  type="button"
                  onClick={() => setShowAddMethod(true)}
                  className="px-3 py-2 rounded-lg text-xs font-medium border border-dashed border-border text-muted-foreground hover:bg-accent transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> + Tambah Saluran
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newMethod}
                    onChange={e => setNewMethod(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomMethod())}
                    placeholder="Nama saluran"
                    className="px-2.5 py-2 rounded-lg border border-input bg-background text-xs w-28 focus:outline-none focus:ring-2 focus:ring-ring/20"
                    autoFocus maxLength={30}
                  />
                  <button type="button" onClick={addCustomMethod} className="p-2 rounded-lg bg-primary text-primary-foreground"><Plus className="w-3 h-3" /></button>
                  <button type="button" onClick={() => { setShowAddMethod(false); setNewMethod(''); }} className="p-2 rounded-lg bg-muted text-muted-foreground"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          </div>

          {/* ═══ Sumber Dana ═══ */}
          <div className={sectionClass}>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sumber Dana
              </p>
              <InfoTooltip text={TIPS.sumberDana} />
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setForm({ ...form, sumber_modal: 'modal_terpisah' })}
                className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all min-h-[44px] ${form.sumber_modal === 'modal_terpisah' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  💰 Dana Sendiri
                  <InfoTooltip text={TIPS.danaSendiri} />
                </span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, sumber_modal: 'modal_bergulir' })}
                className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all min-h-[44px] ${form.sumber_modal === 'modal_bergulir' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  🔄 Dana Bergulir
                  <InfoTooltip text={TIPS.danaRevolving} />
                </span>
              </button>
            </div>
          </div>

          {/* ═══ Denda & Status ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel tooltip={TIPS.dendaKeterlambatan}>Denda Keterlambatan (%/hari)</FieldLabel>
              <input
                type="number"
                value={form.denda_persen_per_hari || ''}
                onChange={e => setForm({ ...form, denda_persen_per_hari: Number(e.target.value) })}
                placeholder="0"
                className={inputClass}
                min={0} max={10} step={0.01}
              />
            </div>
            {editItem && (
              <div>
                <FieldLabel>Status Pembiayaan</FieldLabel>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value as TagihanStatus })}
                  className={inputClass}
                >
                  <option value="aktif">Aktif</option>
                  <option value="lunas">Lunas</option>
                  <option value="overdue">Overdue</option>
                  <option value="ditunda">Ditunda</option>
                </select>
              </div>
            )}
          </div>

          {/* ═══ Rekonsiliasi Saldo Angsuran (Edit only) ═══ */}
          {editItem && (
            <div className="rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setShowKoreksi(!showKoreksi)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-info" />
                  <span className="text-sm font-medium text-foreground">Rekonsiliasi Saldo Angsuran</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-info/20 text-info font-medium">Rekonsiliasi</span>
                  <InfoTooltip text={TIPS.rekonsiliasi} />
                </div>
                {showKoreksi ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {showKoreksi && (
                <div className="p-3 sm:p-4 space-y-3 border-t border-border">
                  <div className="rounded-lg bg-muted/40 p-2.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total kewajiban</span><span className="font-semibold">{fmt(Number(editItem.total_hutang))}</span></div>
                    <div className="flex justify-between mt-1"><span className="text-muted-foreground">Total angsuran terbayar</span><span className="font-semibold text-success">{fmt(Number(editItem.total_dibayar))}</span></div>
                    <div className="flex justify-between mt-1"><span className="text-muted-foreground">Angsuran per bulan</span><span className="font-semibold">{fmt(Number(editItem.cicilan_per_bulan))}</span></div>
                    <div className="flex justify-between mt-1"><span className="text-muted-foreground">Estimasi periode terbayar</span><span className="font-semibold">{bulanSaatIni} periode</span></div>
                  </div>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setKoreksiMode('bulan')}
                      className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${koreksiMode === 'bulan' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                    >
                      📅 Per Periode Angsuran
                    </button>
                    <button
                      type="button"
                      onClick={() => setKoreksiMode('nominal')}
                      className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${koreksiMode === 'nominal' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                    >
                      💰 Nominal Terbayar
                    </button>
                  </div>
                  {koreksiMode === 'bulan' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>Angsuran Sudah Dibayar</FieldLabel>
                        <input
                          type="number"
                          value={koreksiBulan || ''}
                          onChange={e => setKoreksiBulan(Number(e.target.value))}
                          placeholder={String(bulanSaatIni)}
                          className={inputClass}
                          min={0} max={editItem.jangka_waktu_bulan}
                        />
                      </div>
                      <div>
                        <FieldLabel>Total Angsuran Terhitung</FieldLabel>
                        <div className="px-3 py-2.5 rounded-lg border border-input bg-muted text-sm font-semibold">{fmt(koreksiTotalBaru)}</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <FieldLabel>Saldo Terbayar (Nominal)</FieldLabel>
                      <CurrencyInput value={koreksiNominal} onChange={setKoreksiNominal} placeholder="Masukkan total angsuran terbayar" />
                    </div>
                  )}
                  {koreksiTotalBaru !== Number(editItem.total_dibayar) && (
                    <div className="rounded-lg bg-muted/40 p-2.5 space-y-1 text-[10px] text-muted-foreground">
                      <div className="flex justify-between"><span>Total terbayar (sebelum)</span><span>{fmt(Number(editItem.total_dibayar))}</span></div>
                      <div className="flex justify-between"><span>Total terbayar (setelah)</span><span className={`font-bold ${koreksiTotalBaru > Number(editItem.total_dibayar) ? 'text-success' : 'text-warning'}`}>{fmt(koreksiTotalBaru)}</span></div>
                      <div className="flex justify-between border-t border-border pt-1"><span>Sisa kewajiban baru</span><span className="font-bold">{fmt(koreksiSisaBaru)}</span></div>
                    </div>
                  )}
                  <div>
                    <FieldLabel>Keterangan Rekonsiliasi</FieldLabel>
                    <input
                      type="text"
                      value={koreksiCatatan}
                      onChange={e => setKoreksiCatatan(e.target.value)}
                      placeholder="cth: Penyesuaian data historis nasabah"
                      className={inputClass}
                      maxLength={200}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleKoreksiSimpan}
                    disabled={koreksiPending || koreksiTotalBaru === Number(editItem.total_dibayar)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-info text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-40"
                  >
                    <Edit2 className="w-4 h-4" />
                    {koreksiPending ? 'Menyimpan...' : 'Simpan Rekonsiliasi'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══ Input Saldo Awal / Migrasi (Tambah only) ═══ */}
          {!editItem && (
            <div className="rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMigration(!showMigration)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium text-foreground">Input Saldo Awal / Migrasi</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium">Opsional</span>
                  <InfoTooltip text={TIPS.saldoAwal} />
                </div>
                {showMigration ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {showMigration && (
                <div className="p-3 sm:p-4 space-y-3 border-t border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Angsuran Sudah Dibayar</FieldLabel>
                      <input
                        type="number"
                        value={form.sudah_dibayar_bulan || ''}
                        onChange={e => {
                          const bulan = Number(e.target.value);
                          setForm({ ...form, sudah_dibayar_bulan: bulan, total_sudah_dibayar: bulan * calc.cicilanPerBulan });
                        }}
                        placeholder="0"
                        className={inputClass}
                        min={0} max={form.jangka_waktu_bulan}
                      />
                    </div>
                    <div>
                      <FieldLabel tooltip={TIPS.saldoAwal}>Saldo Terbayar Sebelumnya</FieldLabel>
                      <CurrencyInput value={form.total_sudah_dibayar} onChange={v => setForm({ ...form, total_sudah_dibayar: v })} placeholder="0" />
                    </div>
                  </div>
                  {form.total_sudah_dibayar > 0 && (
                    <div className="text-xs text-muted-foreground p-2 bg-accent/30 rounded-md">
                      Sisa kewajiban setelah migrasi: <span className="font-bold text-foreground">{fmt(Math.max(0, calc.totalHutang - form.total_sudah_dibayar))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ Keterangan Tambahan ═══ */}
          <div>
            <FieldLabel>Keterangan Tambahan</FieldLabel>
            <textarea
              value={form.catatan}
              onChange={e => setForm({ ...form, catatan: e.target.value })}
              placeholder="Catatan atau keterangan tambahan (opsional)"
              rows={2}
              className={`${inputClass} resize-none`}
              maxLength={500}
            />
          </div>

          {/* ═══ Lampiran Dokumen (Tambah only) ═══ */}
          {!editItem && (
            <div className={sectionClass}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lampiran Dokumen / Struk</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Opsional</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs">
                    {f.type.startsWith('image/') ? <Image className="w-3.5 h-3.5 text-info" /> : <FileText className="w-3.5 h-3.5 text-warning" />}
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button type="button" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="p-0.5 rounded hover:bg-destructive/20">
                      <X className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-accent/30 transition-all text-sm text-muted-foreground"
              >
                <Upload className="w-4 h-4" /> Tambah Dokumen / Struk (maks 5MB)
              </button>
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple onChange={handleFileAdd} className="hidden" />
            </div>
          )}

          {/* ═══ Simulasi Pembiayaan ═══ */}
          <div className="rounded-lg bg-muted/50 border border-border p-3 sm:p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" /> Simulasi Pembiayaan
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                  Total Kewajiban
                  <InfoTooltip text={TIPS.totalKewajiban2} />
                </p>
                <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">{fmt(calc.totalHutang)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                  Angsuran/Bulan
                  <InfoTooltip text={TIPS.angsuranPerBulan} />
                </p>
                <p className="text-xs sm:text-sm font-bold text-primary mt-0.5">{fmt(calc.cicilanPerBulan)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                  Pendapatan Bunga
                  <InfoTooltip text={TIPS.pendapatanBunga} />
                </p>
                <p className="text-xs sm:text-sm font-bold mt-0.5" style={{ color: 'hsl(var(--success))' }}>{fmt(calc.keuntunganEstimasi)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border">
              <div>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                  Bunga Efektif/Thn
                  <InfoTooltip text={TIPS.bungaEfektif} />
                </p>
                <p className="text-xs font-semibold text-foreground mt-0.5">{calc.bungaEfektifPerTahun}%</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Bunga Efektif/Bln</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">{calc.bungaEfektifPerBulan}%</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Bunga Efektif/Hari</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">{calc.bungaEfektifPerHari}%</p>
              </div>
            </div>
          </div>

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