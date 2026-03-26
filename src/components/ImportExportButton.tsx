/**
 * ImportExportButton.tsx — LIVORIA
 *
 * Tombol terpadu Ekspor + Impor untuk halaman Anime & Donghua.
 *
 * FITUR:
 * ─────────────────────────────────────────────────────────
 * EKSPOR:
 *   - JSON  → semua field DB (roundtrip sempurna)
 *   - CSV   → semua field DB, Excel-compatible
 *
 * IMPOR:
 *   - Impor Langsung (Direct) → restore dari file JSON/CSV hasil ekspor
 *     • Mode: Tambah Baru / Tambah+Perbarui / Ganti Semua
 *     • Field yang di-restore: SEMUA field DB termasuk
 *       watch_status, watched_at, alternative_titles,
 *       mal_id, anilist_id, is_movie, duration_minutes, dll.
 *   - Impor Lanjutan (Bulk AI) → membuka BulkImportDialog
 *     untuk data mentah dengan auto-fill MAL/AniList + terjemahan.
 *
 * CARA PAKAI:
 * <ImportExportButton
 *   data={animeList}
 *   filename="anime-livoria"
 *   mediaType="anime"
 *   onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['anime'] })}
 *   onOpenBulkImport={() => setBulkImportOpen(true)}
 * />
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import {
  Download, Upload, FileJson, FileSpreadsheet,
  ChevronRight, RefreshCw, Loader2, CheckCircle2,
  AlertTriangle, X, Sparkles, Database,
  Plus, Shuffle, Trash2, ChevronDown,
} from 'lucide-react';
import {
  exportToJSON,
  exportToCSV,
  directImportToSupabase,
  type DirectImportResult,
} from '@/lib/import-export';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ─── Tipe ─────────────────────────────────────────────────────────────────────

type ImportMode = 'insert_only' | 'upsert' | 'replace_all';

interface ImportModeOption {
  value: ImportMode;
  label: string;
  description: string;
  icon: typeof Plus;
  color: string;
  dangerous?: boolean;
}

const IMPORT_MODE_OPTIONS: ImportModeOption[] = [
  {
    value: 'insert_only',
    label: 'Tambah Baru Saja',
    description:
      'Hanya menambahkan entri baru. Entri yang sudah ada di database tidak diubah.',
    icon: Plus,
    color: 'text-success',
  },
  {
    value: 'upsert',
    label: 'Tambah + Perbarui',
    description:
      'Tambah entri baru dan perbarui entri yang sudah ada (berdasarkan ID atau Judul+Season).',
    icon: Shuffle,
    color: 'text-primary',
  },
  {
    value: 'replace_all',
    label: 'Ganti Semua Data',
    description:
      'HAPUS semua data yang ada, lalu import ulang dari file. Gunakan hanya untuk restore backup.',
    icon: Trash2,
    color: 'text-destructive',
    dangerous: true,
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data: any[];
  filename: string;
  mediaType?: 'anime' | 'donghua';
  onImportComplete?: () => void;
  /** Callback untuk membuka BulkImportDialog */
  onOpenBulkImport?: () => void;
}

// ─── Komponen Utama ───────────────────────────────────────────────────────────

