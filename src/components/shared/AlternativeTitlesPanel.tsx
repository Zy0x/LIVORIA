/**
 * AlternativeTitlesPanel.tsx — LIVORIA
 *
 * Panel nama alternatif untuk Detail Modal Anime/Donghua.
 *
 * PERBAIKAN:
 * - Responsif di semua ukuran layar (mobile-first)
 * - Loading state yang lebih informatif
 * - Error handling yang lebih baik
 * - Aksesibilitas (aria labels, keyboard navigation)
 * - Animasi copy yang smooth
 * - Tampilan sinonim yang lebih compact
 */

import { useState, useCallback } from 'react';
import { Languages, RefreshCw, ChevronDown, ChevronUp, Copy, Check, AlertCircle } from 'lucide-react';
import {
  type AlternativeTitles,
  buildTitleDisplayList,
  fetchAlternativeTitles,
} from '@/hooks/useAlternativeTitles';
import { toast } from '@/hooks/use-toast';

interface AlternativeTitlesPanelProps {
  /** Judul yang tersimpan di database user */
  storedTitle: string;
  /** Data alternatif yang sudah ada (dari Supabase) */
  altTitles?: AlternativeTitles | null;
  /** MAL ID untuk re-fetch */
  malId?: number | null;
  /** AniList ID untuk re-fetch */
  anilistId?: number | null;
  /** Tipe media */
  mediaType?: 'anime' | 'donghua';
  /** Callback saat data baru berhasil di-fetch */
  onFetched?: (titles: AlternativeTitles) => void;
}

export default function AlternativeTitlesPanel({
  storedTitle,
  altTitles,
  malId,
  anilistId,
  mediaType = 'anime',
  onFetched,
}: AlternativeTitlesPanelProps) {
  const [titles, setTitles] = useState<AlternativeTitles | null>(altTitles || null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showSynonyms, setShowSynonyms] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

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
    try {
      const result = await fetchAlternativeTitles({
        malId,
        anilistId,
        storedTitle,
        mediaType,
      });
      setTitles(result);
      onFetched?.(result);
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
  }, [malId, anilistId, storedTitle, mediaType, onFetched, canFetch, isLoading]);

  const handleCopy = useCallback((value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedValue(value);
      setTimeout(() => setCopiedValue(null), 1500);
    });
  }, []);

  const displayItems = titles
    ? buildTitleDisplayList({ ...titles, stored_title: storedTitle }, mediaType)
    : [];

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

      <div className="p-3 space-y-2">
        {/* DB title row */}
        <TitleRow
          badge="DB"
          badgeColor="bg-primary/15 text-primary"
          label="Nama di Database"
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

        {/* Alternative titles */}
        {hasData &&
          displayItems.map((item, i) => (
            <TitleRow
              key={i}
              badge={item.badge}
              badgeColor={item.badgeColor}
              label={item.label}
              value={item.value}
              onCopy={handleCopy}
              copiedValue={copiedValue}
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
            Klik ikon salin untuk menyalin nama ke clipboard.
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