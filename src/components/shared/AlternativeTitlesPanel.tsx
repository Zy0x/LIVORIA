/**
 * AlternativeTitlesPanel.tsx — LIVORIA
 *
 * Komponen panel nama alternatif untuk ditampilkan di Detail Modal Anime/Donghua.
 *
 * Menampilkan:
 * - Nama yang tersimpan di database (stored_title)
 * - Nama Inggris (title_english)
 * - Romaji/Pinyin (title_romaji)
 * - Hanzi/Kanji native (title_native)
 * - Nama Indonesia jika ada (title_indonesian)
 * - Sinonim / alias lainnya
 *
 * Juga mendukung fetch on-demand jika belum ada data alternatif.
 */

import { useState, useCallback } from 'react';
import { Languages, RefreshCw, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
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
  /** Callback saat data baru berhasil di-fetch (untuk update ke parent) */
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
  const [showSynonyms, setShowSynonyms] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const hasData = titles &&
    (titles.title_english || titles.title_romaji || titles.title_native || titles.title_indonesian);

  const handleFetch = useCallback(async () => {
    setIsLoading(true);
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
      toast({
        title: 'Gagal mengambil nama alternatif',
        description: 'Coba lagi beberapa saat.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [malId, anilistId, storedTitle, mediaType, onFetched]);

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setTimeout(() => setCopiedValue(null), 1500);
  };

  const displayItems = titles ? buildTitleDisplayList({ ...titles, stored_title: storedTitle }, mediaType) : [];
  const synonyms = titles?.synonyms?.filter(s => s !== storedTitle) || [];

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/30 border-b border-border/60">
        <Languages className="w-4 h-4 text-info shrink-0" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex-1">
          Nama Alternatif
        </p>
        {!hasData && (
          <button
            onClick={handleFetch}
            disabled={isLoading || (!malId && !anilistId && !storedTitle)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-info/10 text-info text-[10px] font-semibold hover:bg-info/20 disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Mengambil...' : 'Ambil Data'}
          </button>
        )}
        {hasData && (
          <button
            onClick={handleFetch}
            disabled={isLoading}
            title="Refresh nama alternatif"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Nama yang disimpan user */}
        <div className="flex items-start gap-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary shrink-0 mt-0.5 min-w-[28px] justify-center">
            DB
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-muted-foreground">Nama di Database</p>
            <p className="text-xs font-semibold text-foreground break-words">{storedTitle}</p>
          </div>
          <button
            onClick={() => handleCopy(storedTitle)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {copiedValue === storedTitle
              ? <Check className="w-3 h-3 text-success" />
              : <Copy className="w-3 h-3" />}
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
            <span>Mengambil nama dari MAL, AniList & AI...</span>
          </div>
        )}

        {/* Data nama alternatif */}
        {hasData && displayItems.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 mt-0.5 min-w-[28px] justify-center ${item.badgeColor || 'bg-muted text-muted-foreground'}`}>
              {item.badge}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-muted-foreground">{item.label}</p>
              <p className="text-xs font-semibold text-foreground break-words">{item.value}</p>
            </div>
            <button
              onClick={() => handleCopy(item.value)}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {copiedValue === item.value
                ? <Check className="w-3 h-3 text-success" />
                : <Copy className="w-3 h-3" />}
            </button>
          </div>
        ))}

        {/* Sinonim */}
        {synonyms.length > 0 && (
          <div>
            <button
              onClick={() => setShowSynonyms(v => !v)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              {showSynonyms
                ? <ChevronUp className="w-3 h-3" />
                : <ChevronDown className="w-3 h-3" />}
              {showSynonyms ? 'Sembunyikan' : 'Tampilkan'} sinonim ({synonyms.length})
            </button>
            {showSynonyms && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {synonyms.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleCopy(s)}
                    title={`Salin: ${s}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium hover:bg-accent hover:text-foreground transition-colors border border-border/50"
                  >
                    {s}
                    {copiedValue === s && <Check className="w-2 h-2 text-success" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasData && (
          <div className="py-2 text-center">
            <p className="text-[11px] text-muted-foreground">
              Belum ada nama alternatif.
              {(malId || anilistId) ? ' Klik "Ambil Data" untuk mengambil dari MAL & AniList.' : ' Lakukan auto-fill dari MAL/AniList terlebih dahulu.'}
            </p>
          </div>
        )}

        {/* Info tip */}
        {hasData && (
          <p className="text-[9px] text-muted-foreground/60 pt-1 border-t border-border/40 leading-relaxed">
            Nama-nama ini membantu pencarian. Klik ikon salin untuk menyalin nama.
          </p>
        )}
      </div>
    </div>
  );
}