export default function ImportExportButton({
  data,
  filename,
  mediaType = 'anime',
  onImportComplete,
  onOpenBulkImport,
}: Props) {
  // ── Menu dropdown state ────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  // ── Direct import dialog state ─────────────────────────────────────────────
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('upsert');
  const [importStatus, setImportStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [importResult, setImportResult] = useState<DirectImportResult | null>(null);
  const [importError, setImportError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const typeLabel = mediaType === 'anime' ? 'Anime' : 'Donghua';

  // ── Compute dropdown position ──────────────────────────────────────────────
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuW = 240;
    let left = rect.right - menuW;
    left = Math.max(8, Math.min(left, vw - menuW - 8));
    const spaceBelow = vh - rect.bottom - 8;
    const showAbove = spaceBelow < 300 && rect.top > 300;
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

  // ── Close on outside click ─────────────────────────────────────────────────
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

  // ── Animate open ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (open && menuRef.current) {
      gsap.fromTo(
        menuRef.current,
        { opacity: 0, y: -8, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'back.out(2)' }
      );
    }
  }, [open]);

  const closeMenu = useCallback(() => {
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
  }, []);

  const handleToggle = () => {
    if (open) closeMenu();
    else setOpen(true);
  };

  // ── Reset import state ─────────────────────────────────────────────────────
  const resetImport = useCallback(() => {
    setImportStatus('idle');
    setImportResult(null);
    setImportError('');
    setSelectedFile(null);
    setConfirmReplace(false);
    setImportMode('upsert');
  }, []);

  const handleImportDialogClose = (v: boolean) => {
    if (!v) resetImport();
    setImportDialogOpen(v);
  };

  // ── File selected → buka dialog ────────────────────────────────────────────
  const handleFileSelected = (file: File) => {
    resetImport();
    setSelectedFile(file);
    setImportDialogOpen(true);
  };

  // ── Execute direct import ──────────────────────────────────────────────────
  const executeDirectImport = async () => {
    if (!selectedFile) return;
    if (importMode === 'replace_all' && !confirmReplace) return;
    setImportStatus('loading');
    setImportError('');
    setImportResult(null);
    try {
      const result = await directImportToSupabase(selectedFile, mediaType, importMode);
      setImportResult(result);
      setImportStatus('success');
      onImportComplete?.();
    } catch (err: any) {
      setImportStatus('error');
      setImportError(err?.message || 'Terjadi kesalahan saat mengimpor data.');
    }
  };

  // ── Menu content ───────────────────────────────────────────────────────────
  const menuContent = open ? (
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-card border border-border rounded-xl shadow-2xl py-1 overflow-hidden"
    >
      {/* ── Ekspor ── */}
      <div className="px-3 py-1.5">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
          Ekspor
        </p>
      </div>

      <button
        onClick={() => {
          exportToJSON(data, filename);
          closeMenu();
        }}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors"
      >
        <FileJson className="w-4 h-4 text-success shrink-0" />
        <span className="flex-1 text-left font-medium">Ekspor JSON</span>
        <span className="text-[9px] text-muted-foreground">Semua field</span>
      </button>

      <button
        onClick={() => {
          exportToCSV(data, filename);
          closeMenu();
        }}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors"
      >
        <FileSpreadsheet className="w-4 h-4 text-info shrink-0" />
        <span className="flex-1 text-left font-medium">Ekspor CSV</span>
        <span className="text-[9px] text-muted-foreground">Excel-compatible</span>
      </button>

      <div className="mx-3 my-1 border-t border-border/60" />

      {/* ── Impor ── */}
      <div className="px-3 py-1.5">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
          Impor
        </p>
      </div>

      {/* Direct Import */}
      <button
        onClick={() => {
          closeMenu();
          setTimeout(() => {
            resetImport();
            fileRef.current?.click();
          }, 200);
        }}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors"
      >
        <Database className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <p className="font-semibold text-primary text-sm">Impor Langsung</p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Restore dari file JSON/CSV hasil Ekspor
          </p>
        </div>
        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
      </button>

      {/* Bulk Import AI */}
      {onOpenBulkImport && (
        <button
          onClick={() => {
            closeMenu();
            setTimeout(() => onOpenBulkImport?.(), 200);
          }}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors"
        >
          <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
          <div className="flex-1 text-left min-w-0">
            <p className="font-semibold text-sm">Impor Lanjutan (AI)</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Data mentah + auto-fill MAL/AniList
            </p>
          </div>
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
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
        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-input bg-background text-muted-foreground text-sm font-semibold hover:bg-muted transition-all min-h-[44px]"
        title="Ekspor / Impor data"
      >
        <Download className="w-4 h-4" />
        <span>Ekspor</span>
        <span className="text-[10px] opacity-60">/</span>
        <Upload className="w-4 h-4" />
        <span>Impor</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {/* ── Dropdown portal ── */}
      {typeof document !== 'undefined' && createPortal(menuContent, document.body)}

      {/* ── Hidden file input untuk Direct Import ── */}
      <input
        ref={fileRef}
        type="file"
        accept=".json,.csv"
        className="hidden"
        onChange={(e) => {
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
              Impor {typeLabel} — Restore Langsung
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
                'Pilih mode impor dan konfirmasi untuk memulai.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* ── Idle / Pilih mode ── */}
            {importStatus === 'idle' && (
              <>
                {/* Mode selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Mode Impor
                  </label>
                  <div className="space-y-2">
                    {IMPORT_MODE_OPTIONS.map((opt) => {
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
                          <div
                            className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 mt-0.5 ${
                              isSelected
                                ? opt.dangerous
                                  ? 'bg-destructive/15'
                                  : 'bg-primary/10'
                                : 'bg-muted'
                            }`}
                          >
                            <Icon
                              className={`w-3.5 h-3.5 ${
                                isSelected ? opt.color : 'text-muted-foreground'
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-semibold ${
                                isSelected ? opt.color : 'text-foreground'
                              }`}
                            >
                              {opt.label}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                              {opt.description}
                            </p>
                          </div>
                          {isSelected && (
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                opt.dangerous ? 'bg-destructive' : 'bg-primary'
                              }`}
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Konfirmasi replace all */}
                {importMode === 'replace_all' && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive font-semibold leading-relaxed">
                        Perhatian! Mode ini akan menghapus SEMUA data{' '}
                        {typeLabel.toLowerCase()} kamu dan menggantinya dengan
                        isi file ini. Tindakan ini tidak bisa dibatalkan.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmReplace}
                        onChange={(e) => setConfirmReplace(e.target.checked)}
                        className="rounded border-destructive/60"
                      />
                      <span className="text-xs text-destructive font-medium">
                        Saya mengerti dan ingin melanjutkan
                      </span>
                    </label>
                  </div>
                )}

                {/* Info roundtrip */}
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-[10px] text-muted-foreground space-y-1.5">
                  <p className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    Roundtrip sempurna dengan fitur Ekspor
                  </p>
                  <p>
                    File JSON/CSV hasil <strong>Ekspor Livoria</strong> akan
                    di-restore 100% termasuk:
                  </p>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                    {[
                      'title', 'status', 'genre', 'rating',
                      'episodes', 'episodes_watched', 'cover_url', 'synopsis',
                      'notes', 'season', 'cour', 'parent_title',
                      'is_movie', 'duration_minutes', 'is_favorite', 'is_bookmarked',
                      'studio', 'release_year', 'mal_id', 'anilist_id',
                      'mal_url', 'anilist_url', 'alternative_titles',
                      'watch_status', 'watched_at',
                      'streaming_url', 'schedule',
                    ].map((f) => (
                      <code
                        key={f}
                        className="bg-muted px-1 py-0.5 rounded text-[9px]"
                      >
                        {f}
                      </code>
                    ))}
                  </div>
                </div>

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
                      (importMode === 'replace_all' && !confirmReplace)
                    }
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
                      transition-all disabled:opacity-40 disabled:cursor-not-allowed
                      ${importMode === 'replace_all'
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
                  Mengimpor data ke database...
                </p>
                <p className="text-xs text-muted-foreground">
                  Mohon tunggu, jangan tutup halaman ini.
                </p>
              </div>
            )}

            {/* ── Success ── */}
            {importStatus === 'success' && importResult && (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-4 gap-2">
                  <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-success" />
                  </div>
                  <p className="text-base font-bold text-foreground">
                    Import Selesai!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {importResult.total} entri diproses dari {selectedFile?.name}
                  </p>
                </div>

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
                      color:
                        importResult.errors.length > 0
                          ? 'text-destructive'
                          : 'text-muted-foreground',
                      bg:
                        importResult.errors.length > 0
                          ? 'bg-destructive/10 border-destructive/20'
                          : 'bg-muted border-border',
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`rounded-xl border p-3 text-center ${s.bg}`}
                    >
                      <div className={`text-xl font-black ${s.color}`}>
                        {s.value}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {importResult.errors.length > 0 && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2 max-h-32 overflow-y-auto">
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">
                      {importResult.errors.length} Error:
                    </p>
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="text-[10px] text-destructive">
                        <span className="font-semibold">{err.title}:</span>{' '}
                        {err.reason}
                      </div>
                    ))}
                  </div>
                )}

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
                  <p className="text-base font-bold text-foreground">
                    Import Gagal
                  </p>
                </div>
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs text-destructive leading-relaxed">
                    {importError}
                  </p>
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