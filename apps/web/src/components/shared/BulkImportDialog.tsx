/**
 * BulkImportDialog — LIVORIA V5.2
 *
 * PERUBAHAN v5.2 — PERBAIKAN FATAL ROUNDTRIP IMPORT/EXPORT:
 * 1. [FIX FATAL] parseLocally & parseHtmlStyleJSON sekarang membaca SEMUA field
 *    yang ada di export Livoria (watch_status, watched_at, alternative_titles,
 *    release_year, studio, mal_url, anilist_url, mal_id, anilist_id, dll).
 * 2. [FIX FATAL] startImport sekarang meng-insert SEMUA field ke DB,
 *    termasuk watch_status, watched_at, alternative_titles, dll.
 * 3. [FIX FATAL] Validasi enum watch_status & status terhadap constraint DB.
 * 4. [FIX FATAL] sanitizeImportRow() dari import-export.ts dipakai sebagai
 *    satu-satunya sumber kebenaran untuk normalisasi data sebelum insert.
 * 5. [FIX] Deteksi export Livoria: jika data sudah kaya (cover_url + genre +
 *    synopsis + mal_id/anilist_id) maka enriched = true, skip auto-fill.
 * 6. [FIX] episodes_watched diinferensikan dari status jika tidak ada.
 * 7. [FIX] alternative_titles di-preserve sebagai JSON string apa adanya.
 * 8. [FIX] CSV import via importFromCSV menghasilkan row yang langsung siap insert.
 *
 * PERUBAHAN v5.1 TETAP ADA:
 * - Tampilkan judul asli sebelum auto-fill
 * - Judul tidak di-truncate
 * - Tombol filter "Perlu Verifikasi"
 *
 * PERBAIKAN v5 TETAP ADA (paralel search, season fix, dll)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  getCurrentImportUserId,
  insertMediaImportRow,
  parseMediaImportChunkWithAi,
  type MediaImportTable,
} from '@/features/media/services/bulk-import.repository';
import { readBulkImportFile } from '@/features/media/services/bulk-import-file';
import {
  Upload, Sparkles, Loader2, Edit2, Trash2, Check, X,
  ChevronDown, ChevronUp, FileSpreadsheet, ClipboardPaste,
  Search, RefreshCw, Download, Square, RotateCcw, Image,
  Globe, BookOpen, Building2, CalendarClock, Film, Link2,
  AlertTriangle, CheckCircle2, HelpCircle, ChevronRight,
  Star, Bookmark, Clapperboard, Zap, Languages, Filter,
  Eye, EyeOff, ArrowRight,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  fetchAlternativeTitles,
  serializeAlternativeTitles,
  deserializeAlternativeTitles,
  buildTitleDisplayList,
} from '@/hooks/useAlternativeTitles';
import { translateToIndonesian } from '@/hooks/useAnimeSearch';
import { sanitizeImportRow } from '@/lib/import-export';
import type { BulkItem, SearchCandidate } from '@/features/media/services/bulk-import.types';
import {
  buildBulkItemFromRaw,
  getParentTitle,
  interpretNote,
  scoreToConfidence,
} from '@/features/media/services/bulk-import-normalization';
import {
  ANILIST_GQL,
  candidateToEnrichment,
  fetchWithRetry,
  searchWithAccuracy,
} from '@/features/media/services/bulk-import-enrichment';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: 'anime' | 'donghua';
  onImportComplete?: () => void;
}

import {
  AltTitlesInline,
  ConfidenceBadge,
  InlineTitleEditor,
  ParentTitleField,
} from './BulkImportDialogPrimitives';
import { nowTime, sleep, type LogEntry, type Step } from './bulk-import-dialog-helpers';
const BulkImportDialog = ({ open, onOpenChange, mediaType, onImportComplete }: Props) => {
  const [step, setStep] = useState<Step>('input');
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState<BulkItem[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<'completed'|'planned'|'on-going'>('completed');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState({ current:0, total:0, ok:0, skip:0, err:0 });
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [useAI, setUseAI] = useState(true);
  const [enrichDelay, setEnrichDelay] = useState(3000);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [filterNeedVerify, setFilterNeedVerify] = useState(false);
  const runningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logBoxRef = useRef<HTMLDivElement>(null);

  const [editingTitleIdx, setEditingTitleIdx] = useState<number | null>(null);
  const [pickerLoading, setPickerLoading] = useState<number | null>(null);

  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { time: nowTime(), msg, type }]);
    setTimeout(() => logBoxRef.current?.scrollTo(0, logBoxRef.current.scrollHeight), 50);
  }, []);

  const resetAll = useCallback(() => {
    setStep('input'); setRawText(''); setParsedItems([]); setEditingTitleIdx(null);
    setAiProcessing(false); setImportProgress({current:0,total:0,ok:0,skip:0,err:0});
    setExpandedItems(new Set()); setLogs([]); setRunning(false); runningRef.current = false;
    setFilterNeedVerify(false);
  }, []);

  // ── Parse helpers ──────────────────────────────────────────────────────────

  /**
   * Parse array of raw objects menjadi BulkItem[].
   * Digunakan oleh:
   * - parseHtmlStyleJSON (dari AI)
   * - parseLocally (dari JSON/NDJSON/CSV lokal)
   * Keduanya kini menggunakan buildBulkItemFromRaw sebagai sumber kebenaran.
   */
  function parseRawArray(arr: any[]): BulkItem[] {
    return arr
      .map(obj => buildBulkItemFromRaw(obj, defaultStatus))
      .filter((item): item is BulkItem => item !== null);
  }

  function parseHtmlStyleJSON(arr: any[]): BulkItem[] {
    return parseRawArray(arr);
  }

  function parseLocally(text: string): BulkItem[] {
    // Strip BOM and trim
    const trimmed = text.replace(/^\uFEFF/, '').trim();

    // ── JSON array / object dengan key items ──────────────────────────────
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : parsed?.items;
      if (Array.isArray(arr) && arr.length > 0) {
        return parseRawArray(arr);
      }
    } catch {}

    // ── NDJSON (satu JSON object per baris) ────────────────────────────────
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    const ndItems: BulkItem[] = [];
    let allJson = true;

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.title || obj.Title || obj.judul) {
          const item = buildBulkItemFromRaw(obj, defaultStatus);
          if (item) ndItems.push(item);
        } else {
          allJson = false;
        }
      } catch {
        allJson = false;
        break;
      }
    }

    if (allJson && ndItems.length > 0) return ndItems;

    // ── CSV / TSV fallback ─────────────────────────────────────────────────
    const csvItems: BulkItem[] = [];

    for (const line of lines) {
      const parts = line.includes('\t')
        ? line.split('\t')
        : line.split(',').map(s => s.trim());

      const title = parts[0]?.trim() || '';
      if (!title || /^\d+$/.test(title)) continue;

      const season  = parseInt(parts[1]) || 1;
      const rating  = parseFloat(parts[2]) || 0;
      const noteRaw = (parts[3]?.trim() || '');

      const rawObj = {
        title,
        season,
        rating,
        note: noteRaw,
        status: defaultStatus,
        cour: parts[4]?.trim() || '',
        parent_title: season > 1 ? title.replace(/\s*(season|s)\s*\d+/gi, '').trim() : '',
      };

      const item = buildBulkItemFromRaw(rawObj, defaultStatus);
      if (item) csvItems.push(item);
    }

    return csvItems;
  }

  // ── AI processing ──────────────────────────────────────────────────────────

  const [aiProgress, setAiProgress] = useState<{
    current: number;
    total: number;
    provider: string;
    model: string;
    itemsSoFar: number;
    status?: 'processing' | 'rotating' | 'error' | 'success';
    lastError?: string;
  }>({ current: 0, total: 0, provider: '', model: '', itemsSoFar: 0, status: 'processing' });
  const [preferredAi, setPreferredAi] = useState<{ provider: string; model: string } | null>(null);

  /** Split text into chunks of ~20 lines for rate-limit safety */
  const splitIntoChunks = (text: string, maxLines = 20): string[] => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length <= maxLines) return [text];
    const chunks: string[] = [];
    for (let i = 0; i < lines.length; i += maxLines) {
      chunks.push(lines.slice(i, i + maxLines).join('\n'));
    }
    return chunks;
  };

  const processWithAI = async () => {
    if (!rawText.trim()) {
      toast({ title: 'Teks kosong', description: 'Masukkan daftar terlebih dahulu.', variant: 'destructive' });
      return;
    }
    setStep('processing'); setAiProcessing(true);
    setAiProgress({ current: 0, total: 0, provider: '', model: '', itemsSoFar: 0 });
    try {
      if (useAI) {
        // ULTRA-FAST: Chunk lebih besar (60 baris) + Racing Parallel
        const chunks = splitIntoChunks(rawText.trim(), 60);
        const allItems: any[] = [];
        setAiProgress({ current: 0, total: chunks.length, provider: 'Memulai Racing...', model: 'Semua Model', itemsSoFar: 0, status: 'processing' });

        const processChunk = async (chunkText: string, preferred?: { provider: string; model: string }) => {
          return parseMediaImportChunkWithAi({
            text: chunkText,
            mediaType,
            defaultStatus,
            preferredProvider: preferred?.provider,
            preferredModel: preferred?.model,
          });
        };

        // Jalankan semua chunk sekaligus (Racing Parallel) namun tetap menjaga urutan
        const chunkResults: { index: number; items: any[]; provider: string; model: string }[] = [];
        const maxChunkRetries = 1;
        let lastWorkingAi: { provider: string; model: string } | null = preferredAi;

        const chunkPromises = chunks.map(async (chunk, index) => {
          for (let attempt = 0; attempt <= maxChunkRetries; attempt++) {
            try {
              if (attempt > 0) {
                setAiProgress(p => ({
                  ...p,
                  status: 'rotating',
                  provider: lastWorkingAi?.provider || 'Rotasi Provider...',
                  model: lastWorkingAi?.model || p.model,
                }));
                await new Promise(r => setTimeout(r, 1000));
              }

              const result = await processChunk(chunk, lastWorkingAi || undefined);
              const workingAi = { provider: result.provider, model: result.model };
              chunkResults.push({ index, items: result.items || [], provider: result.provider, model: result.model });
              lastWorkingAi = workingAi;
              setPreferredAi(workingAi);

              setAiProgress(p => ({
                ...p,
                current: p.current + 1,
                provider: result.provider,
                model: result.model,
                itemsSoFar: chunkResults.reduce((acc, curr) => acc + curr.items.length, 0),
                status: 'processing'
              }));
              return;
            } catch (err: any) {
              console.error(`Chunk ${index + 1} failed on attempt ${attempt + 1}:`, err);
              if (attempt === maxChunkRetries) {
                throw new Error(`Chunk ${index + 1} gagal setelah ${attempt + 1} percobaan: ${err?.message || 'Unknown error'}`);
              }
            }
          }
        });

        await Promise.all(chunkPromises);

        // Urutkan kembali berdasarkan index asli sebelum digabungkan
        chunkResults.sort((a, b) => a.index - b.index);
        chunkResults.forEach(res => allItems.push(...res.items));

        if (chunkResults.some(res => res.items.length === 0)) {
          throw new Error('Beberapa chunk gagal diproses. Coba lagi nanti atau gunakan teks yang lebih pendek.');
        }

        setParsedItems(parseHtmlStyleJSON(allItems));
      } else {
        const items = parseLocally(rawText);
        if (!items.length) throw new Error('Tidak ada data valid');
        setParsedItems(items);
      }
      setAiProgress(p => ({ ...p, status: 'success' }));
      setStep('preview');
    } catch (err: any) {
      console.error('AI processing error:', err);
      setAiProgress(p => ({ ...p, status: 'error', lastError: err.message }));
      toast({ title: 'Gagal memproses AI', description: `${err.message}`, variant: 'destructive' });
      setStep('input');
    } finally { setAiProcessing(false); }
  };

  // ── File import ────────────────────────────────────────────────────────────

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await readBulkImportFile(file);
      setRawText(result.text);
      if (result.title) {
        toast({ title: result.title, description: result.description });
      }
    } catch (err: any) {
      toast({
        title: 'Gagal membaca file',
        description: err?.message,
        variant: 'destructive',
      });
    } finally {
      e.target.value = '';
    }
  };

  // ── Apply candidate to item ────────────────────────────────────────────────

  const applyCandidate = useCallback(async (idx: number, candidate: SearchCandidate) => {
    setEditingTitleIdx(null);
    setPickerLoading(idx);
    try {
      const item = parsedItems[idx];
      let finalCandidate = { ...candidate };
      if (candidate.source === 'anilist' && !candidate._jk) {
        try {
          const jTitle = candidate.title_english || candidate.title;
          const jRes = await fetchWithRetry(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(jTitle)}&limit=3`);
          if (jRes?.data?.[0]) finalCandidate._jk = jRes.data[0];
        } catch {}
      } else if (candidate.source === 'jikan' && !candidate._al) {
        try {
          const r = await fetch('https://graphql.anilist.co', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: ANILIST_GQL, variables: { s: candidate.title } }),
          });
          const d = await r.json();
          if (d.data?.Page?.media?.[0]) finalCandidate._al = d.data.Page.media[0];
        } catch {}
      }
      const enriched = await candidateToEnrichment(finalCandidate, item, mediaType);
      try {
        const alt = await fetchAlternativeTitles({
          malId: enriched.mal_id, anilistId: enriched.anilist_id,
          storedTitle: enriched.title || item.title, mediaType,
        });
        if (alt) enriched.alternative_titles = serializeAlternativeTitles(alt);
      } catch {}
      
      const updated = [...parsedItems];
      
      // Jika item awalnya perlu verifikasi (medium/low), hasil edit/re-enrich 
      // jangan otomatis jadi 'high' (hijau) kecuali user menandai 'reviewed'.
      // Kita batasi confidence maksimal ke 'medium' jika belum di-review.
      let finalConfidence = enriched.matchConfidence || 'none';
      if (!item.reviewed && (item.matchConfidence === 'medium' || item.matchConfidence === 'low')) {
        if (finalConfidence === 'high') finalConfidence = 'medium';
      }

      updated[idx] = {
        ...item,
        ...enriched,
        matchConfidence: finalConfidence,
        candidates: item.candidates,
        originalTitle: item.originalTitle || item.title,
        // Preserve watch tracking dari item asli jika enrichment tidak override
        watch_status: item.watch_status || 'none',
        watched_at:   item.watched_at || null,
      };
      setParsedItems(updated);
      toast({ title: '✓ Auto-fill selesai', description: enriched.title || item.title });
    } finally { setPickerLoading(null); }
  }, [parsedItems, mediaType]);

  // ── Re-enrich single item ──────────────────────────────────────────────────

  const reEnrichItem = async (idx: number) => {
    setPickerLoading(idx);
    try {
      const item = parsedItems[idx];
      const candidates = await searchWithAccuracy(item.title, item.season);
      const updated = [...parsedItems];
      updated[idx] = { ...item, candidates };
      if (candidates[0]) {
        await applyCandidate(idx, candidates[0]);
      } else {
        updated[idx] = { ...updated[idx], matchConfidence: 'none', matchScore: 0 };
        setParsedItems(updated);
        toast({ title: 'Tidak ditemukan', description: item.title, variant: 'destructive' });
      }
    } finally { setPickerLoading(null); }
  };

  // ── Enrich all ─────────────────────────────────────────────────────────────

  const enrichAllItems = async () => {
    setStep('enriching'); setRunning(true); runningRef.current = true; setLogs([]);
    const total = parsedItems.length;
    setImportProgress({ current:0, total, ok:0, skip:0, err:0 });
    addLog(`🚀 Auto-fill ${total} ${mediaType} — parallel batching (size 3) + deep matching`, 'info');

    const updatedItems = [...parsedItems];
    let ok=0, skip=0, err=0;
    const BATCH_SIZE = 3;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      if (!runningRef.current) { addLog('⏹ Dihentikan manual', 'skip'); break; }

      const batchIndices = Array.from({ length: Math.min(BATCH_SIZE, total - i) }, (_, k) => i + k);
      
      await Promise.all(batchIndices.map(async (idx) => {
        if (!runningRef.current) return;
        const item = updatedItems[idx];

        // Skip jika sudah enriched dari Livoria export
        if (item.enriched && item.enrichSource === 'Import') {
          addLog(`[${idx+1}/${total}] ⏭ Skip (dari export Livoria): "${item.title}"`, 'ok');
          ok++;
          return;
        }

        addLog(`[${idx+1}/${total}] Mencari "${item.originalTitle || item.title}" S${item.season}…`, 'info');

        try {
          const candidates = await searchWithAccuracy(item.title, item.season);
          const best = candidates[0];
          const bestScore = best?.similarity || 0;
          const confidence = scoreToConfidence(bestScore);

          updatedItems[idx] = { ...item, candidates };

          if (!best || bestScore < 0.15) {
            addLog(`[${idx+1}] ⚠ Tidak cocok: "${item.originalTitle || item.title}"`, 'skip');
            updatedItems[idx] = { ...updatedItems[idx], matchConfidence: 'none', matchScore: 0 };
            skip++;
          } else {
            let finalC = { ...best };
            // Parallel fetch for Jikan/AniList cross-reference
            const crossRefPromises = [];
            if (best.source === 'anilist' && !best._jk) {
              crossRefPromises.push((async () => {
                try {
                  const jk = await fetchWithRetry(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(best.title)}&limit=3`);
                  if (jk?.data?.[0]) finalC._jk = jk.data[0];
                } catch {}
              })());
            } else if (best.source === 'jikan' && !best._al) {
              crossRefPromises.push((async () => {
                try {
                  const r = await fetch('https://graphql.anilist.co', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: ANILIST_GQL, variables: { s: best.title } }),
                  });
                  const d = await r.json();
                  if (d.data?.Page?.media?.[0]) finalC._al = d.data.Page.media[0];
                } catch {}
              })());
            }
            if (crossRefPromises.length > 0) await Promise.all(crossRefPromises);

            addLog(`[${idx+1}] Mengisi data dari MAL/AniList…`, 'info');
            const enriched = await candidateToEnrichment(finalC, item, mediaType, addLog);
            enriched.matchConfidence = confidence;
            enriched.matchScore = bestScore;

            try {
              const alt = await fetchAlternativeTitles({
                malId: enriched.mal_id, anilistId: enriched.anilist_id,
                storedTitle: enriched.title || item.title, mediaType,
              });
              if (alt) enriched.alternative_titles = serializeAlternativeTitles(alt);
            } catch {}

            updatedItems[idx] = {
              ...item,
              ...enriched,
              candidates,
              originalTitle: item.originalTitle || item.title,
              watch_status: item.watch_status || 'none',
              watched_at:   item.watched_at || null,
            };

            const cLabel = confidence === 'high' ? '✓ Akurat' : confidence === 'medium' ? '⚠ Perlu Cek' : '✗ Tidak Yakin';
            const groupInfo = enriched.season && enriched.season > 1
              ? ` | S${enriched.season}${enriched.cour ? ' '+enriched.cour : ''}${enriched.parent_title ? ' → '+enriched.parent_title : ''}`
              : '';
            addLog(`[${idx+1}] ${cLabel} (${Math.round(bestScore*100)}%) "${enriched.title}"${groupInfo} via ${enriched.enrichSource}`,
              confidence === 'high' ? 'ok' : confidence === 'medium' ? 'skip' : 'err');
            ok++;
          }
        } catch(e: any) {
          addLog(`[${idx+1}] ✗ Error [${item.originalTitle || item.title}]: ${e.message}`, 'err');
          err++;
        }
      }));

      setImportProgress({ current: Math.min(i + BATCH_SIZE, total), total, ok, skip, err });
      setParsedItems([...updatedItems]);
      if (i + BATCH_SIZE < total && runningRef.current) await sleep(enrichDelay);
    }

    setRunning(false); runningRef.current = false;
    const needCheck = updatedItems.filter(i => i.matchConfidence === 'medium' || i.matchConfidence === 'low').length;
    addLog(`✅ Selesai — OK:${ok} Skip:${skip} Err:${err}${needCheck > 0 ? ` · ${needCheck} perlu verifikasi` : ''}`, 'ok');
    if (needCheck > 0) {
      toast({ title: `${needCheck} item perlu verifikasi`, description: 'Gunakan tombol filter untuk melihat semua.' });
    }
  };

  // ── Import to DB ───────────────────────────────────────────────────────────

  const startImport = async () => {
    if (!parsedItems.length) return;
    setStep('importing'); setRunning(true); runningRef.current = true;
    const total = parsedItems.length;
    setImportProgress({current:0,total,ok:0,skip:0,err:0}); setLogs([]);

    const userId = await getCurrentImportUserId();
    if (!userId) { toast({ title: 'Login diperlukan', variant: 'destructive' }); setStep('preview'); return; }

    addLog(`🚀 Import ${total} ${mediaType}`, 'info');
    const table: MediaImportTable = mediaType === 'anime' ? 'anime' : 'donghua';
    let ok=0, skip=0, err=0;

    for (let i = 0; i < parsedItems.length; i++) {
      if (!runningRef.current) { addLog('⏹ Import dihentikan', 'skip'); break; }

      const item = parsedItems[i];

      // Resolve parent_title — gunakan parent_title dari item, atau auto-generate dari season
      const resolvedParentTitle = item.parent_title
        || (item.season > 1 ? getParentTitle(item.title, item.season) : '');

      // Gunakan sanitizeImportRow untuk normalisasi final sebelum insert ke DB
      // Ini memastikan SEMUA field sesuai schema dan constraint DB
      const sanitized = sanitizeImportRow({
        ...item,
        parent_title:  resolvedParentTitle,
        notes:         item.note || '',
        // Pastikan watch_status & watched_at benar
        watch_status:  item.watch_status || 'none',
        watched_at:    item.watched_at || null,
      });

      // Build row final untuk DB — exclude field yang tidak ada di DB schema
      // dan tambahkan user_id
      const row: Record<string, unknown> = {
        user_id: userId,
        title:              sanitized.title,
        status:             sanitized.status,
        genre:              sanitized.genre,
        rating:             sanitized.rating,
        episodes:           sanitized.episodes,
        episodes_watched:   sanitized.episodes_watched,
        cover_url:          sanitized.cover_url,
        synopsis:           sanitized.synopsis,
        notes:              sanitized.notes,
        season:             sanitized.season,
        cour:               sanitized.cour,
        streaming_url:      sanitized.streaming_url,
        schedule:           sanitized.schedule,
        parent_title:       sanitized.parent_title,
        is_favorite:        sanitized.is_favorite,
        is_bookmarked:      sanitized.is_bookmarked,
        is_movie:           sanitized.is_movie,
        is_hentai:          item.is_hentai ?? false,
        duration_minutes:   sanitized.duration_minutes,
        release_year:       sanitized.release_year,
        studio:             sanitized.studio,
        mal_url:            sanitized.mal_url,
        anilist_url:        sanitized.anilist_url,
        mal_id:             sanitized.mal_id,
        anilist_id:         sanitized.anilist_id,
        alternative_titles: sanitized.alternative_titles,
        watch_status:       sanitized.watch_status,
        watched_at:         sanitized.watched_at,
      };

      try {
        await insertMediaImportRow(table, row);
        addLog(`[${i + 1}] OK: ${item.title} (S${item.season}${item.cour ? '/' + item.cour : ''})`, 'ok');
        ok++;
      } catch (error: any) {
        if (error?.code === '23505') {
          addLog(`[${i + 1}] Duplikat: ${item.title}`, 'skip');
          skip++;
        } else {
          addLog(`[${i + 1}] Error [${item.title}]: ${error?.message || 'Import gagal'}`, 'err');
          err++;
        }
      }
      setImportProgress({current:i+1,total,ok,skip,err});
    }

    setRunning(false); runningRef.current = false;
    addLog(`✅ Import selesai — OK:${ok} Skip:${skip} Err:${err}`, 'ok');
    toast({ title: 'Import selesai!', description: `${ok} berhasil, ${skip} dilewati, ${err} gagal.` });
    onImportComplete?.();
  };

  // ── Item CRUD ──────────────────────────────────────────────────────────────

  const updateItem = (idx: number, u: Partial<BulkItem>) =>
    setParsedItems(prev => prev.map((it, i) => i === idx ? { ...it, ...u } : it));
  const removeItem = (idx: number) => {
    if (editingTitleIdx === idx) setEditingTitleIdx(null);
    setParsedItems(prev => prev.filter((_,i) => i !== idx));
  };
  const toggleExpand = (idx: number) =>
    setExpandedItems(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  const stopProcess = () => { runningRef.current = false; setRunning(false); };
  const downloadLog = () => {
    const txt = logs.map(e => `[${e.time}] ${e.msg}`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
    a.download = `livoria-bulk-log-${Date.now()}.txt`;
    a.click();
  };

  const enrichedCount   = parsedItems.filter(i => i.enriched).length;
  const uncertainCount  = parsedItems.filter(i => i.matchConfidence === 'medium' || i.matchConfidence === 'low').length;
  const noMatchCount    = parsedItems.filter(i => i.enriched && i.matchConfidence === 'none').length;
  const watchingCount   = parsedItems.filter(i => i.watch_status && i.watch_status !== 'none').length;
  const needsTranslation = parsedItems.filter(i => i.enriched && i.synopsis && !i._synopsisTranslated).length;

  // ── Translate all synopses (post-autofill step) ────────────────────────
  const translateAllSynopses = async () => {
    setStep('translating'); setRunning(true); runningRef.current = true; setLogs([]);
    const total = parsedItems.length;
    setImportProgress({ current: 0, total, ok: 0, skip: 0, err: 0 });
    addLog(`🌐 Menerjemahkan sinopsis ${total} item ke Bahasa Indonesia (paralel batching)…`, 'info');
    const updatedItems = [...parsedItems];
    let ok = 0, skip = 0, err = 0;
    const BATCH_SIZE = 3;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      if (!runningRef.current) { addLog('⏹ Dihentikan', 'skip'); break; }
      
      const batchIndices = Array.from({ length: Math.min(BATCH_SIZE, total - i) }, (_, k) => i + k);
      
      await Promise.all(batchIndices.map(async (idx) => {
        if (!runningRef.current) return;
        const item = updatedItems[idx];
        if (!item.synopsis || item._synopsisTranslated) {
          skip++;
          return;
        }
        addLog(`[${idx + 1}/${total}] Menerjemahkan "${item.title}"…`, 'info');
        try {
          const translated = await translateToIndonesian(item.synopsis);
          updatedItems[idx] = { ...item, synopsis: translated, _synopsisTranslated: true };
          addLog(`[${idx + 1}] ✓ Terjemahan selesai`, 'ok');
          ok++;
        } catch (e: any) {
          addLog(`[${idx + 1}] ✗ Gagal: ${e.message}`, 'err');
          err++;
        }
      }));

      setImportProgress({ current: Math.min(i + BATCH_SIZE, total), total, ok, skip, err });
      setParsedItems([...updatedItems]);
      if (i + BATCH_SIZE < total && runningRef.current) await sleep(1000);
    }

    setRunning(false); runningRef.current = false;
    addLog(`✅ Terjemahan selesai — OK:${ok} Skip:${skip} Err:${err}`, 'ok');
    setParsedItems([...updatedItems]);
    setStep('preview');
  };

  const toggleReviewed = (idx: number) => {
    const updated = [...parsedItems];
    const item = updated[idx];
    const newReviewed = !item.reviewed;
    
    // Jika ditandai reviewed, kita anggap ini sekarang 'high' confidence
    // agar warnanya bisa berubah (tapi tetap ada badge Reviewed)
    updated[idx] = { 
      ...item, 
      reviewed: newReviewed,
      matchConfidence: newReviewed ? 'high' : (item.matchScore && item.matchScore < 0.75 ? 'medium' : 'high')
    };
    setParsedItems(updated);
  };

  // Filter mode untuk item perlu verifikasi
  // Perubahan: Item yang sudah direview (item.reviewed) tetap ditampilkan di filter ini
  // agar user tidak kehilangan item tersebut saat baru saja diedit/diverifikasi.
  const displayedItems = filterNeedVerify
    ? parsedItems
        .map((item, originalIdx) => ({ item, originalIdx }))
        .filter(({ item }) => item.matchConfidence === 'medium' || item.matchConfidence === 'low' || !item.enriched || item.reviewed)
    : parsedItems.map((item, originalIdx) => ({ item, originalIdx }));

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetAll(); onOpenChange(v); }}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-full sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-3 sm:p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Upload className="w-5 h-5 text-primary" />
            Impor {mediaType === 'anime' ? 'Anime' : 'Donghua'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Paste data, upload file (JSON/CSV/Excel), atau tulis prompt → Parse → Edit & Auto-Fill dari MAL/AniList → Import ke database
          </DialogDescription>
        </DialogHeader>

        {/* ══ STEP 1: INPUT ══════════════════════════════════════════════════ */}
        {step === 'input' && (
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Status Default</label>
                <select value={defaultStatus} onChange={e => setDefaultStatus(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20">
                  <option value="completed">Completed</option>
                  <option value="planned">Planned</option>
                  <option value="on-going">On-Going</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Jeda antar Auto-Fill (ms)</label>
                <input type="number" value={enrichDelay} onChange={e => setEnrichDelay(parseInt(e.target.value)||2000)}
                  min={1500} step={500}
                  className="w-full px-2.5 py-2 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/20" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <ClipboardPaste className="w-3 h-3" /> Data
              </label>
              <textarea
                value={rawText} onChange={e => setRawText(e.target.value)}
                placeholder={`Format bebas!\n[\n  {"title":"Overlord","season":4,"rating":9.5,"note":"*"},\n  {"title":"Re Zero","season":2,"rating":8.5,"note":"**"}\n]\n\nAtau CSV:\nOverlord, 4, 9.5, *\nRe Zero, 2, 8.5, **`}
                rows={8}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/20 resize-y min-h-[150px]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input ref={fileInputRef} type="file" accept=".json,.csv,.txt,.tsv,.xlsx,.xls" onChange={handleFileImport} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-input bg-background text-muted-foreground text-xs font-semibold hover:bg-muted transition-all">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Upload File
              </button>
              <span className="text-[10px] text-muted-foreground">JSON, CSV, TXT, Excel (.xlsx)</span>
              {rawText && (
                <span className="text-[10px] text-primary font-semibold ml-auto">
                  ~{rawText.split('\n').filter(l => l.trim()).length} baris
                </span>
              )}
            </div>

            {/* ── Format & Field Documentation Accordion ── */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
              <details className="group">
                <summary className="flex items-center gap-1.5 px-3 py-2.5 cursor-pointer select-none hover:bg-primary/10 transition-colors">
                  <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-[11px] font-bold text-foreground flex-1">Format & Field yang Didukung</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-3 pb-3 space-y-2 border-t border-primary/15">
                  {/* Format section */}
                  <div className="pt-2 space-y-1.5">
                    <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">Format yang Didukung</p>
                    <div className="space-y-1 text-[10px] text-muted-foreground">
                      <p>· <strong className="text-foreground">Hasil Ekspor LIVORIA</strong> — File JSON/CSV dari tombol Ekspor langsung di-restore 100% tanpa perlu AI. Semua field, cover, genre, sinopsis, nama alternatif, status tonton — semuanya dikembalikan persis.</p>
                      <p>· <strong className="text-foreground">JSON Array</strong> — Array of objects: <code className="text-[9px] bg-muted px-1 rounded">[{'{'}title, season, ...{'}'}]</code></p>
                      <p>· <strong className="text-foreground">NDJSON</strong> — Satu JSON object per baris (newline-delimited).</p>
                      <p>· <strong className="text-foreground">CSV/TSV</strong> — Dengan header baris pertama: <code className="text-[9px] bg-muted px-1 rounded">title,season,rating,note,...</code> atau tanpa header: <code className="text-[9px] bg-muted px-1 rounded">judul, season, rating, note</code> (kolom 1–4).</p>
                      <p>· <strong className="text-foreground">Excel (.xlsx)</strong> — Kolom bebas, header auto-detect dari baris pertama.</p>
                      <p>· <strong className="text-foreground">Teks Bebas / Prompt</strong> — AI Groq akan memparse teks bebas menjadi daftar anime/donghua secara otomatis.</p>
                    </div>
                  </div>

                  {/* Field section */}
                  <details className="group/field">
                    <summary className="flex items-center gap-1.5 py-1.5 cursor-pointer select-none text-[10px] font-bold text-foreground uppercase tracking-wider">
                      <ChevronRight className="w-3 h-3 text-muted-foreground transition-transform group-open/field:rotate-90" />
                      Field yang Didukung (detail)
                    </summary>
                    <div className="pl-4 pt-1 space-y-0.5 text-[9px]">
                      <p><code className="bg-muted px-0.5 rounded font-bold text-primary">title</code> <span className="text-destructive font-bold">(wajib)</span> — Judul anime/donghua. Contoh: <code className="bg-muted px-0.5 rounded">"Attack on Titan"</code></p>
                      <p><code className="bg-muted px-0.5 rounded">status</code> — Status rilis: <code className="bg-muted px-0.5 rounded">on-going</code> | <code className="bg-muted px-0.5 rounded">completed</code> | <code className="bg-muted px-0.5 rounded">planned</code>. Default: sesuai pilihan di atas.</p>
                      <p><code className="bg-muted px-0.5 rounded">season</code> — Nomor musim (angka). Default: 1.</p>
                      <p><code className="bg-muted px-0.5 rounded">cour</code> — Part/Cour: misal <code className="bg-muted px-0.5 rounded">"Part 2"</code>.</p>
                      <p><code className="bg-muted px-0.5 rounded">rating</code> — Rating 0–10 (desimal). Contoh: <code className="bg-muted px-0.5 rounded">8.5</code></p>
                      <p><code className="bg-muted px-0.5 rounded">episodes</code> — Total episode (angka).</p>
                      <p><code className="bg-muted px-0.5 rounded">episodes_watched</code> — Jumlah episode yang sudah ditonton.</p>
                      <p><code className="bg-muted px-0.5 rounded">genre</code> — Genre pisah koma: <code className="bg-muted px-0.5 rounded">"Action, Fantasy, Isekai"</code></p>
                      <p><code className="bg-muted px-0.5 rounded">synopsis</code> — Sinopsis/ringkasan cerita.</p>
                      <p><code className="bg-muted px-0.5 rounded">notes</code> — Catatan pribadi. Pola khusus: <code className="bg-muted px-0.5 rounded">*</code>=fav+bookmark, <code className="bg-muted px-0.5 rounded">**</code>=bookmark, <code className="bg-muted px-0.5 rounded">OP</code>=fav.</p>
                      <p><code className="bg-muted px-0.5 rounded">cover_url</code> — URL gambar cover (https://...).</p>
                      <p><code className="bg-muted px-0.5 rounded">is_movie</code> — <code className="bg-muted px-0.5 rounded">true</code>/<code className="bg-muted px-0.5 rounded">false</code>. Tandai sebagai movie/film.</p>
                      <p><code className="bg-muted px-0.5 rounded">is_favorite</code> — <code className="bg-muted px-0.5 rounded">true</code>/<code className="bg-muted px-0.5 rounded">false</code>. Masuk favorit.</p>
                      <p><code className="bg-muted px-0.5 rounded">is_bookmarked</code> — <code className="bg-muted px-0.5 rounded">true</code>/<code className="bg-muted px-0.5 rounded">false</code>. Di-bookmark.</p>
                      <p><code className="bg-muted px-0.5 rounded">is_hentai</code> — <code className="bg-muted px-0.5 rounded">true</code>/<code className="bg-muted px-0.5 rounded">false</code>. Konten 18+/HAnime.</p>
                      <p><code className="bg-muted px-0.5 rounded">parent_title</code> — Judul induk untuk pengelompokan multi-season.</p>
                      <p><code className="bg-muted px-0.5 rounded">studio</code> — Nama studio produksi.</p>
                      <p><code className="bg-muted px-0.5 rounded">release_year</code> — Tahun rilis (angka). Contoh: <code className="bg-muted px-0.5 rounded">2024</code></p>
                      <p><code className="bg-muted px-0.5 rounded">duration_minutes</code> — Durasi film dalam menit (khusus movie).</p>
                      <p><code className="bg-muted px-0.5 rounded">streaming_url</code> — URL streaming/nonton.</p>
                      <p><code className="bg-muted px-0.5 rounded">schedule</code> — Jadwal tayang: <code className="bg-muted px-0.5 rounded">"senin,kamis"</code></p>
                      <p><code className="bg-muted px-0.5 rounded">mal_id</code> — ID MyAnimeList (angka).</p>
                      <p><code className="bg-muted px-0.5 rounded">anilist_id</code> — ID AniList (angka).</p>
                      <p><code className="bg-muted px-0.5 rounded">mal_url</code> — URL halaman MyAnimeList.</p>
                      <p><code className="bg-muted px-0.5 rounded">anilist_url</code> — URL halaman AniList.</p>
                      <p><code className="bg-muted px-0.5 rounded">alternative_titles</code> — JSON string nama alternatif (dari ekspor).</p>
                      <p><code className="bg-muted px-0.5 rounded">watch_status</code> — Status tonton: <code className="bg-muted px-0.5 rounded">none</code> | <code className="bg-muted px-0.5 rounded">want_to_watch</code> | <code className="bg-muted px-0.5 rounded">watching</code> | <code className="bg-muted px-0.5 rounded">watched</code></p>
                      <p><code className="bg-muted px-0.5 rounded">watched_at</code> — Timestamp kapan ditonton (ISO 8601).</p>
                    </div>
                  </details>

                  {/* CSV schema example */}
                  <details className="group/csv">
                    <summary className="flex items-center gap-1.5 py-1.5 cursor-pointer select-none text-[10px] font-bold text-foreground uppercase tracking-wider">
                      <ChevronRight className="w-3 h-3 text-muted-foreground transition-transform group-open/csv:rotate-90" />
                      Contoh Format CSV/TSV
                    </summary>
                    <div className="pl-4 pt-1 text-[9px] text-muted-foreground">
                      <p className="mb-1">Baris pertama <strong className="text-foreground">harus berupa header</strong> agar field dikenali dengan benar:</p>
                      <pre className="bg-muted p-2 rounded-lg text-[8px] font-mono overflow-x-auto whitespace-pre">title,season,rating,status,genre,notes,is_movie,is_favorite{'\n'}Attack on Titan,4,9.5,completed,"Action, Fantasy",*,false,true{'\n'}Suzume,1,8.8,completed,,OP,true,false</pre>
                      <p className="mt-1.5">Tanpa header, kolom dibaca sebagai: judul, season, rating, note.</p>
                    </div>
                  </details>
                </div>
              </details>
            </div>

            <button onClick={processWithAI} disabled={!rawText.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all">
              <Sparkles className="w-4 h-4" />
              Proses & Parse Data
            </button>
          </div>
        )}

        {/* ══ STEP 2: PROCESSING ═════════════════════════════════════════════ */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            {aiProgress.status === 'rotating' ? (
              <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
            ) : aiProgress.status === 'error' ? (
              <AlertTriangle className="w-10 h-10 text-destructive" />
            ) : (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            )}
            {useAI && aiProgress.total > 0 ? (
              <div className="text-center space-y-3 w-full max-w-xs">
                <p className="text-sm font-semibold text-foreground">
                  Chunk {aiProgress.current}/{aiProgress.total}
                </p>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${(aiProgress.current / aiProgress.total) * 100}%` }} />
                </div>
                
                {aiProgress.status === 'rotating' && (
                  <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 text-[10px] font-bold">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Rotasi Provider...
                  </div>
                )}
                {aiProgress.status === 'error' && aiProgress.lastError && (
                  <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/30 text-destructive text-[10px] font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    {aiProgress.lastError}
                  </div>
                )}
                
                <div className="flex flex-col gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Menggunakan AI</p>
                  <div className="flex flex-col gap-1.5">
                    {aiProgress.provider && (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="flex flex-col gap-0.5 flex-1">
                          <p className="text-[10px] text-muted-foreground font-semibold">Provider:</p>
                          <p className="text-xs font-bold text-foreground">{aiProgress.provider}</p>
                        </div>
                      </div>
                    )}
                    {aiProgress.model && (
                      <div className="flex items-center gap-2 pl-6">
                        <div className="flex flex-col gap-0.5 flex-1">
                          <p className="text-[10px] text-muted-foreground font-semibold">Model:</p>
                          <p className="text-xs font-mono text-foreground bg-muted/50 px-2 py-1 rounded">{aiProgress.model}</p>
                        </div>
                      </div>
                    )}
                    {!aiProgress.provider && (
                      <p className="text-xs text-muted-foreground italic">Menghubungkan...</p>
                    )}
                  </div>
                </div>
                
                {aiProgress.itemsSoFar > 0 && (
                  <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <p className="text-xs font-semibold text-emerald-700">{aiProgress.itemsSoFar} item berhasil diparsing</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-medium">
                {useAI ? 'Menghubungkan ke AI...' : 'Mem-parse data…'}
              </p>
            )}
          </div>
        )}

        {/* ══ STEP 3: PREVIEW ════════════════════════════════════════════════ */}
        {step === 'preview' && (
          <div className="space-y-3 mt-2">
            {/* Header bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">
                  {parsedItems.length} item{enrichedCount > 0 && ` · ${enrichedCount} enriched`}
                </p>
                {watchingCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info/10 text-info text-[10px] font-bold border border-info/20">
                    👁 {watchingCount} watch tracked
                  </span>
                )}
                {uncertainCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3" />{uncertainCount} perlu verifikasi
                  </span>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => { setStep('input'); setParsedItems([]); setFilterNeedVerify(false); }}
                  className="px-2.5 py-1.5 rounded-lg border border-input bg-background text-[10px] font-semibold text-muted-foreground hover:bg-muted transition-all">
                  ← Kembali
                </button>
                <button onClick={enrichAllItems}
                  className="px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold hover:bg-primary/20 transition-all flex items-center gap-1">
                  <Search className="w-3 h-3" /> Auto-Fill Semua
                </button>
                {enrichedCount > 0 && needsTranslation > 0 && (
                  <button onClick={translateAllSynopses}
                    className="px-2.5 py-1.5 rounded-lg bg-info/10 border border-info/30 text-info text-[10px] font-bold hover:bg-info/20 transition-all flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Terjemahkan Sinopsis ({needsTranslation})
                  </button>
                )}
                <button onClick={startImport}
                  className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 transition-all flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Import {parsedItems.length}
                </button>
              </div>
            </div>

            {/* Legend */}
            {enrichedCount > 0 && (
              <div className="flex items-center gap-3 flex-wrap p-2 rounded-xl bg-muted/30 border border-border/50 text-[9px]">
                <span className="font-bold text-muted-foreground uppercase tracking-wider">Keterangan:</span>
                <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="w-2.5 h-2.5" />Akurat ≥75%</span>
                <span className="flex items-center gap-1 text-amber-500"><AlertTriangle className="w-2.5 h-2.5" />Perlu Cek 45–74%</span>
                <span className="flex items-center gap-1 text-red-500"><HelpCircle className="w-2.5 h-2.5" />Tidak Yakin &lt;45%</span>
                <span className="flex items-center gap-1 text-info ml-auto">👁 watch_status dari DB</span>
              </div>
            )}

            {/* Filter bar */}
            {enrichedCount > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border">
                <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground flex-1">Filter tampilan:</span>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setFilterNeedVerify(false)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      !filterNeedVerify
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    Semua ({parsedItems.length})
                  </button>
                  <button
                    onClick={() => setFilterNeedVerify(true)}
                    disabled={uncertainCount === 0}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      filterNeedVerify
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Perlu Verifikasi ({uncertainCount})
                  </button>
                </div>
                {filterNeedVerify && uncertainCount > 0 && (
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium ml-1">
                    Menampilkan {uncertainCount} dari {parsedItems.length} item
                  </span>
                )}
              </div>
            )}

            {/* Empty state saat filter aktif tapi tidak ada yang perlu diverifikasi */}
            {filterNeedVerify && uncertainCount === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-xl border border-border bg-muted/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <p className="text-sm font-semibold text-foreground">Semua item sudah terverifikasi!</p>
                <p className="text-xs text-muted-foreground">Tidak ada item yang perlu perhatian lebih.</p>
                <button onClick={() => setFilterNeedVerify(false)}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                  Lihat Semua Item
                </button>
              </div>
            )}

            {/* Item list */}
            <div className="max-h-[52vh] overflow-y-auto space-y-1.5 pr-0.5">
              {displayedItems.map(({ item, originalIdx: idx }) => (
                <div
                  key={idx}
                  className={`rounded-xl border transition-colors ${
                    item.reviewed 
                      ? 'bg-blue-500/5 border-blue-500/20' 
                      : item.matchConfidence === 'high'   ? 'bg-emerald-500/5 border-emerald-500/30' :
                        item.matchConfidence === 'medium' ? 'bg-amber-500/5 border-amber-500/35' :
                        item.matchConfidence === 'low'    ? 'bg-red-500/5 border-red-500/35' :
                        'bg-card border-border'
                  } p-2 sm:p-2.5`}
                >
                  <div className="flex items-start gap-2">
                    {item.cover_url ? (
                      <img src={item.cover_url} alt="" className="w-8 h-11 sm:w-10 sm:h-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-11 sm:w-10 sm:h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Image className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1">
                        <span className="text-[9px] font-bold text-muted-foreground shrink-0 mt-0.5">{idx+1}.</span>
                        <div className="min-w-0 flex-1">
                          {editingTitleIdx === idx ? (
                            <InlineTitleEditor
                              item={item}
                              onTitleChange={title => updateItem(idx, { title })}
                              onApply={c => applyCandidate(idx, c)}
                              onClose={() => setEditingTitleIdx(null)}
                            />
                          ) : (
                            <>
                              <p className="text-xs font-semibold leading-snug break-words whitespace-normal">
                                {item.title}
                              </p>
                              {item.enriched && item.originalTitle && item.originalTitle !== item.title && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[8px] text-muted-foreground/60 font-medium shrink-0">dari:</span>
                                  <span className="text-[9px] text-muted-foreground/70 italic break-words whitespace-normal">
                                    "{item.originalTitle}"
                                  </span>
                                </div>
                              )}
                            </>
                          )}

                          {editingTitleIdx !== idx && (
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              <span className="text-[9px] text-muted-foreground">S{item.season}</span>
                              {item.cour && <span className="text-[9px] text-muted-foreground">· {item.cour}</span>}
                              {item.rating > 0 && <span className="text-[9px] text-amber-500">★{item.rating}</span>}
                              {item.is_favorite  && <span className="text-[9px]" title="Favorite">❤️</span>}
                              {item.is_bookmarked && <span className="text-[9px]" title="Bookmark">🔖</span>}
                              {item.is_movie && (
                                <span className="text-[8px] px-1 py-0.5 rounded bg-accent text-accent-foreground font-bold">🎬</span>
                              )}
                              {/* Watch status badge */}
                              {item.watch_status && item.watch_status !== 'none' && (
                                <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${
                                  item.watch_status === 'watched'      ? 'bg-success/15 text-success' :
                                  item.watch_status === 'watching'     ? 'bg-info/15 text-info' :
                                  item.watch_status === 'want_to_watch'? 'bg-primary/15 text-primary' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {item.watch_status === 'watched'       ? '✓ Ditonton' :
                                   item.watch_status === 'watching'      ? '▶ Sedang' :
                                   item.watch_status === 'want_to_watch' ? '♡ Mau' : item.watch_status}
                                </span>
                              )}
                              {item.enriched && (
                                <span className="text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary font-bold">{item.enrichSource}</span>
                              )}
                              {item.matchConfidence && (
                                <ConfidenceBadge 
                                  confidence={item.matchConfidence} 
                                  score={item.matchScore} 
                                  reviewed={item.reviewed} 
                                />
                              )}
                              {item.parent_title && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50 break-words max-w-[150px]" title={`Grup: ${item.parent_title}`}>
                                  📁 {item.parent_title}
                                </span>
                              )}
                              {item.synopsis && item.enriched && (
                                <span className="text-[8px] px-1 py-0.5 rounded bg-success/10 text-success font-bold">📝 ID</span>
                              )}
                              {item.alternative_titles && (
                                <span className="text-[8px] px-1 py-0.5 rounded bg-violet-500/10 text-violet-500 font-bold flex items-center gap-0.5">
                                  <Globe className="w-2 h-2" />Alt
                                </span>
                              )}
                              {item.genre && (
                                <span className="text-[8px] text-muted-foreground break-words max-w-[160px]">{item.genre.split(',').slice(0,2).join(', ')}{item.genre.split(',').length > 2 ? '…' : ''}</span>
                              )}
                            </div>
                          )}

                          {editingTitleIdx !== idx && item.alternative_titles && item.enriched && (
                            <AltTitlesInline altJson={item.alternative_titles} mediaType={mediaType} />
                          )}
                        </div>
                      </div>
                    </div>

                    {editingTitleIdx !== idx && (
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => reEnrichItem(idx)} disabled={pickerLoading === idx}
                          title="Cari ulang otomatis"
                          className="p-1 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-foreground disabled:opacity-40">
                          {pickerLoading === idx
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <RefreshCw className="w-3 h-3" />
                          }
                        </button>
                        <button
                          onClick={() => setEditingTitleIdx(editingTitleIdx === idx ? null : idx)}
                          title="Edit judul & cari MAL/AniList"
                          className={`p-1 rounded-lg hover:bg-muted transition-all ${
                            item.matchConfidence === 'medium' ? 'text-amber-500' :
                            item.matchConfidence === 'low'    ? 'text-red-500' :
                            'text-muted-foreground'
                          } hover:text-foreground`}>
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => toggleExpand(idx)}
                          className="p-1 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-foreground">
                          {expandedItems.has(idx) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => toggleReviewed(idx)}
                          title={item.reviewed ? "Batal review" : "Tandai sudah direview"}
                          className={`p-1 rounded-lg transition-all ${
                            item.reviewed ? 'bg-blue-500/20 text-blue-500' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}>
                          <CheckCircle2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeItem(idx)}
                          className="p-1 rounded-lg hover:bg-destructive/10 transition-all text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Warning banner untuk item medium/low */}
                  {item.enriched && (item.matchConfidence === 'medium' || item.matchConfidence === 'low') && editingTitleIdx !== idx && (
                    <div className={`mt-2 flex items-start gap-1.5 p-2 rounded-lg text-[9px] leading-relaxed ${
                      item.matchConfidence === 'medium'
                        ? 'bg-amber-500/8 border border-amber-500/20 text-amber-700 dark:text-amber-300'
                        : 'bg-red-500/8 border border-red-500/20 text-red-700 dark:text-red-300'
                    }`}>
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>
                        {item.matchConfidence === 'low'
                          ? `Pencocokan tidak yakin (${Math.round((item.matchScore||0)*100)}%). `
                          : `Perlu verifikasi (${Math.round((item.matchScore||0)*100)}%). `
                        }
                        Klik <Edit2 className="inline w-2.5 h-2.5" /> untuk edit judul dan pilih hasil yang tepat.
                        {item.originalTitle && item.originalTitle !== item.title && (
                          <span className="block mt-0.5 opacity-70">Input asli: "{item.originalTitle}"</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* ══ EXPANDED SECTION ════════════════════════════════════ */}
                  {expandedItems.has(idx) && (
                    <div className="mt-2 pt-2 border-t border-border space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {[
                          { label:'Season', type:'number', val: item.season, key:'season', min:1 },
                          { label:'Rating', type:'number', val: item.rating, key:'rating', step:0.1, min:0, max:10 },
                        ].map(f => (
                          <div key={f.key}>
                            <label className="text-[8px] font-bold text-muted-foreground uppercase">{f.label}</label>
                            <input type={f.type} value={f.val}
                              onChange={e => updateItem(idx, { [f.key]: parseFloat(e.target.value)||0 } as any)}
                              className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]"
                              {...(f.step ? { step: f.step } : {})}
                              {...(f.min !== undefined ? { min: f.min } : {})}
                              {...(f.max !== undefined ? { max: f.max } : {})}
                            />
                          </div>
                        ))}
                        <div>
                          <label className="text-[8px] font-bold text-muted-foreground uppercase">Cour/Part</label>
                          <input value={item.cour||''} onChange={e => updateItem(idx, { cour: e.target.value })}
                            placeholder="misal: Part 2"
                            className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]" />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-muted-foreground uppercase">Status</label>
                          <select value={item.status} onChange={e => updateItem(idx, { status: e.target.value as any })}
                            className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]">
                            <option value="completed">Completed</option>
                            <option value="planned">Planned</option>
                            <option value="on-going">On-Going</option>
                          </select>
                        </div>
                        {/* Watch Status */}
                        <div>
                          <label className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            👁 Watch Status
                          </label>
                          <select
                            value={item.watch_status || 'none'}
                            onChange={e => updateItem(idx, { watch_status: e.target.value as any })}
                            className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]">
                            <option value="none">None</option>
                            <option value="want_to_watch">Mau Nonton</option>
                            <option value="watching">Sedang Nonton</option>
                            <option value="watched">Sudah Ditonton</option>
                          </select>
                        </div>
                        <div className="col-span-2 sm:col-span-3">
                          <label className="text-[8px] font-bold text-muted-foreground uppercase">Genre</label>
                          <input value={item.genre||''} onChange={e => updateItem(idx, { genre: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]" />
                        </div>

                        <div className="col-span-2 sm:col-span-3">
                          <label className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            📝 Catatan / Note
                            <span className="text-[7px] font-normal opacity-60">(* = fav+bm, ** = bm, OP = fav only)</span>
                          </label>
                          <textarea
                            value={item.note}
                            onChange={e => {
                              const { is_favorite, is_bookmarked } = interpretNote(e.target.value);
                              updateItem(idx, { note: e.target.value, is_favorite, is_bookmarked });
                            }}
                            rows={3}
                            placeholder="Tulis catatan bebas..."
                            className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-[10px] resize-y min-h-[60px]"
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-3">
                          <ParentTitleField
                            value={item.parent_title || ''}
                            onChange={v => updateItem(idx, { parent_title: v })}
                            allItems={parsedItems}
                            currentIndex={idx}
                          />
                        </div>

                        <div className="flex items-end gap-3">
                          {([
                            { key:'is_favorite', label:'❤️ Fav' },
                            { key:'is_bookmarked', label:'🔖 BM' },
                            { key:'is_movie', label:'🎬 Movie' },
                          ] as const).map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-1 text-[8px] font-bold text-muted-foreground cursor-pointer">
                              <input type="checkbox" checked={!!item[key]}
                                onChange={e => updateItem(idx, { [key]: e.target.checked } as any)}
                                className="rounded" />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Rich fields section */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        <div className="col-span-2 sm:col-span-3">
                          <label className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <BookOpen className="w-2.5 h-2.5" /> Sinopsis
                            {item.enriched && <span className="ml-1 px-1 py-0.5 rounded bg-success/15 text-success text-[7px] font-bold">Bahasa Indonesia</span>}
                          </label>
                          <textarea value={item.synopsis||''} onChange={e => updateItem(idx, { synopsis: e.target.value })}
                            rows={3} className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px] resize-y" />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5" /> Studio
                          </label>
                          <input value={item.studio||''} onChange={e => updateItem(idx, { studio: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]" />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <CalendarClock className="w-2.5 h-2.5" /> Tahun
                          </label>
                          <input type="number" value={item.release_year||''}
                            onChange={e => updateItem(idx, { release_year: parseInt(e.target.value)||null })}
                            className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]" />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-muted-foreground uppercase">Episodes</label>
                          <input type="number" value={item.episodes||0}
                            onChange={e => updateItem(idx, { episodes: parseInt(e.target.value)||0 })}
                            className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]" />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-muted-foreground uppercase">Ep Ditonton</label>
                          <input type="number" value={item.episodes_watched||0}
                            onChange={e => updateItem(idx, { episodes_watched: parseInt(e.target.value)||0 })}
                            className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]" />
                        </div>
                        {item.is_movie && (
                          <div>
                            <label className="text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                              <Film className="w-2.5 h-2.5" /> Durasi (menit)
                            </label>
                            <input type="number" value={item.duration_minutes||''}
                              onChange={e => updateItem(idx, { duration_minutes: parseInt(e.target.value)||null })}
                              className="w-full px-2 py-1 rounded-lg border border-input bg-background text-[10px]" />
                          </div>
                        )}
                        <div className="col-span-2 sm:col-span-3 flex gap-2 flex-wrap">
                          {item.mal_id && <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-mono">MAL#{item.mal_id}</span>}
                          {item.anilist_id && <span className="text-[8px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 font-mono">AL#{item.anilist_id}</span>}
                          {item.alternative_titles && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold flex items-center gap-0.5">
                              <Globe className="w-2.5 h-2.5" /> Alt Titles ✓
                            </span>
                          )}
                          {item.watch_status && item.watch_status !== 'none' && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-success/10 text-success font-bold">
                              👁 {item.watch_status}
                            </span>
                          )}
                          {item.mal_url && (
                            <a href={item.mal_url} target="_blank" rel="noopener noreferrer"
                              className="text-[8px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5 hover:text-foreground">
                              <Link2 className="w-2.5 h-2.5" /> MAL
                            </a>
                          )}
                          {item.anilist_url && (
                            <a href={item.anilist_url} target="_blank" rel="noopener noreferrer"
                              className="text-[8px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5 hover:text-foreground">
                              <Link2 className="w-2.5 h-2.5" /> AniList
                            </a>
                          )}
                        </div>

                        {item.alternative_titles && (
                          <div className="col-span-2 sm:col-span-3">
                            <AltTitlesInline altJson={item.alternative_titles} mediaType={mediaType} />
                          </div>
                        )}

                        {/* Judul asli di expanded view */}
                        {item.originalTitle && item.originalTitle !== item.title && (
                          <div className="col-span-2 sm:col-span-3 p-2 rounded-lg bg-muted/40 border border-border/50">
                            <p className="text-[8px] font-bold text-muted-foreground uppercase mb-0.5">Judul Input Asli</p>
                            <p className="text-[10px] text-foreground font-medium">"{item.originalTitle}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Tampilkan info saat filter aktif dan ada item */}
              {filterNeedVerify && displayedItems.length > 0 && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <button
                    onClick={() => setFilterNeedVerify(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-semibold hover:bg-accent transition-all"
                  >
                    <Eye className="w-3 h-3" />
                    Tampilkan semua {parsedItems.length} item
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ STEP 4 & 5: ENRICHING / IMPORTING ═════════════════════════════ */}
        {(step === 'enriching' || step === 'importing' || step === 'translating') && (
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label:'Total',    val: importProgress.total,   cls: 'border-border' },
                { label:'Berhasil', val: importProgress.ok,      cls: 'border-emerald-500/30 text-emerald-500' },
                { label:'Dilewati', val: importProgress.skip,    cls: 'border-amber-500/30  text-amber-500' },
                { label:'Error',    val: importProgress.err,     cls: 'border-destructive/30 text-destructive' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border bg-card p-2 text-center ${s.cls}`}>
                  <div className={`text-lg sm:text-xl font-black ${s.cls.includes('text') ? s.cls.split(' ').find(c => c.startsWith('text')) : ''}`}>
                    {s.val}
                  </div>
                  <div className="text-[9px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            <div>
              <Progress value={importProgress.total > 0 ? (importProgress.current/importProgress.total)*100 : 0} className="h-2" />
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>{step === 'enriching' ? 'Auto-fill' : step === 'translating' ? 'Terjemahan' : 'Import'}: {importProgress.current}/{importProgress.total}</span>
                <span>{importProgress.total > 0 ? Math.round((importProgress.current/importProgress.total)*100) : 0}%</span>
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {running ? (
                <button onClick={stopProcess}
                  className="px-3 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold flex items-center gap-1.5">
                  <Square className="w-3 h-3" /> Stop
                </button>
              ) : (
                <>
                  {(step === 'enriching' || step === 'translating') && (
                    <button onClick={() => setStep('preview')}
                      className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5">
                      <Check className="w-3 h-3" /> Lanjut ke Preview
                    </button>
                  )}
                  {step === 'importing' && !running && importProgress.current === importProgress.total && (
                    <button onClick={() => { resetAll(); onOpenChange(false); }}
                      className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5">
                      <Check className="w-3 h-3" /> Selesai
                    </button>
                  )}
                </>
              )}
              <button onClick={resetAll}
                className="px-3 py-2 rounded-xl border border-input bg-background text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
              {logs.length > 0 && (
                <button onClick={downloadLog}
                  className="px-3 py-2 rounded-xl border border-input bg-background text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Download className="w-3 h-3" /> Log
                </button>
              )}
            </div>

            <div ref={logBoxRef}
              className="rounded-xl border border-border bg-background h-[200px] sm:h-[250px] overflow-y-auto p-2 font-mono text-[10px] space-y-0.5">
              {logs.map((entry, i) => (
                <div key={i} className="flex gap-1.5 py-0.5 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground shrink-0 w-12">{entry.time}</span>
                  <span className={
                    entry.type === 'ok'   ? 'text-emerald-600 dark:text-emerald-400' :
                    entry.type === 'err'  ? 'text-destructive' :
                    entry.type === 'skip' ? 'text-amber-600 dark:text-amber-400' :
                    'text-muted-foreground'
                  }>{entry.msg}</span>
                </div>
              ))}
              {logs.length === 0 && <span className="text-muted-foreground">Menunggu…</span>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportDialog;
