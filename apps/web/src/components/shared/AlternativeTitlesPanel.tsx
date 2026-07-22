import { useState, useCallback, useRef, useEffect } from 'react';
import { Languages, RefreshCw, ChevronDown, ChevronUp, Copy, Check, AlertCircle, Undo2, Pencil, Save, X } from 'lucide-react';
import {
  type AlternativeTitles,
  fetchAlternativeTitles,
  serializeAlternativeTitles,
  getTitleLanguageLabel,
} from '@/hooks/useAlternativeTitles';
import { saveAlternativeTitles } from '@/features/media/services/alternative-titles.repository';
import { toast } from '@/hooks/use-toast';

interface AlternativeTitlesPanelProps {
  storedTitle: string;
  altTitles?: AlternativeTitles | null;
  malId?: number | null;
  anilistId?: number | null;
  mediaType?: 'anime' | 'donghua';
  onFetched?: (titles: AlternativeTitles) => void;
  itemId?: string;
  tableName?: 'anime' | 'donghua';
}

export default function AlternativeTitlesPanel({
  storedTitle,
  altTitles,
  malId,
  anilistId,
  mediaType = 'anime',
  onFetched,
  itemId,
  tableName,
}: AlternativeTitlesPanelProps) {
  const [titles, setTitles] = useState<AlternativeTitles | null>(altTitles || null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showSynonyms, setShowSynonyms] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  // Undo support
  const previousTitlesRef = useRef<AlternativeTitles | null>(null);
  const previousSerializedRef = useRef<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  // Sync when parent-provided altTitles change (e.g. after cache invalidation)
  useEffect(() => {
    setTitles(altTitles || null);
  }, [altTitles]);

  const hasData = !!(
    titles &&
    (titles.title_english ||
      titles.title_romaji ||
      titles.title_native ||
      titles.title_indonesian)
  );

  const canFetch = !!(malId || anilistId || storedTitle);

  const handleFetch = useCallback(async () => {
    if (!canFetch || isLoading) return;
    setIsLoading(true);
    setFetchError(null);

    // Save current state for undo
    if (titles) {
      previousTitlesRef.current = { ...titles };
      try {
        const { serializeAlternativeTitles } = await import('@/hooks/useAlternativeTitles');
        previousSerializedRef.current = serializeAlternativeTitles(titles);
      } catch {
        previousSerializedRef.current = null;
      }
    }

    try {
      const result = await fetchAlternativeTitles({
        malId,
        anilistId,
        storedTitle,
        mediaType,
      });
      setTitles(result);
      onFetched?.(result);

      if (itemId && tableName) {
        const { serializeAlternativeTitles } = await import('@/hooks/useAlternativeTitles');
        const serialized = serializeAlternativeTitles(result);
        await saveAlternativeTitles(tableName, itemId, serialized);
      }

      // Enable undo if we had previous data
      if (previousTitlesRef.current) {
        setCanUndo(true);
      }

      toast({ title: 'Data diperbarui dan disimpan' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setFetchError(msg);
      toast({
        title: 'Gagal mengambil nama alternatif',
        description: 'Periksa koneksi internet dan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [malId, anilistId, storedTitle, mediaType, onFetched, itemId, tableName, canFetch, isLoading, titles]);

  const handleUndo = useCallback(async () => {
    if (!previousTitlesRef.current || isUndoing) return;
    setIsUndoing(true);
    try {
      const prev = previousTitlesRef.current;
      setTitles(prev);
      onFetched?.(prev);

      if (itemId && tableName && previousSerializedRef.current) {
        await saveAlternativeTitles(tableName, itemId, previousSerializedRef.current);
      }

      setCanUndo(false);
      previousTitlesRef.current = null;
      previousSerializedRef.current = null;
      toast({ title: 'Data dikembalikan ke versi sebelumnya' });
    } catch {
      toast({ title: 'Gagal mengembalikan data', variant: 'destructive' });
    } finally {
      setIsUndoing(false);
    }
  }, [onFetched, itemId, tableName, isUndoing]);

  const handleCopy = useCallback((value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedValue(value);
      setTimeout(() => setCopiedValue(null), 1500);
    });
  }, []);

  const handleFieldSave = useCallback(async (field: keyof AlternativeTitles, newValue: string) => {
    const trimmed = newValue.trim();
    const base: AlternativeTitles = { ...(titles || {}), stored_title: storedTitle };
    const currentVal = (base[field] as string | undefined) || '';
    if (trimmed === currentVal) return;

    // Save undo snapshot
    if (titles) {
      previousTitlesRef.current = { ...titles };
      previousSerializedRef.current = serializeAlternativeTitles(titles);
    }

    const nextTitles: AlternativeTitles = { ...base, [field]: trimmed || undefined };
    setTitles(nextTitles);

    try {
      if (itemId && tableName) {
        await saveAlternativeTitles(tableName, itemId, serializeAlternativeTitles(nextTitles));
      }
      onFetched?.(nextTitles);
      setCanUndo(true);
      toast({ title: 'Judul diperbarui' });
    } catch {
      // rollback
      setTitles(titles);
      toast({ title: 'Gagal menyimpan judul', variant: 'destructive' });
    }
  }, [titles, storedTitle, itemId, tableName, onFetched]);

  const langLabels = getTitleLanguageLabel(mediaType);
  const editableRows: Array<{ field: keyof AlternativeTitles; label: string; badge: string; badgeColor: string; placeholder: string }> = [
    { field: 'title_english', label: 'Inggris', badge: 'EN', badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', placeholder: 'Judul Inggris' },
    { field: 'title_romaji', label: langLabels.romaji, badge: mediaType === 'donghua' ? 'PY' : 'JP', badgeColor: 'bg-red-500/15 text-red-600 dark:text-red-400', placeholder: mediaType === 'donghua' ? 'Pinyin' : 'Romaji' },
    { field: 'title_native', label: langLabels.native, badge: mediaType === 'donghua' ? 'ZH' : 'JA', badgeColor: 'bg-orange-500/15 text-orange-600 dark:text-orange-400', placeholder: mediaType === 'donghua' ? '\u4e2d\u6587' : '\u65e5\u672c\u8a9e' },
    { field: 'title_indonesian', label: 'Indonesia', badge: 'ID', badgeColor: 'bg-green-500/15 text-green-600 dark:text-green-400', placeholder: 'Judul Indonesia' },
  ];

  const synonyms = (titles?.synonyms || []).filter(
    s => s !== storedTitle && s.trim()
  );

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border/60">
        <Languages className="w-3.5 h-3.5 text-info shrink-0" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex-1 min-w-0">
          Nama Alternatif
        </p>

        <div className="flex items-center gap-1">
          {/* Undo button */}
          {canUndo && !isLoading && (
            <button
              onClick={handleUndo}
              disabled={isUndoing}
              aria-label="Kembalikan ke versi sebelumnya"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-warning hover:bg-warning/10 transition-colors disabled:opacity-40"
            >
              <Undo2 className={`w-3 h-3 ${isUndoing ? 'animate-spin' : ''}`} />
              <span>Undo</span>
            </button>
          )}

          {/* Fetch / Refresh button */}
          <button
            onClick={handleFetch}
            disabled={isLoading || !canFetch}
            aria-label={hasData ? 'Refresh nama alternatif' : 'Ambil nama alternatif'}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold
              transition-colors disabled:opacity-40
              ${hasData
                ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                : 'bg-info/10 text-info hover:bg-info/20'
              }
            `}
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {!hasData && !isLoading && <span>Ambil Data</span>}
            {isLoading && <span>Mengambil...</span>}
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* DB title row */}
        <TitleRow
          badge="DB"
          badgeColor="bg-primary/15 text-primary"
          label="Nama utama tersimpan"
          value={storedTitle}
          onCopy={handleCopy}
          copiedValue={copiedValue}
        />

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
            <span>Mengambil dari MAL, AniList &amp; AI...</span>
          </div>
        )}

        {/* Error state */}
        {fetchError && !isLoading && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-[10px] text-destructive leading-relaxed">
              Gagal mengambil data. Pastikan koneksi internet aktif.
            </p>
          </div>
        )}

        {/* Alternative titles (editable) */}
        {editableRows.map((row) => (
          <EditableTitleRow
            key={row.field}
            badge={row.badge}
            badgeColor={row.badgeColor}
            label={row.label}
            placeholder={row.placeholder}
            value={(titles?.[row.field] as string | undefined) || ''}
            onCopy={handleCopy}
            copiedValue={copiedValue}
            onSave={(v) => handleFieldSave(row.field, v)}
            disabled={isLoading || isUndoing}
          />
        ))}

        {/* Synonyms */}
        {synonyms.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setShowSynonyms(v => !v)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              aria-expanded={showSynonyms}
            >
              {showSynonyms ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {showSynonyms ? 'Sembunyikan' : 'Tampilkan'} sinonim ({synonyms.length})
            </button>

            {showSynonyms && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {synonyms.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleCopy(s)}
                    title={`Salin: ${s}`}
                    className="
                      inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                      bg-muted text-muted-foreground text-[10px] font-medium
                      hover:bg-accent hover:text-foreground transition-colors
                      border border-border/50 max-w-[160px]
                    "
                  >
                    <span className="truncate">{s}</span>
                    {copiedValue === s ? (
                      <Check className="w-2 h-2 text-success shrink-0" />
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasData && !fetchError && (
          <div className="py-2 text-center">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {canFetch
                ? 'Belum ada nama alternatif. Klik "Ambil Data" untuk mengambil dari MAL & AniList.'
                : 'Lakukan auto-fill dari MAL/AniList terlebih dahulu.'}
            </p>
          </div>
        )}

        {/* Tip */}
        {hasData && (
          <p className="text-[9px] text-muted-foreground/60 pt-1 border-t border-border/40 leading-relaxed">
            Klik ikon pensil untuk edit, ikon salin untuk copy. Perubahan langsung tersimpan.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── TitleRow sub-component ───────────────────────────────────────────────────
interface TitleRowProps {
  badge: string;
  badgeColor: string;
  label: string;
  value: string;
  onCopy: (v: string) => void;
  copiedValue: string | null;
}

function TitleRow({ badge, badgeColor, label, value, onCopy, copiedValue }: TitleRowProps) {
  const isCopied = copiedValue === value;
  return (
    <div className="flex items-start gap-2">
      <span
        className={`
          inline-flex items-center justify-center
          px-1.5 py-0.5 rounded text-[9px] font-bold
          shrink-0 mt-0.5 min-w-[24px]
          ${badgeColor}
        `}
      >
        {badge}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold text-foreground break-words leading-tight mt-0.5">
          {value}
        </p>
      </div>
      <button
        onClick={() => onCopy(value)}
        aria-label={`Salin ${label}`}
        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
      >
        {isCopied ? (
          <Check className="w-3 h-3 text-success" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}

// ─── EditableTitleRow ─────────────────────────────────────────────────────────
interface EditableTitleRowProps {
  badge: string;
  badgeColor: string;
  label: string;
  placeholder: string;
  value: string;
  onCopy: (v: string) => void;
  copiedValue: string | null;
  onSave: (v: string) => void | Promise<void>;
  disabled?: boolean;
}

function EditableTitleRow({ badge, badgeColor, label, placeholder, value, onCopy, copiedValue, onSave, disabled }: EditableTitleRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const isCopied = copiedValue === value && value !== '';

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = async () => {
    if (draft.trim() === value.trim()) { setEditing(false); return; }
    await onSave(draft);
    setEditing(false);
  };

  const cancel = () => { setDraft(value); setEditing(false); };

  return (
    <div className="flex items-start gap-2">
      <span
        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 mt-0.5 min-w-[24px] ${badgeColor}`}
      >
        {badge}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] text-muted-foreground">{label}</p>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } else if (e.key === 'Escape') { e.preventDefault(); cancel(); } }}
            onBlur={commit}
            placeholder={placeholder}
            className="mt-0.5 w-full rounded border border-border bg-background px-1.5 py-0.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        ) : (
          <p className={`text-xs font-semibold break-words leading-tight mt-0.5 ${value ? 'text-foreground' : 'text-muted-foreground/60 italic'}`}>
            {value || `(kosong — klik edit untuk isi ${label})`}
          </p>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
        {editing ? (
          <>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={commit} aria-label="Simpan" className="p-1 rounded text-success hover:bg-success/10 transition-colors">
              <Save className="w-3 h-3" />
            </button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={cancel} aria-label="Batal" className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <>
            {value && (
              <button type="button" onClick={() => onCopy(value)} aria-label={`Salin ${label}`} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                {isCopied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
            <button type="button" disabled={disabled} onClick={() => setEditing(true)} aria-label={`Edit ${label}`} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
              <Pencil className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
