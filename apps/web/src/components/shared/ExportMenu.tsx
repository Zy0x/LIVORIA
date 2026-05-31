/** Shared roundtrip export/import menu with optional direct import validation. */

import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import type { ZodTypeAny } from 'zod';
import {
  Download, Upload, FileJson, FileSpreadsheet,
  ChevronRight, RefreshCw, Loader2, CheckCircle2,
  AlertTriangle, Sparkles, Database,
} from 'lucide-react';
import type { DirectImportResult } from '@/lib/import-export';
import { toast } from '@/hooks/use-toast';
import { IMPORT_MODE_OPTIONS, type ImportMode } from './export-menu-options';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ─── Tipe ─────────────────────────────────────────────────────────────────────

interface ExportOption {
  label: string;
  icon: typeof FileJson;
  onClick: () => void;
}

interface Props<TItem = unknown> {
  data: TItem[];
  filename: string;
  mediaType?: 'anime' | 'donghua';
  /** Legacy: untuk BulkImportDialog */
  onImport?: (items: Partial<TItem>[]) => Promise<void>;
  /** Callback setelah direct import selesai (untuk refresh data) */
  onImportComplete?: () => void;
  extraExports?: ExportOption[];
  importAccept?: string;
  importSchema?: ZodTypeAny;
  importLabel?: string;
  /** Apakah menampilkan tombol Bulk Import terpisah */
  showBulkImport?: boolean;
}

const loadImportExport = () => import('@/lib/import-export');

// ─── Mode impor ───────────────────────────────────────────────────────────────

// ─── Komponen utama ───────────────────────────────────────────────────────────

