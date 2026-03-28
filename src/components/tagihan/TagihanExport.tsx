import { Download, FileJson, FileSpreadsheet, FileText, Upload, X, Info, BookOpen } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { exportToJSON, exportToCSV, importFromJSON, importFromCSV } from '@/lib/import-export';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Tagihan } from '@/lib/types';
import { tagihanService } from '@/lib/supabase-service';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Props {
  data: Tagihan[];
  onImportDone: () => void;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(n);

// Template for import
const TEMPLATE_JSON = [
  {
    debitur_nama: "Budi Santoso",
    debitur_kontak: "081234567890",
    barang_nama: "iPhone 15 Pro Max",
    harga_awal: 20000000,
    bunga_persen: 10,
    jangka_waktu_bulan: 12,
    cicilan_per_bulan: 1833333,
    tanggal_mulai: "2026-01-01",
    tanggal_jatuh_tempo: "2027-01-01",
    status: "aktif",
    total_dibayar: 0,
    total_hutang: 22000000,
    sisa_hutang: 22000000,
    keuntungan_estimasi: 2000000,
    denda_persen_per_hari: 0.1,
    catatan: "Cicilan HP"
  }
];

const TEMPLATE_CSV_HEADERS = 'debitur_nama,debitur_kontak,barang_nama,harga_awal,bunga_persen,jangka_waktu_bulan,cicilan_per_bulan,tanggal_mulai,tanggal_jatuh_tempo,status,total_dibayar,total_hutang,sisa_hutang,keuntungan_estimasi,denda_persen_per_hari,catatan';
const TEMPLATE_CSV_ROW = 'Budi Santoso,081234567890,iPhone 15 Pro Max,20000000,10,12,1833333,2026-01-01,2027-01-01,aktif,0,22000000,22000000,2000000,0.1,Cicilan HP';

export default function TagihanExport({ data, onImportDone }: Props) {
  const [expOpen, setExpOpen] = useState(false);
  const [impModalOpen, setImpModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const expRef = useRef<HTMLDivElement>(null);
  const expMenuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!expOpen) return;
    const handler = (e: MouseEvent) => {
      if (expRef.current && !expRef.current.contains(e.target as Node)) {
        setExpOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expOpen]);

  // GSAP animate dropdown
  useEffect(() => {
    if (expOpen && expMenuRef.current) {
      gsap.fromTo(expMenuRef.current, { opacity: 0, y: -8, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' });
    }
  }, [expOpen]);

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Laporan Tagihan - LIVORIA', 14, 15);
    doc.setFontSize(9);
    doc.text(`Diekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 22);

    const rows = data.map(t => [
      t.debitur_nama, t.barang_nama, `Rp${fmt(Number(t.harga_awal))}`,
      `${t.bunga_persen}%`, `${t.jangka_waktu_bulan} bln`,
      `Rp${fmt(Number(t.cicilan_per_bulan))}`, `Rp${fmt(Number(t.sisa_hutang))}`,
      t.status, `Rp${fmt(Number(t.keuntungan_estimasi))}`,
    ]);

    (doc as any).autoTable({
      startY: 28,
      head: [['Debitur', 'Barang', 'Harga Awal', 'Bunga', 'Jangka', 'Cicilan/Bln', 'Sisa Hutang', 'Status', 'Keuntungan']],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [45, 80, 60] },
    });

    const totalModal = data.reduce((s, t) => s + Number(t.harga_awal), 0);
    const totalDibayar = data.reduce((s, t) => s + Number(t.total_dibayar), 0);
    const totalKeuntungan = data.reduce((s, t) => s + Number(t.keuntungan_estimasi), 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Total Modal Keluar: Rp${fmt(totalModal)}`, 14, finalY);
    doc.text(`Total Dibayar: Rp${fmt(totalDibayar)}`, 14, finalY + 6);
    doc.text(`Total Keuntungan Estimasi: Rp${fmt(totalKeuntungan)}`, 14, finalY + 12);

    doc.save('tagihan-livoria.pdf');
    setExpOpen(false);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      let items: Partial<Tagihan>[];
      if (file.name.endsWith('.json')) items = await importFromJSON<Tagihan>(file);
      else items = await importFromCSV<Tagihan>(file);
      for (const item of items) {
        const { id, user_id, created_at, updated_at, ...rest } = item as any;
        await tagihanService.create(rest);
      }
      onImportDone();
      setImpModalOpen(false);
      toast({ title: 'Import Berhasil', description: `${items.length} data diimpor.` });
    } catch (e: any) {
      toast({ title: 'Import Gagal', description: e.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = (type: 'json' | 'csv') => {
    if (type === 'json') {
      const blob = new Blob([JSON.stringify(TEMPLATE_JSON, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'template-tagihan.json'; a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([`${TEMPLATE_CSV_HEADERS}\n${TEMPLATE_CSV_ROW}`], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'template-tagihan.csv'; a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Export */}
        <div className="relative" ref={expRef}>
          <button onClick={() => setExpOpen(!expOpen)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-accent transition-all">
            <Download className="w-4 h-4" /> Ekspor
          </button>
          {expOpen && (
            <div ref={expMenuRef} className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
              <button onClick={() => { exportToJSON(data, 'tagihan-livoria'); setExpOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"><FileJson className="w-4 h-4" /> JSON</button>
              <button onClick={() => { exportToCSV(data, 'tagihan-livoria'); setExpOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"><FileSpreadsheet className="w-4 h-4" /> CSV</button>
              <button onClick={exportPDF} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"><FileText className="w-4 h-4" /> PDF</button>
            </div>
          )}
        </div>

        {/* Import */}
        <button onClick={() => setImpModalOpen(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-accent transition-all">
          <Upload className="w-4 h-4" /> Impor
        </button>
      </div>

      {/* Import Modal */}
      <Dialog open={impModalOpen} onOpenChange={setImpModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Upload className="w-5 h-5" /> Impor Data Tagihan</DialogTitle>
            <DialogDescription>Upload file JSON atau CSV untuk mengimpor data tagihan. Download template terlebih dahulu untuk memastikan format yang benar.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Template Download */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Download Template</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Download template untuk memastikan format data yang benar. Isi sesuai petunjuk, lalu upload kembali.</p>
              <div className="flex gap-2">
                <button onClick={() => downloadTemplate('json')} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-muted/30 hover:bg-accent text-sm font-medium transition-all">
                  <FileJson className="w-4 h-4 text-info" /> Template JSON
                </button>
                <button onClick={() => downloadTemplate('csv')} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-muted/30 hover:bg-accent text-sm font-medium transition-all">
                  <FileSpreadsheet className="w-4 h-4 text-success" /> Template CSV
                </button>
              </div>
            </div>

            {/* Field Guide */}
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-info" />
                <p className="text-sm font-semibold text-foreground">Petunjuk Pengisian</p>
              </div>
              <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed max-h-40 overflow-y-auto pr-1">
                <p><span className="font-semibold text-foreground">debitur_nama</span> (wajib) — Nama peminjam, cth: "Budi Santoso"</p>
                <p><span className="font-semibold text-foreground">debitur_kontak</span> — No. HP/email, cth: "081234567890"</p>
                <p><span className="font-semibold text-foreground">barang_nama</span> (wajib) — Nama barang, cth: "iPhone 15 Pro Max"</p>
                <p><span className="font-semibold text-foreground">harga_awal</span> (wajib) — Harga modal (angka), cth: 20000000</p>
                <p><span className="font-semibold text-foreground">bunga_persen</span> — Persentase bunga tahunan, cth: 10</p>
                <p><span className="font-semibold text-foreground">jangka_waktu_bulan</span> (wajib) — Lama cicilan dalam bulan, cth: 12</p>
                <p><span className="font-semibold text-foreground">cicilan_per_bulan</span> — Nominal cicilan per bulan, cth: 1833333</p>
                <p><span className="font-semibold text-foreground">tanggal_mulai</span> — Format YYYY-MM-DD, cth: "2026-01-01"</p>
                <p><span className="font-semibold text-foreground">tanggal_jatuh_tempo</span> — Tanggal akhir cicilan, format YYYY-MM-DD</p>
                <p><span className="font-semibold text-foreground">status</span> — Salah satu: "aktif", "lunas", "overdue", "ditunda"</p>
                <p><span className="font-semibold text-foreground">total_dibayar</span> — Total yang sudah dibayar, cth: 0</p>
                <p><span className="font-semibold text-foreground">total_hutang</span> — Total hutang keseluruhan, cth: 22000000</p>
                <p><span className="font-semibold text-foreground">sisa_hutang</span> — Sisa hutang saat ini, cth: 22000000</p>
                <p><span className="font-semibold text-foreground">keuntungan_estimasi</span> — Estimasi keuntungan, cth: 2000000</p>
                <p><span className="font-semibold text-foreground">denda_persen_per_hari</span> — Denda keterlambatan %/hari, cth: 0.1</p>
                <p><span className="font-semibold text-foreground">catatan</span> — Catatan tambahan (opsional)</p>
              </div>
            </div>

            {/* Upload Area */}
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center space-y-3">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Pilih file JSON atau CSV untuk diimpor</p>
              <button onClick={() => fileRef.current?.click()} disabled={importing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50">
                {importing ? 'Mengimpor...' : 'Pilih File'}
              </button>
              <p className="text-[10px] text-muted-foreground">Format: .json atau .csv</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <input ref={fileRef} type="file" accept=".json,.csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImport(e.target.files[0]); e.target.value = ''; }} />
    </>
  );
}