export default function ExportMenu<TItem = unknown>({
  data,
  filename,
  mediaType,
  onImport,
  onImportComplete,
  extraExports,
  importAccept = '.json,.csv',
  importSchema,
  importLabel,
  showBulkImport = false,
}: Props<TItem>) {
  const [open, setOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('upsert');
  const [importStatus, setImportStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [importResult, setImportResult] = useState<DirectImportResult | null>(null);
  const [importError, setImportError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const isMediaDirectImport = mediaType === 'anime' || mediaType === 'donghua';
  const typeLabel = importLabel ?? (mediaType === 'anime' ? 'Anime' : mediaType === 'donghua' ? 'Donghua' : 'Data');

  // ── Compute position ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuW = 220;
    let left = rect.right - menuW;
    left = Math.max(8, Math.min(left, vw - menuW - 8));
    const spaceBelow = vh - rect.bottom - 8;
    const showAbove = spaceBelow < 240 && rect.top > 240;

    setMenuStyle({
      position: 'fixed' as const,
      zIndex: 99999,
      width: menuW,
      left,
      ...(showAbove
        ? { bottom: vh - rect.top + 4, top: 'auto' }
        : { top: rect.bottom + 4, bottom: 'auto' }),
    });
  }, [open]);

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      closeMenu();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Animate open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open && menuRef.current) {
      gsap.fromTo(
        menuRef.current,
        { opacity: 0, y: -8, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'back.out(2)' }
      );
    }
  }, [open]);

  const closeMenu = () => {
    if (menuRef.current) {
      gsap.to(menuRef.current, {
        opacity: 0,
        y: -6,
        scale: 0.95,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => setOpen(false),
      });
    } else {
      setOpen(false);
    }
  };

  const handleToggle = () => {
    if (open) closeMenu();
    else setOpen(true);
  };

  // ── Reset import state ──────────────────────────────────────────────────────
  const resetImport = () => {
    setImportStatus('idle');
    setImportResult(null);
    setImportError('');
    setSelectedFile(null);
    setConfirmReplace(false);
  };

  const handleImportDialogClose = (v: boolean) => {
    if (!v) resetImport();
    setImportDialogOpen(v);
  };

  // ── File selected ───────────────────────────────────────────────────────────
  const handleFileSelected = async (file: File) => {
    resetImport();
    setSelectedFile(file);
    setImportDialogOpen(true);
  };

  // ── Execute direct import ────────────────────────────────────────────────────
  const executeDirectImport = async () => {
    if (!selectedFile) return;
    if (isMediaDirectImport && importMode === 'replace_all' && !confirmReplace) return;

    setImportStatus('loading');
    setImportError('');
    setImportResult(null);

    try {
      let result: DirectImportResult;
      const importExport = await loadImportExport();
      if (isMediaDirectImport) {
        result = await importExport.directImportToSupabase(selectedFile, mediaType, importMode);
      } else {
        if (!onImport) throw new Error('Handler import belum tersedia untuk data ini.');
        const options = { schema: importSchema, label: typeLabel };
        const items = selectedFile.name.endsWith('.json')
          ? await importExport.importFromJSON<TItem>(selectedFile, options)
          : await importExport.importFromCSV<TItem>(selectedFile, options);

        await onImport(items);
        result = {
          inserted: items.length,
          updated: 0,
          skipped: 0,
          errors: [],
          total: items.length,
        };
      }
      setImportResult(result);
      setImportStatus('success');

      // Refresh data di halaman
      onImportComplete?.();

      // Legacy callback (untuk BulkImportDialog atau handler lama)
      if (onImport && result.inserted > 0) {
        // Tidak perlu panggil lagi — sudah di-insert langsung ke Supabase
        // tapi panggil dengan array kosong untuk trigger refresh jika perlu
      }
    } catch (err) {
      setImportStatus('error');
      setImportError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengimpor data.');
    }
  };

  // ── Legacy: handle import via callback (backward compat) ────────────────────
  const handleLegacyImport = async (file: File) => {
    if (!onImport) return;
    const { importFromJSON, importFromCSV } = await loadImportExport();
    const items = file.name.endsWith('.json')
      ? await importFromJSON<TItem>(file)
      : await importFromCSV<TItem>(file);
    await onImport(items);
  };

  const handleExportJSON = async () => {
    try {
      const { exportToJSON } = await loadImportExport();
      exportToJSON(data, filename);
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Export Gagal',
        description: error instanceof Error ? error.message : 'Modul export gagal dimuat.',
        variant: 'destructive',
      });
    }
  };

  const handleExportCSV = async () => {
    try {
      const { exportToCSV } = await loadImportExport();
      exportToCSV(data, filename);
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Export Gagal',
        description: error instanceof Error ? error.message : 'Modul export gagal dimuat.',
        variant: 'destructive',
      });
    }
  };

  // ── Menu items ───────────────────────────────────────────────────────────────
  const menuContent = open ? (
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-card border border-border rounded-xl shadow-2xl py-1 overflow-hidden"
    >
      {/* ── Ekspor section ── */}
      <div className="px-3 py-1.5">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
          Ekspor
        </p>
      </div>

      <button
        onClick={() => void handleExportJSON()}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors"
      >
        <FileJson className="w-4 h-4 text-success shrink-0" />
        <span className="flex-1 text-left">JSON</span>
        <span className="text-[9px] text-muted-foreground">Semua field</span>
      </button>

      <button
        onClick={() => void handleExportCSV()}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors"
      >
        <FileSpreadsheet className="w-4 h-4 text-info shrink-0" />
        <span className="flex-1 text-left">CSV</span>
        <span className="text-[9px] text-muted-foreground">Excel-compatible</span>
      </button>

      {extraExports?.map((opt, i) => (
        <button
          key={i}
          onClick={() => { opt.onClick(); setOpen(false); }}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors"
        >
          <opt.icon className="w-4 h-4 shrink-0" />
          {opt.label}
        </button>
      ))}

      {/* ── Divider ── */}
      <div className="mx-3 my-1 border-t border-border/60" />

      {/* ── Impor section ── */}
      <div className="px-3 py-1.5">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
          Impor
        </p>
      </div>

      {/* Direct Import (sinkron dengan ekspor) */}
      <button
        onClick={() => {
          setOpen(false);
          // Reset state & buka file picker
          resetImport();
          fileRef.current?.click();
        }}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors"
      >
        <Database className="w-4 h-4 text-primary shrink-0" />
        <span className="flex-1 text-left text-primary font-medium">
          Impor Langsung
        </span>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
      </button>

      <div className="px-3 pb-1.5">
        <p className="text-[9px] text-muted-foreground leading-relaxed">
          Restore dari file ekspor JSON/CSV secara langsung ke koleksi.
        </p>
      </div>

      {/* Bulk Import (dengan AI + auto-fill) */}
      {showBulkImport && (
        <button
          onClick={() => {
            setOpen(false);
            // Trigger bulk import via legacy callback / onImport
            if (onImport) {
              // Buka file picker untuk legacy mode
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = importAccept;
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleLegacyImport(file);
              };
              input.click();
            }
          }}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors"
        >
          <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
          <span className="flex-1 text-left font-medium">Impor Lanjutan (AI)</span>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
    </div>
  ) : null;

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-accent transition-all"
        title="Ekspor / Impor data"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Ekspor</span>
        <span className="text-[10px] opacity-60">/</span>
        <Upload className="w-4 h-4" />
        <span className="hidden sm:inline">Impor</span>
      </button>

      {/* ── Dropdown portal ── */}
      {typeof document !== 'undefined' && createPortal(menuContent, document.body)}

      {/* ── Hidden file input untuk Direct Import ── */}
      <input
        ref={fileRef}
        type="file"
        accept={importAccept}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
          e.target.value = '';
        }}
      />

      {/* ── Direct Import Dialog ── */}
      <Dialog open={importDialogOpen} onOpenChange={handleImportDialogClose}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Upload className="w-4 h-4 text-primary" />
              Impor {typeLabel}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedFile ? (
                <span className="text-foreground font-medium">
                  📄 {selectedFile.name}
                  <span className="text-muted-foreground font-normal ml-1">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </span>
              ) : (
                isMediaDirectImport
                  ? 'Pilih mode impor dan konfirmasi untuk memulai.'
                  : 'Konfirmasi untuk memulai import data.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">

            {/* ── Idle / Pilih mode ── */}
            {importStatus === 'idle' && (
              <>
                {isMediaDirectImport ? (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Mode Impor
                    </label>
                    <div className="space-y-2">
                      {IMPORT_MODE_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const isSelected = importMode === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setImportMode(opt.value);
                              setConfirmReplace(false);
                            }}
                            className={`
                              w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all
                              ${isSelected
                                ? opt.dangerous
                                  ? 'border-destructive/50 bg-destructive/5'
                                  : 'border-primary/40 bg-primary/5'
                                : 'border-border hover:border-border/80 hover:bg-muted/40'
                              }
                            `}
                          >
                            <div className={`
                              flex items-center justify-center w-7 h-7 rounded-lg shrink-0 mt-0.5
                              ${isSelected
                                ? opt.dangerous ? 'bg-destructive/15' : 'bg-primary/10'
                                : 'bg-muted'
                              }
                            `}>
                              <Icon className={`w-3.5 h-3.5 ${isSelected ? opt.color : 'text-muted-foreground'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${isSelected ? opt.color : 'text-foreground'}`}>
                                {opt.label}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                {opt.description}
                              </p>
                            </div>
                            {isSelected && (
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${opt.dangerous ? 'bg-destructive' : 'bg-primary'}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
                    File JSON/CSV akan divalidasi lebih dulu, lalu ditambahkan lewat handler import {typeLabel.toLowerCase()}.
                  </div>
                )}

                {/* Konfirmasi replace all */}
                {isMediaDirectImport && importMode === 'replace_all' && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive font-semibold leading-relaxed">
                        Perhatian! Mode ini akan menghapus SEMUA data {typeLabel.toLowerCase()} kamu
                        dan menggantinya dengan isi file ini. Tindakan ini tidak bisa dibatalkan.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmReplace}
                        onChange={e => setConfirmReplace(e.target.checked)}
                        className="rounded border-destructive/60"
                      />
                      <span className="text-xs text-destructive font-medium">
                        Saya mengerti dan ingin melanjutkan
                      </span>
                    </label>
                  </div>
                )}

                {/* Info roundtrip */}
                {isMediaDirectImport ? (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-[10px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground text-xs">
                    ✓ Roundtrip sempurna dengan fitur Ekspor
                  </p>
                  <p>File JSON/CSV hasil Ekspor Livoria akan di-restore 100%:</p>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                    {[
                      'title', 'status', 'genre', 'rating', 'episodes',
                      'synopsis', 'notes', 'season', 'cour', 'parent_title',
                      'is_movie', 'is_favorite', 'is_bookmarked',
                      'cover_url', 'streaming_url', 'schedule',
                      'studio', 'release_year', 'mal_id', 'anilist_id',
                      'mal_url', 'anilist_url', 'alternative_titles',
                      'watch_status', 'watched_at', 'duration_minutes',
                    ].map(f => (
                      <code key={f} className="bg-muted px-1 py-0.5 rounded text-[9px]">{f}</code>
                    ))}
                  </div>
                </div>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-[10px] text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground text-xs">
                      Import aman dengan validasi struktur data
                    </p>
                    <p>Field tidak valid akan ditolak sebelum data dikirim ke koleksi.</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleImportDialogClose(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:bg-accent transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={executeDirectImport}
                    disabled={
                      !selectedFile ||
                      (isMediaDirectImport && importMode === 'replace_all' && !confirmReplace)
                    }
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
                      transition-all disabled:opacity-40 disabled:cursor-not-allowed
                      ${isMediaDirectImport && importMode === 'replace_all'
                        ? 'bg-destructive text-destructive-foreground hover:opacity-90'
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                      }
                    `}
                  >
                    <Upload className="w-4 h-4" />
                    Mulai Impor
                  </button>
                </div>
              </>
            )}

            {/* ── Loading ── */}
            {importStatus === 'loading' && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground font-medium">
                  Mengimpor data ke koleksi...
                </p>
                <p className="text-xs text-muted-foreground">
                  Mohon tunggu, jangan tutup halaman ini.
                </p>
              </div>
            )}

            {/* ── Success ── */}
            {importStatus === 'success' && importResult && (
              <div className="space-y-4">
                {/* Header sukses */}
                <div className="flex flex-col items-center py-4 gap-2">
                  <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-success" />
                  </div>
                  <p className="text-base font-bold text-foreground">Import Selesai!</p>
                  <p className="text-xs text-muted-foreground">
                    {importResult.total} entri diproses dari {selectedFile?.name}
                  </p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: 'Ditambahkan',
                      value: importResult.inserted,
                      color: 'text-success',
                      bg: 'bg-success/10 border-success/20',
                    },
                    {
                      label: 'Diperbarui',
                      value: importResult.updated,
                      color: 'text-primary',
                      bg: 'bg-primary/10 border-primary/20',
                    },
                    {
                      label: 'Dilewati',
                      value: importResult.skipped,
                      color: 'text-warning',
                      bg: 'bg-warning/10 border-warning/20',
                    },
                    {
                      label: 'Error',
                      value: importResult.errors.length,
                      color: importResult.errors.length > 0 ? 'text-destructive' : 'text-muted-foreground',
                      bg: importResult.errors.length > 0 ? 'bg-destructive/10 border-destructive/20' : 'bg-muted border-border',
                    },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
                      <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Error list */}
                {importResult.errors.length > 0 && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2 max-h-32 overflow-y-auto">
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">
                      {importResult.errors.length} Error:
                    </p>
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="text-[10px] text-destructive">
                        <span className="font-semibold">{err.title}:</span> {err.reason}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleImportDialogClose(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
                  >
                    Selesai
                  </button>
                  <button
                    onClick={resetImport}
                    className="px-4 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:bg-accent transition-all"
                  >
                    Import Lagi
                  </button>
                </div>
              </div>
            )}

            {/* ── Error ── */}
            {importStatus === 'error' && (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-4 gap-2">
                  <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-destructive" />
                  </div>
                  <p className="text-base font-bold text-foreground">Import Gagal</p>
                </div>

                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs text-destructive leading-relaxed">{importError}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleImportDialogClose(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:bg-accent transition-all"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={resetImport}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Coba Lagi
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
